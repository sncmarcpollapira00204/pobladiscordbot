const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database");

/* =========================
   SAFE REPLY (FIX)
========================= */
const safeReply = async (interaction, content) => {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply({ content });
    } else {
      return await interaction.reply({ content, flags: 64 });
    }
  } catch (err) {
    console.error("Reply failed:", err);
  }
};

/* ADMIN CHECK */
const isAdmin = async (interaction) => {
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  return member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

/* GET CHARACTER NAME */
const getCharacterName = (fields) => {
  const field = fields.find(f => f.value?.includes("Character Name:"));
  if (!field) return null;

  return field.value
    .split("Character Name:")[1]
    .split("\n")[0]
    .trim()
    .replace(/[*_~`|]/g, "")
    .slice(0, 32);
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const whitelistButtons = [
    "open_whitelist_modal",
    "vouch",
    "approve",
    "deny"
  ];

  if (!whitelistButtons.includes(interaction.customId)) return;

  /* OPEN MODAL */
  if (interaction.customId === "open_whitelist_modal") {

    if (interaction.member.roles.cache.has(config.citizenRoleId)) {
      return safeReply(interaction, "❌ You are already a **CITIZEN**.");
    }

    const modal = new ModalBuilder()
      .setCustomId("whitelist_submit")
      .setTitle("📄 Whitelist Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("character_name")
          .setLabel("Character Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("age")
          .setLabel("Character Age")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("steam_profile")
          .setLabel("Steam Profile URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  const message = interaction.message;
  if (!message.embeds.length) return;

  const embed = EmbedBuilder.from(message.embeds[0]);
  const fields = embed.data.fields;

  const statusField = fields.find(f =>
    f.name === "\u200B" && f.value.includes("PENDING")
  );

  /* =========================
    VOUCH SYSTEM
  ========================= */
  if (interaction.customId === "vouch") {

    if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
      return safeReply(interaction, "❌ Only **Citizens** can vouch.");
    }

    if (!statusField) {
      return safeReply(interaction, "❌ Application is not pending.");
    }

    const userField = fields.find(f => f.value?.includes("<@"));
    const match = userField?.value.match(/<@(\d+)>/);

    if (!match) {
      return safeReply(interaction, "❌ Failed to get applicant.");
    }

    const applicantId = match[1];

    if (interaction.user.id === applicantId) {
      return safeReply(interaction, "❌ You cannot vouch yourself.");
    }

    const vouchField = fields.find(f =>
      f.name.toUpperCase().includes("VOUCHED BY")
    );

    if (!vouchField) {
      return safeReply(interaction, "❌ Vouch field missing.");
    }

    let vouches = vouchField.value === "None"
      ? []
      : vouchField.value.split(", ");

    const voucher = `<@${interaction.user.id}>`;

    // 🔁 TOGGLE SYSTEM
    if (vouches.includes(voucher)) {
      vouches = vouches.filter(v => v !== voucher);
      vouchField.value = vouches.length ? vouches.join(", ") : "None";

      await message.edit({ embeds: [embed] });

      try {
        await pool.query(
          "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
          [vouchField.value, applicantId]
        );
      } catch (err) {
        console.error("DB ERROR:", err);
      }

      return safeReply(interaction, "❌ Vouch removed.");
    }

    // ✅ ADD VOUCH
    vouches.push(voucher);
    vouchField.value = vouches.join(", ");

    await message.edit({ embeds: [embed] });

    try {
      await pool.query(
        "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
        [vouchField.value, applicantId]
      );
    } catch (err) {
      console.error("DB ERROR:", err);
    }

    return safeReply(interaction, "✅ Vouch added.");
  }

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    if (!(await isAdmin(interaction))) {
      return safeReply(interaction, "❌ No permission.");
    }

    if (!statusField || !statusField.value.includes("PENDING")) {
      return safeReply(interaction, "❌ Already handled.");
    }

    const userField = fields.find(f => f.value?.includes("<@"));
    const userId = userField?.value.match(/\d+/)?.[0];

    const characterName = getCharacterName(fields);

    statusField.value = "✅ **APPROVED**";

    embed.addFields({
      name: "✅ APPROVED BY",
      value: `${interaction.user}`
    });

    await message.edit({
      embeds: [embed],
      components: []
    });

    const member = await interaction.guild.members.fetch(userId);

    await member.roles.add(config.citizenRoleId).catch(() => {});

    try {
      await member.setNickname(characterName);
    } catch {}

    return safeReply(interaction, "✅ Approved.");
  }

  /* =========================
     DENY
  ========================= */
  if (interaction.customId === "deny") {

    if (!(await isAdmin(interaction))) {
      return safeReply(interaction, "❌ No permission.");
    }

    const modal = new ModalBuilder()
      .setCustomId(`deny_reason_modal:${message.id}`)
      .setTitle("Deny Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }
};