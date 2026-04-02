const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("../config.json");

module.exports = async (interaction) => {
  try {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "no_voucher_modal") return;

    // ✅ prevent timeout
    await interaction.deferReply({ flags: 64 });

    const name = interaction.fields.getTextInputValue("character_name").trim();
    const steam = interaction.fields.getTextInputValue("steam_link").trim();
    const steamInput = steam.toLowerCase();

    /* =========================
       VALIDATION
    ========================= */
    if (!name || name.length < 3) {
      return interaction.editReply("❌ Invalid in-game name.");
    }

    if (
      !steamInput.startsWith("https://steamcommunity.com/id/") &&
      !steamInput.startsWith("https://steamcommunity.com/profiles/")
    ) {
      return interaction.editReply(
        "❌ Invalid Steam profile link.\n\nUse:\n• https://steamcommunity.com/id/yourname\n• https://steamcommunity.com/profiles/yourid"
      );
    }

    /* =========================
       EMBED
    ========================= */
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📄 NON-VOUCHER APPLICATION")
      .setThumbnail(
        interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
      )
      .addFields(
        { name: "DISCORD USER", value: `<@${interaction.user.id}>` },
        { name: "IN-GAME NAME", value: name },
        { name: "STEAM LINK", value: `[Click Steam Profile](${steam})` },
        { name: "STATUS", value: "🟡 PENDING" }
      )
      .setFooter({ text: `UID:${interaction.user.id}` })
      .setTimestamp();

    /* =========================
       BUTTONS (FINAL FLOW)
    ========================= */
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("no_voucher_interviewed")
        .setLabel("Interviewed")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("no_voucher_deny")
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const channel = await interaction.client.channels.fetch(
      config.noVoucherChannelId
    ).catch(() => null);

    if (!channel) {
      return interaction.editReply("❌ Cannot find application channel.");
    }

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.editReply("✅ Application submitted!");

  } catch (err) {
    console.error("NoVoucher Modal Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Failed to submit.",
        flags: 64
      }).catch(() => {});
    }
  }
};