const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const config = require("../config.json");
const gangs = require("../gangRoles");
const jobs = require("../jobRoles");

/* =========================
   SYSTEM CONFIG
========================= */
const systems = {
  gang: {
    roles: gangs,
    roleIds: config.gangRoleIds,
    blockIds: config.jobRoleIds,
    requestChannel: config.gangRequestChannelId,
    approvalField: "PATRON/A APPROVAL",
    waitingText: "🟡 WAITING FOR PATRON APPROVAL",
    verifyCheck: (member) =>
      config.patronRoleIds.some(id => member.roles.cache.has(id))
  },
  job: {
    roles: jobs,
    roleIds: config.jobRoleIds,
    blockIds: config.gangRoleIds,
    requestChannel: config.jobRequestChannelId,
    approvalField: "DIRECTOR APPROVAL",
    waitingText: "🔵 WAITING FOR DIRECTOR APPROVAL",
    verifyCheck: (member, roleId) => {
      const job = Object.values(jobs).find(j => j.roleId === roleId);
      return job && member.roles.cache.has(job.directorRoleId);
    }
  }
};

/* =========================
   COOLDOWN
========================= */
const cooldown = new Map();

/* =========================
   MAIN
========================= */
module.exports = async (interaction) => {

  /* SELECT → MODAL */
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "gang_select" || interaction.customId === "job_select") {

      const selected = interaction.values[0];
      const type = interaction.customId.startsWith("gang") ? "gang" : "job";

      const modal = new ModalBuilder()
        .setCustomId(`${type}_request:${selected}`)
        .setTitle("Role Request");

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
  }

  /* REQUEST */
  if (interaction.isModalSubmit() && interaction.customId.includes("_request:")) {

    await interaction.deferReply({ flags: 64 });

    const [typeRaw, key] = interaction.customId.split(":");
    const type = typeRaw.split("_")[0];
    const system = systems[type];

    const member = interaction.member;

    if (member.roles.cache.some(r => system.roleIds.includes(r.id))) {
      return interaction.editReply(`❌ You already have a ${type} role.`);
    }

    if (member.roles.cache.some(r => system.blockIds.includes(r.id))) {
      return interaction.editReply(`❌ Remove your ${type === "gang" ? "job" : "gang"} role first.`);
    }

    const data = system.roles[key];
    if (!data) return interaction.editReply("❌ Invalid selection.");

    const ingameName = interaction.fields.getTextInputValue("ingame_name");

    const embed = new EmbedBuilder()
      .setColor(type === "gang" ? 0xff8c00 : 0x0099ff)
      .setTitle(type === "gang" ? "📄 GANG ROLE REQUEST" : "🏢 WHITELIST JOB REQUEST")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "ROLE REQUEST", value: `<@&${data.roleId}>` },
        { name: system.approvalField, value: "❌ NOT APPROVED" },
        { name: "STATUS", value: system.waitingText }
      )
      .setFooter({ text: `${data.name} | ${data.roleId}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`verify:${type}`).setLabel("VERIFY").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`approve:${type}`).setLabel("APPROVE").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`deny:${type}`).setLabel("DENY").setStyle(ButtonStyle.Danger)
    );

    const channel = await interaction.client.channels.fetch(system.requestChannel).catch(() => null);
    if (!channel) return interaction.editReply("❌ Request channel not found.");

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply("✅ Request submitted.");
  }

  /* BUTTONS */
  if (!interaction.isButton()) return;

  const embed = interaction.message.embeds[0];
  if (!embed) return;

  const [action, type] = interaction.customId.split(":");
  const system = systems[type];

  const roleId = embed.footer.text.split("|")[1].trim();

  /* VERIFY */
  if (action === "verify") {

    const allowed = type === "gang"
      ? system.verifyCheck(interaction.member)
      : system.verifyCheck(interaction.member, roleId);

    if (!allowed) {
      return interaction.reply({ content: "❌ No permission.", flags: 64 });
    }

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(3, 1, {
        name: system.approvalField,
        value: `✅ VERIFIED BY: ${interaction.user}`
      })
      .spliceFields(4, 1, {
        name: "STATUS",
        value: "🔵 READY FOR ADMIN APPROVAL"
      });

    await interaction.message.edit({ embeds: [newEmbed] });

    return interaction.reply({ content: "✅ Verified.", flags: 64 });
  }

  /* APPROVE */
  if (action === "approve") {

    const isAdmin = config.adminRoleIds.some(id =>
      interaction.member.roles.cache.has(id)
    );

    if (!isAdmin) {
      return interaction.reply({ content: "❌ No permission.", flags: 64 });
    }

    const userId = embed.fields[0].value.replace(/[<@!>]/g, "");
    const member = await interaction.guild.members.fetch(userId);

    for (const r of system.roleIds) {
      if (member.roles.cache.has(r)) {
        await member.roles.remove(r).catch(() => {});
      }
    }

    await member.roles.add(roleId);

    const data = Object.values(system.roles).find(r => r.roleId === roleId);

    let name = member.nickname || member.user.username;
    name = name.includes("|") ? name.split("|")[1].trim() : name;

    await member.setNickname(`${data.prefix} | ${name}`).catch(() => {});

    const newEmbed = EmbedBuilder.from(embed)
      .spliceFields(4, 1, {
        name: "ADMIN APPROVAL",
        value: `✅ APPROVED BY: ${interaction.user}`
      });

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "✅ Approved.", flags: 64 });
  }

  /* DENY */
  if (action === "deny") {

    const isAdmin = config.adminRoleIds.some(id =>
      interaction.member.roles.cache.has(id)
    );

    if (!isAdmin) {
      return interaction.reply({ content: "❌ No permission.", flags: 64 });
    }

    const userId = embed.fields[0].value.replace(/[<@!>]/g, "");

    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.setFields(
      { name: "DISCORD USER", value: `<@${userId}>` },
      { name: "STATUS", value: `❌ DENIED BY: ${interaction.user}` }
    );

    await interaction.message.edit({ embeds: [newEmbed], components: [] });

    return interaction.reply({ content: "❌ Denied.", flags: 64 });
  }
};