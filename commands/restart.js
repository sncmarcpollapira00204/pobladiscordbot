const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the Gatekeeper bot"),

  async execute(interaction) {

    // ADMIN CHECK
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ You do not have permission to restart the bot.",
        flags: 64
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle("♻️ Gatekeeper Restarting")
      .setDescription(
        `**Poblacion Gatekeeper is restarting...**\n\n` +
        `👮 Restarted by: ${interaction.user}\n` +
        `⚙️ System reboot in progress`
      )
      .setFooter({ text: "Poblacion City Roleplay" })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });

    console.log(`Bot restart triggered by ${interaction.user.tag}`);

    setTimeout(() => {
      process.exit(1);
    }, 3000);
  }
};