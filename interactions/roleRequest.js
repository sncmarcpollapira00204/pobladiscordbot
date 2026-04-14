const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const config = require("../config.json");
const gangs = require("../gangRoles");
const jobs = require("../jobRoles");

const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

/* SAFE EXEC */
async function safeExecute(interaction, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("ERROR:", err);

    const msg = "❌ Something went wrong. Please contact admin.";

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(msg).catch(() => {});
    } else {
      interaction.reply({ content: msg, flags: 64 }).catch(() => {});
    }
  }
}

/* HELPER */
function hasRole(member, roleIds) {
  return roleIds.some(id => member.roles.cache.has(id));
}

module.exports = async (interaction) => {

  /* =========================
     SELECT MENU (GANG + JOB)
  ========================= */
  if (interaction.isStringSelectMenu()) {

    const isGang = interaction.customId === "gang_select";
    const isJob = interaction.customId === "job_select";

    if (!isGang && !isJob) return;

    const selected = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`${isGang ? "gang" : "job"}_request:${selected}`)
      .setTitle(`${isGang ? "Gang" : "Job"} Role Request`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ingame_name")
          .setLabel("IN-GAME NAME")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* =========================
     MODAL SUBMIT
  ========================= */
  if (interaction.isModalSubmit()) {

    const isGang = interaction.customId.startsWith("gang_request:");
    const isJob = interaction.customId.startsWith("job_request:");

    if (!isGang && !isJob) return;

    return safeExecute(interaction, async () => {

      await interaction.deferReply({ flags: 64 });

      const member = interaction.member;

      // COOLDOWN
      if (cooldown.has(member.id) && cooldown.get(member.id) > Date.now()) {
        return interaction.editReply("❌ You are still on cooldown.");
      }

      // ROLE CONFLICT
      if (isGang && hasRole(member, config.jobRoleIds)) {
        return interaction.editReply("❌ You must remove your job role before requesting a gang.");
      }

      if (isJob && hasRole(member, config.gangRoleIds)) {
        return interaction.editReply("❌ You must leave your gang before requesting a job.");
      }

      if (hasRole(member, config.gangRoleIds) || hasRole(member, config.jobRoleIds)) {
        return interaction.editReply("❌ You already have a role.");
      }

      const key = interaction.customId.split(":")[1];
      const data = isGang ? gangs[key] : jobs[key];

      if (!data) {
        return interaction.editReply("❌ Invalid selection.");
      }

      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      const embed = new EmbedBuilder()
        .setColor(isGang ? 0xff8c00 : 0x0099ff)
        .setTitle(isGang ? "📄 GANG ROLE REQUEST" : "🏢 WHITELIST JOB REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "ROLE REQUEST", value: `<@&${data.roleId}>` },
          {
            name: isGang ? "PATRON/A APPROVAL" : "DIRECTOR APPROVAL",
            value: "❌ NOT APPROVED"
          },
          {
            name: "STATUS",
            value: isGang
              ? "🟡 WAITING FOR PATRON APPROVAL"
              : "🔵 WAITING FOR DIRECTOR APPROVAL"
          }
        )
        .setFooter({ text: `${data.name} | ${data.roleId}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("verify").setLabel("VERIFY").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("approve").setLabel("APPROVE").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("deny").setLabel("DENY").setStyle(ButtonStyle.Danger)
      );

      const channel = await interaction.client.channels
        .fetch(isGang ? config.gangRequestChannelId : config.jobRequestChannelId)
        .catch(() => null);

      if (!channel) {
        return interaction.editReply("❌ Request channel not found.");
      }

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.editReply("✅ Request submitted.");
    });
  }

  /* =========================
     BUTTON HANDLER (MERGED)
  ========================= */
  if (!interaction.isButton()) return;

  return safeExecute(interaction, async () => {

    const embed = interaction.message.embeds[0];
    if (!embed) return;

    const footer = embed.footer?.text;
    if (!footer) return;

    const roleId = footer.split("|")[1]?.trim();
    const isGang = Object.values(gangs).some(g => g.roleId === roleId);
    const isJob = Object.values(jobs).some(j => j.roleId === roleId);

    const member = interaction.member;

    /* APPROVE */
    if (interaction.customId === "approve") {

      const isAdmin = hasRole(member, config.adminRoleIds);

      if (!isAdmin) {
        return interaction.reply({ content: "❌ No permission.", flags: 64 });
      }

      const userId = embed.fields[0].value.replace(/[<@!>]/g, "");
      const target = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!target) {
        return interaction.reply({ content: "❌ User not found.", flags: 64 });
      }

      if (isGang) {
        for (const r of config.gangRoleIds) {
          if (target.roles.cache.has(r)) await target.roles.remove(r).catch(() => {});
        }
      }

      if (isJob) {
        for (const r of config.jobRoleIds) {
          if (target.roles.cache.has(r)) await target.roles.remove(r).catch(() => {});
        }
      }

      await target.roles.add(roleId).catch(() => {
        throw new Error("Role assign failed");
      });

      const newEmbed = EmbedBuilder.from(embed)
        .addFields({
          name: "ADMIN APPROVAL",
          value: `✅ APPROVED BY: ${interaction.user}`
        });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Approved.", flags: 64 });
    }

    /* DENY */
    if (interaction.customId === "deny") {

      const isAdmin = hasRole(member, config.adminRoleIds);

      if (!isAdmin) {
        return interaction.reply({ content: "❌ No permission.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .addFields({
          name: "STATUS",
          value: `❌ DENIED BY: ${interaction.user}`
        });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "❌ Denied.", flags: 64 });
    }

  });
};