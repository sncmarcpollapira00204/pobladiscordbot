const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("no-voucher-panel")
    .setDescription("Send no-voucher application panel"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor(0xff8c00)
      .setAuthor({
        name: "No Voucher Application",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setDescription(
        "Welcome to **Poblacion City Roleplay.**\n\n" +
        "Click the button below to apply without a voucher.\n\n" +
        "⚠️ **Application Rules:**\n" +
        "• You will undergo an interview\n" +
        "• Troll applications = instant deny\n" +
        "• Follow server RP rules"
      )
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1464857857437470871/1466306177733496893/poblagif.gif"
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1466355570805313719/1466783941867339888/gif_tag_3.gif"
      )
      .setFooter({ text: "Poblacion City Roleplay" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("no_voucher_apply")
        .setLabel("Apply (No Voucher)")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: "✅ No Voucher panel sent.",
      ephemeral: true
    });

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};