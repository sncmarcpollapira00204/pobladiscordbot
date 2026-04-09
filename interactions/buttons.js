const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database");

/* CHECK CITIZEN */
const isCitizen = (interaction) => {
  return interaction.member.roles.cache.has(config.citizenRoleId);
};

/* CHECK ADMIN */
const isAdmin = (interaction) => {
  return interaction.member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

/* SAFE REPLY */
const safeReply = async (interaction, content) => {
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ content });
  } else {
    return interaction.reply({ content, flags: 64 });
  }
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.deferReply({ flags: 64 });

  /* =========================
     OPEN MODAL
  ========================= */
  if (interaction.customId === "open_whitelist_modal") {

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
          .setCustomId("steam_profile")
          .setLabel("Steam Profile URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  const message = interaction.message;

  if (!message.embeds.length) {
    return safeReply(interaction, "❌ Invalid application embed.");
  }

  const embed = EmbedBuilder.from(message.embeds[0]);
  let desc = embed.data.description || "";

  // ✅ DETECT FORMAT
  const isOldFormat = embed.data.fields && embed.data.fields.length > 0;
  const isNewFormat = desc.includes("NEW WHITELIST APPLICATION");

  // ✅ GET USER ID
  let userId = null;

  if (isNewFormat) {
    const match = desc.match(/<@(\d+)>/);
    if (match) userId = match[1];
  }

  if (isOldFormat) {
    const userField = embed.data.fields.find(f => f.value?.includes("<@"));
    const match = userField?.value.match(/<@(\d+)>/);
    if (match) userId = match[1];
  }

  if (!userId) {
    return safeReply(interaction, "❌ User not found.");
  }

  /* =========================
     VOUCH
  ========================= */
  if (interaction.customId === "vouch") {

    if (!isCitizen(interaction)) {
      return safeReply(interaction, "❌ Only **Citizens** can vouch.");
    }

    if (!isNewFormat) {
      return safeReply(interaction, "❌ Old applications cannot use vouch.");
    }

    if (interaction.user.id === userId) {
      return safeReply(interaction, "❌ You cannot vouch yourself.");
    }

    const result = await pool.query(
      "SELECT * FROM whitelist WHERE discord_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return safeReply(interaction, "❌ No database record found.");
    }

    let data = result.rows[0];

    let vouches = data.vouchers && data.vouchers !== "None"
      ? data.vouchers.split(", ")
      : [];

    const voucher = `<@${interaction.user.id}>`;
    let action;

    if (vouches.includes(voucher)) {
      vouches = vouches.filter(v => v !== voucher);
      action = "removed";
    } else {
      vouches.push(voucher);
      action = "added";
    }

    const updatedVouches = vouches.length ? vouches.join(", ") : "None";

    await pool.query(
      "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
      [updatedVouches, userId]
    );

    const nameMatch = desc.match(/IN-GAME NAME: (.*)/);
    const steamMatch = desc.match(/\((https:\/\/steamcommunity\.com\/.*?)\)/);
    const ageMatch = desc.match(/ACCOUNT AGE: (.*)/);

    const characterName = nameMatch ? nameMatch[1] : "Unknown";
    const steam = steamMatch ? steamMatch[1] : "Unknown";
    const accountAge = ageMatch ? ageMatch[1] : "Unknown";

    const newDesc = 
`NEW WHITELIST APPLICATION

👤 APPLICANT INFORMATION:
DISCORD USER: <@${userId}>
ACCOUNT AGE: ${accountAge}

🎭 CHARACTER DETAILS:
IN-GAME NAME: ${characterName}
STEAM LINK: [Steam Profile](${steam})

👥 VOUCHED BY: ${updatedVouches}

${vouches.length ? "🔵 PENDING ADMIN REVIEW" : "🟡 PENDING WHITELIST APPLICATION"}`;

    embed.setDescription(newDesc);

    await message.edit({ embeds: [embed] });

    return safeReply(
      interaction,
      action === "added" ? "✅ Vouch added." : "❌ Vouch removed."
    );
  }

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    if (!isAdmin(interaction)) {
      return safeReply(interaction, "❌ Only **Admins** can approve.");
    }

    if (!isNewFormat && !isOldFormat) {
      return safeReply(interaction, "❌ This is not an application.");
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!member) {
      return safeReply(interaction, "❌ Member not found.");
    }

    let characterName = null;

    if (isNewFormat) {
      const nameMatch = desc.match(/IN-GAME NAME: (.*)/);
      if (nameMatch) characterName = nameMatch[1];
    }

    if (isOldFormat) {
      const nameField = embed.data.fields.find(f => f.value?.includes("Character Name:"));
      if (nameField) {
        characterName = nameField.value.split("Character Name:")[1]?.trim();
      }
    }

    try {
      await member.roles.add(config.citizenRoleId);
    } catch {}

    if (characterName) {
      try {
        await member.setNickname(characterName);
      } catch {}
    }

    if (isNewFormat) {
      desc = desc.replace(
        "🔵 PENDING ADMIN REVIEW",
        `✅ APPROVED BY ADMIN: ${interaction.user}`
      );

      embed.setDescription(desc);
    }

    if (isOldFormat) {
      const fields = embed.data.fields;

      const statusField = fields.find(f => f.value?.includes("PENDING"));
      if (statusField) {
        statusField.value = "✅ APPROVED";
      }

      embed.addFields({
        name: "✅ APPROVED BY",
        value: `${interaction.user}`
      });
    }

    await message.edit({
      embeds: [embed],
      components: []
    });

    return safeReply(interaction, "✅ Approved.");
  }

  /* =========================
     DENY
  ========================= */
  if (interaction.customId === "deny") {

    if (!isAdmin(interaction)) {
      return safeReply(interaction, "❌ Only **Admins** can deny.");
    }

    if (!isNewFormat && !isOldFormat) {
      return safeReply(interaction, "❌ This is not an application.");
    }

    const modal = new ModalBuilder()
      .setCustomId(`deny_reason_modal:${message.id}`)
      .setTitle("Deny Reason");

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