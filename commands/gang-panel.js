const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const gangs = require("../gangRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gang-panel")
    .setDescription("Send gang role request panel"),

  async execute(interaction) {

    // 🔒 OPTIONAL ADMIN ONLY
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ You do not have permission.",
        flags: 64
      });
    }

    /* =========================
       EMBED UI
    ========================= */

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🔫 GANG ROLE REQUEST")
      .setDescription(
        "**Poblacion City Roleplay**\n\n" +
        "Select your gang below to request a role.\n\n" +
        "⚠️ **Rules:**\n" +
        "• Must be verified by Directors/Patrons\n" +
        "• Admin approval required\n" +
        "• Wrong request = denied"
      )
      .setFooter({ text: "Poblacion Roleplay" });

    /* =========================
       DROPDOWN OPTIONS
    ========================= */

    const options = Object.entries(gangs).map(([key, gang]) => ({
      label: gang.name,
      value: key
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId("gang_select")
      .setPlaceholder("Select your gang...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    /* =========================
       SEND PANEL
    ========================= */

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: "✅ Gang panel sent.",
      flags: 64
    });
  }
};