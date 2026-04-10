const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database");

/* SAFE REPLY */
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
  const desc = embed.data.description || "";

  const isPending =
    desc.includes("🟡 PENDING WHITELIST APPLICATION") ||
    desc.includes("🔵 PENDING ADMIN REVIEW");

  /* =========================
     VOUCH
  ========================= */
  if (interaction.customId === "vouch") {

    if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
      return safeReply(interaction, "❌ Only **Citizens** can vouch.");
    }

    if (!isPending) {
      return safeReply(interaction, "❌ Application is not pending.");
    }

    // GET APPLICANT ID FROM DESCRIPTION
    const userMatch = desc.match(/DISCORD USER: <@(\d+)>/);
    if (!userMatch) {
      return safeReply(interaction, "❌ Failed to get applicant.");
    }

    const applicantId = userMatch[1];

    if (interaction.user.id === applicantId) {
      return safeReply(interaction, "❌ You cannot vouch yourself.");
    }

    // GET CURRENT VOUCHES
    const vouchMatch = desc.match(/👥 \*\*VOUCHED BY:\*\* ([\s\S]*?)\n\n/);
    let vouches = [];

    if (vouchMatch && vouchMatch[1] !== "None") {
      vouches = vouchMatch[1]
        .split(/,\n|, /)
        .map(v => v.replace(/[<@>]/g, ""));
    }

    const userId = interaction.user.id;

    // TOGGLE
    if (vouches.includes(userId)) {
      vouches = vouches.filter(v => v !== userId);
    } else {
      vouches.push(userId);
    }

    const formatted = vouches.length
      ? vouches.map(id => `<@${id}>`).join(",\n")
      : "None";

    const statusText = vouches.length > 0
      ? `🔵 PENDING ADMIN REVIEW\n_Application has received vouches and is awaiting admin approval._`
      : `🟡 PENDING WHITELIST APPLICATION\n_Waiting for citizen vouches..._`;

    embed.setDescription(
      desc.replace(
        /👥 \*\*VOUCHED BY:\*\*[\s\S]*?(🟡 PENDING WHITELIST APPLICATION|🔵 PENDING ADMIN REVIEW)/,
        `👥 **VOUCHED BY:** ${formatted}\n\n${statusText}`
      )
    );

    // COLOR STATUS
    embed.setColor("#3498db");

    await message.edit({ embeds: [embed] });

    try {
      await pool.query(
        "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
        [formatted, applicantId]
      );
    } catch (err) {
      console.error("DB ERROR:", err);
    }

    return safeReply(interaction, "✅ Vouch updated.");
  }

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    if (!(await isAdmin(interaction))) {
      return safeReply(interaction, "❌ No permission.");
    }

    if (!isPending) {
      return safeReply(interaction, "❌ Already handled.");
    }

    const userMatch = desc.match(/DISCORD USER: <@(\d+)>/);
    if (!userMatch) return;

    const userId = userMatch[1];

    const nameMatch = desc.match(/IN-GAME NAME: (.+)/);
    const characterName = nameMatch ? nameMatch[1] : null;

    embed.setDescription(
      desc.replace(
        /🟡 PENDING WHITELIST APPLICATION|🔵 PENDING ADMIN REVIEW/,
        `✅ APPROVED BY: ${interaction.user}`
      )
    );

    // STATUS COLOR GREEN
    embed.setColor("#2ecc71");

    await message.edit({
      embeds: [embed],
      components: []
    });

    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (member) {
      await member.roles.add(config.citizenRoleId).catch(() => {});
      if (characterName) {
        try {
          await member.setNickname(characterName);
        } catch {}
      }
    }

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