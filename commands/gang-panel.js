const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const gangs = require("../gangRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gang-panel")
    .setDescription("Send gang role request panel"),

  async execute(interaction) {

    // 🔒 ADMIN ONLY
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ You do not have permission.",
        flags: 64
      });
    }


    // EMBED UI

        const embed = new EmbedBuilder()
        .setColor(0x8B0000) // deep red = more premium
        .setAuthor({
            name: "POBLACION ROLEPLAY • GANG REQUEST",
            iconURL: interaction.guild.iconURL({ dynamic: true }) // 🔥 guild icon instead of gun
        })
        .setDescription(
            "Welcome to **Poblacion City Roleplay**\n\n" +
            "Use the selector below to submit your **Gang Role Request**.\n\n" +
            "━━━━━━━━━━━━━━━━━━\n" +
            "📌 **REQUIREMENTS**\n" +
            "• Verified by **Patrons / Patronas**\n" +
            "• Must pass **Admin Approval**\n\n" +
            "⚠️ **IMPORTANT RULES**\n" +
            "• Only **ONE gang** per player\n" +
            "• Incorrect requests will be **denied**\n" +
            "• Abuse of system = **punishment**\n" +
            "━━━━━━━━━━━━━━━━━━"
        )
        .setThumbnail(
            interaction.guild.iconURL({ dynamic: true }) // 🔥 clean logo look
        )
        .setImage(
            "https://cdn.discordapp.com/attachments/1466355570805313719/1466355571706826842/Poblagif1.gif?ex=69d0d18b&is=69cf800b&hm=6241a4243e099977b144c4aedf2535dac1d9fe01ed439852c12c3f9d5b53af66"
        )
        .setFooter({
            text: "Poblacion Roleplay • Gang Management System",
            iconURL: "https://cdn.discordapp.com/attachments/1466355570805313719/1466783941867339888/gif_tag_3.gif?ex=69d10eff&is=69cfbd7f&hm=cb7260fac014cc0e2128d919d99ea46e6c58246fb6a7f435a58d92ae6623a7bc"
        })
        .setTimestamp();

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

    const dropdownRow = new ActionRowBuilder().addComponents(select);

    /* =========================
       LEAVE BUTTON
    ========================= */

    const leaveButton = new ButtonBuilder()
      .setCustomId("gang_leave")
      .setLabel("Leave Gang")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🚪");

    const buttonRow = new ActionRowBuilder().addComponents(leaveButton);

    /* =========================
       SEND PANEL
    ========================= */

    await interaction.channel.send({
      embeds: [embed],
      components: [dropdownRow, buttonRow]
    });

    return interaction.reply({
      content: "✅ Gang panel sent.",
      flags: 64
    });
  }
};