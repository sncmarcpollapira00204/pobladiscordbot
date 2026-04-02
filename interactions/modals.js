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

  /* =========================
     WHITELIST SUBMIT
  ========================= */

  if (interaction.customId === "whitelist_submit") {

    await interaction.deferReply({ flags: 64 }); // prevent timeout

    const characterName = interaction.fields.getTextInputValue("character_name");
    const age = interaction.fields.getTextInputValue("age");
    const steamProfile = interaction.fields.getTextInputValue("steam_profile");

    /* VALIDATION */

    if (isNaN(age)) {
      return interaction.editReply("❌ Character age must be a number.");
    }

    if (
      !steamProfile.startsWith("https://steamcommunity.com/id/") &&
      !steamProfile.startsWith("https://steamcommunity.com/profiles/")
    ) {
      return interaction.editReply("❌ Please provide a valid Steam profile link.");
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

    const SPACE = "\u200B";

    /* EMBED */

    const embed = new EmbedBuilder()
      .setColor(0xff8c00)
      .setAuthor({
        name: "[ NEW WHITELIST APPLICATION ]",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: SPACE, value: "👤 **APPLICANT INFORMATION:**" },
        {
          name: SPACE,
          value:
            `**Discord User:** ${interaction.user}\n` +
            `**Account Age:** ${accountAge}`
        },

        { name: SPACE, value: "🎭 **CHARACTER DETAILS:**" },
        {
          name: SPACE,
          value:
            `**Character Name:** ${characterName}\n` +
            `**Character Age:** ${age}`
        },

        { name: SPACE, value: "🔗 **STEAM LINK:**" },
        {
          name: SPACE,
          value: `🌐 [Steam Profile](${steamProfile})`
        },

        { name: SPACE, value: "📊 **APPLICATION STATUS:**" },
        {
          name: SPACE,
          value: "🟡 **PENDING REVIEW**"
        },

        { name: SPACE, value: SPACE },

        {
          name: "👥 **VOUCHED BY:**",
          value: "None"
        }
      )
      .setFooter({ text: "Poblacion City Roleplay" })
      .setTimestamp();

    /* BUTTONS */

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vouch").setLabel("Vouch").setEmoji("🖐️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("approve").setLabel("Approve").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("deny").setLabel("Deny").setEmoji("✖️").setStyle(ButtonStyle.Danger)
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
     DENY MODAL (UNCHANGED)
  ========================= */

  if (interaction.customId.startsWith("deny_reason_modal:")) {

    const reason = interaction.fields.getTextInputValue("deny_reason");
    const messageId = interaction.customId.split(":")[1];

    const channel = interaction.client.channels.cache.get(config.whitelistChannelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message || !message.embeds.length) {
      return interaction.reply({
        content: "❌ Application message not found.",
        flags: 64
      });
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const fields = embed.data.fields;

    const statusField = fields.find(field =>
      field.value?.includes("PENDING REVIEW")
    );

    if (!statusField) {
      return interaction.reply({
        content: "❌ This application can no longer be denied.",
        flags: 64
      });
    }

    statusField.value = "❌ **DENIED**";

    embed.addFields(
      { name: "❌ **DENIED BY**", value: `${interaction.user}` },
      { name: "📄 **DENIAL REASON**", value: reason }
    );

    await message.edit({
      embeds: [embed],
      components: []
    });

    return interaction.reply({
      content: "❌ Application denied.",
      flags: 64
    });
  }
};