const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const gangs = require("../gangRoles");
const config = require("../config.json");

const cooldown = new Map();
const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

// 🔥 SAFE EXECUTION WRAPPER
async function safeExecute(interaction, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("❌ ERROR:", err);

    const msg = "❌ Something went wrong. Please contact admin.";

    if (interaction.deferred || interaction.replied) {
      interaction.editReply(msg).catch(() => {});
    } else {
      interaction.reply({ content: msg, flags: 64 }).catch(() => {});
    }
  }
}

module.exports = async (interaction) => {

  /* =========================
   UNROLE MODAL SUBMIT
========================= */
if (interaction.isModalSubmit() && interaction.customId === "unrole_modal") {
  return safeExecute(interaction, async () => {

    await interaction.deferReply({ flags: 64 });

    const agree = interaction.fields.getTextInputValue("agree");
    const ingameName = interaction.fields.getTextInputValue("ingame_name");

    if (agree.toLowerCase() !== "yes") {
      return interaction.editReply("❌ You must type YES.");
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("📤 UNROLE REQUEST")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "COOLDOWN AGREEMENT", value: agree },
        { name: "STATUS", value: "🟡 PENDING REVIEW" }
      )
      .setFooter({ text: `UNROLE|${interaction.user.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("unrole_approve").setLabel("Approve").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("unrole_deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    const channel = await interaction.client.channels.fetch(config.gangRequestChannelId)
      .catch(() => null);

    if (!channel) {
      return interaction.editReply("❌ Request channel not found.");
    }

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply("✅ Unrole request submitted.");
  });
}

  /* =========================
     UNROLE BUTTON
  ========================= */
  if (interaction.isButton() && interaction.customId === "gang_leave") {
    return safeExecute(interaction, async () => {

      const modal = new ModalBuilder()
        .setCustomId("unrole_modal")
        .setTitle("Unrole Request");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("ingame_name")
            .setLabel("IN-GAME NAME")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("agree")
            .setLabel("Do you agree to 3 days cooldown?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    });
  }

  /* =========================
     GANG REQUEST
  ========================= */
  if (interaction.isModalSubmit() && interaction.customId.startsWith("gang_request:")) {
    return safeExecute(interaction, async () => {

      await interaction.deferReply({ flags: 64 });

      const member = interaction.member;

      // cooldown
      if (cooldown.has(member.id)) {
        if (cooldown.get(member.id) > Date.now()) {
          return interaction.editReply("❌ You are still on cooldown.");
        } else {
          cooldown.delete(member.id);
        }
      }

      // already in gang
      if (member.roles.cache.some(r => config.gangRoleIds.includes(r.id))) {
        return interaction.editReply("❌ You already have a gang role.");
      }

      const gangKey = interaction.customId.split(":")[1];
      const gang = gangs[gangKey];

      if (!gang) {
        return interaction.editReply("❌ Invalid gang selected.");
      }

      const ingameName = interaction.fields.getTextInputValue("ingame_name");

      const embed = new EmbedBuilder()
        .setColor(0xff8c00)
        .setTitle("📄 GANG ROLE REQUEST")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
          { name: "IN-GAME NAME", value: ingameName },
          { name: "ROLE REQUEST", value: gang.name },
          { name: "VERIFICATION", value: "❌ NOT VERIFIED" },
          { name: "STATUS", value: "🟡 WAITING FOR VERIFICATION" }
        )
        .setFooter({ text: `GANG|${interaction.user.id}|${gangKey}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("gang_verify").setLabel("Verify").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("gang_approve").setLabel("Approve").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("gang_deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
      );

      const channel = await interaction.client.channels.fetch(config.gangRequestChannelId)
        .catch(() => null);

      if (!channel) {
        return interaction.editReply("❌ Request channel not found. Contact admin.");
      }

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.editReply("✅ Request submitted.");
    });
  }

  /* =========================
     BUTTON HANDLER
  ========================= */
  if (!interaction.isButton()) return;

  return safeExecute(interaction, async () => {

    const embed = interaction.message.embeds[0];
    if (!embed) return;

    const footer = embed.footer?.text;
    if (!footer) return;

    const parts = footer.split("|");

    /* =========================
       VERIFY
    ========================= */
    if (interaction.customId === "gang_verify") {

      if (!interaction.member.roles.cache.some(r => config.patronRoleIds.includes(r.id))) {
        return interaction.reply({ content: "❌ You don't have permission to verify.", flags: 64 });
      }

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(3, 1, { name: "VERIFICATION", value: "✅ VERIFIED" })
        .spliceFields(4, 1, { name: "STATUS", value: "🟢 READY FOR APPROVAL" })
        .addFields({ name: "VERIFIED BY", value: `${interaction.user}` });

      await interaction.message.edit({ embeds: [newEmbed] });

      return interaction.reply({ content: "✅ Verified successfully.", flags: 64 });
    }

    /* =========================
       APPROVE
    ========================= */
    if (interaction.customId === "gang_approve") {

      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({ content: "❌ Admin permission required.", flags: 64 });
      }

      const verification = embed.fields.find(f => f.name === "VERIFICATION");
      if (!verification || !verification.value.includes("VERIFIED")) {
        return interaction.reply({ content: "❌ This request is not verified yet.", flags: 64 });
      }

      const userId = parts[1];
      const gangKey = parts[2];
      const gang = gangs[gangKey];

      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member) {
        return interaction.reply({ content: "❌ User not found.", flags: 64 });
      }

      // remove old roles
      for (const roleId of config.gangRoleIds) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }

      // add new role
      await member.roles.add(gang.roleId).catch(() => {
        throw new Error("Missing permission to assign role.");
      });

      // nickname
      let name = member.nickname || member.user.username;
      name = name.includes("|") ? name.split("|")[1].trim() : name;

      await member.setNickname(`${gang.prefix} | ${name}`).catch(() => {
        console.log("⚠️ Cannot change nickname (role hierarchy issue)");
      });

      const newEmbed = EmbedBuilder.from(embed)
        .spliceFields(4, 1, { name: "STATUS", value: "✅ APPROVED" })
        .addFields({ name: "APPROVED BY", value: `${interaction.user}` });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });

      return interaction.reply({ content: "✅ Role approved successfully.", flags: 64 });
    }

    /* =========================
       DENY
    ========================= */
      if (interaction.customId === "gang_deny") {

        if (!interaction.member.permissions.has("Administrator")) {
          return interaction.reply({ content: "❌ You do not have permission to deny this request.", flags: 64 });
        }

        const newEmbed = EmbedBuilder.from(embed)
          .spliceFields(4, 1, { name: "STATUS", value: "❌ DENIED" })
          .addFields({ name: "DENIED BY", value: `${interaction.user}` });

        await interaction.message.edit({ embeds: [newEmbed], components: [] });

        return interaction.reply({ content: "❌ Request denied.", flags: 64 });
      }
    
    /* =========================
        UNROLE APPROVE
      ========================= */
      if (interaction.customId === "unrole_approve") {

        if (!interaction.member.permissions.has("Administrator")) {
          return interaction.reply({ content: "❌ Admin only.", flags: 64 });
        }

        const userId = parts[1];
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!member) {
          return interaction.reply({ content: "❌ User not found.", flags: 64 });
        }

        // remove gang roles
        for (const roleId of config.gangRoleIds) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId).catch(() => {});
          }
        }

        // remove prefix
        let name = member.nickname || member.user.username;
        name = name.includes("|") ? name.split("|")[1].trim() : name;

        await member.setNickname(name).catch(() => {
          console.log("⚠️ Cannot change nickname");
        });

        // cooldown
        cooldown.set(userId, Date.now() + COOLDOWN_TIME);

        const newEmbed = EmbedBuilder.from(embed)
          .spliceFields(3, 1, { name: "STATUS", value: "✅ APPROVED" })
          .addFields({ name: "APPROVED BY", value: `${interaction.user}` });

        await interaction.message.edit({ embeds: [newEmbed], components: [] });

        return interaction.reply({ content: "✅ Unrole approved.", flags: 64 });
      }

  });
};