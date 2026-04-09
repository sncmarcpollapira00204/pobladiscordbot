/* PROJECT POBLACION - DISCORD BOT */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database"); // ✅ DATABASE
const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 60 * 1000;

module.exports = async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  // ✅ GLOBAL DEFER (FIXES ERROR)
  await interaction.deferReply({ ephemeral: true });

  function formatVouches(vouches) {
    if (!vouches.length) return "None";

    let result = "";
    for (let i = 0; i < vouches.length; i++) {
      if (i % 2 === 0) {
        result += vouches[i];
      } else {
        result += " , " + vouches[i] + "\n";
      }
    }

    return result.trim();
  }

  /* =========================
     WHITELIST SUBMIT
  ========================= */

  if (interaction.customId === "whitelist_submit") {

    if (interaction.member.roles.cache.has(config.citizenRoleId)) {
      return interaction.editReply("❌ You already have the **Citizen** role. No need to apply.");
    }

    const characterName = interaction.fields.getTextInputValue("character_name");
    const steamProfile = interaction.fields.getTextInputValue("steam_profile");

    /* VALIDATION */

    const isValidSteam =
      /^https:\/\/steamcommunity\.com\/(id|profiles)\/.+/.test(steamProfile);

    if (!isValidSteam) {
      return interaction.editReply("❌ Invalid Steam profile link.");
    }

    /* SAVE TO DATABASE ✅ */

    try {
      await pool.query(
        `INSERT INTO whitelist (discord_id, character_name, steam_profile, vouchers)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (discord_id)
         DO UPDATE SET
         character_name = EXCLUDED.character_name,
         steam_profile = EXCLUDED.steam_profile`,
        [
          interaction.user.id,
          characterName,
          steamProfile,
          "None"
        ]
      );
    } catch (err) {
      console.error("DB SAVE ERROR:", err);
      return interaction.editReply("❌ Failed to save application.");
    }

    /* COOLDOWN */

    const userId = interaction.user.id;
    cooldowns.set(userId, Date.now());
    setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME);

    /* ACCOUNT AGE */

    const createdAt = interaction.user.createdAt;
    const diffDays = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const diffMonths = Math.floor((diffDays % 365) / 30);
    const accountAge = `${diffYears} year(s), ${diffMonths} month(s)`;

    /* EMBED */

    const description = 
`NEW WHITELIST APPLICATION

👤 APPLICANT INFORMATION:
DISCORD USER: ${interaction.user}
ACCOUNT AGE: ${accountAge}

🎭 CHARACTER DETAILS:
IN-GAME NAME: ${characterName}
STEAM LINK: [Steam Profile](${steamProfile})

👥 VOUCHED BY: None

🟡 PENDING WHITELIST APPLICATION`;

    const embed = new EmbedBuilder()
      .setColor(0xff8c00)
      .setAuthor({
        name: "POBLACION ROLEPLAY",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setDescription(description)
      .setFooter({ text: "Poblacion Whitelist System" })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vouch").setLabel("VOUCH").setEmoji("🖐️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("approve").setLabel("APPROVE").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("deny").setLabel("DENY").setEmoji("✖️").setStyle(ButtonStyle.Danger)
    );

    const channel = interaction.client.channels.cache.get(config.whitelistChannelId);

    if (!channel) {
      return interaction.editReply("❌ Whitelist channel not found.");
    }

    await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    return interaction.editReply("✅ Your application has been submitted!");
  }

  /* =========================
     DENY MODAL (FIXED)
  ========================= */

  if (interaction.customId.startsWith("deny_reason_modal:")) {

    const reason = interaction.fields.getTextInputValue("deny_reason");
    const messageId = interaction.customId.split(":")[1];

    const channel = interaction.client.channels.cache.get(config.whitelistChannelId);
    if (!channel) return interaction.editReply("❌ Channel not found.");

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message || !message.embeds.length) {
      return interaction.editReply("❌ Application message not found.");
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const oldDesc = embed.data.description;

    const newDesc = oldDesc.replace(
      /🟡 PENDING WHITELIST APPLICATION|🔵 PENDING ADMIN REVIEW/,
      `❌ DENIED BY: ${interaction.user}\n📄 REASON: ${reason}`
    );

    embed.setDescription(newDesc);

    await message.edit({
      embeds: [embed],
      components: []
    });

    return interaction.editReply("❌ Application denied.");
  }
};