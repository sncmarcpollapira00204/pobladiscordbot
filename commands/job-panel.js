const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const jobs = require("../jobRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("job-panel")
    .setDescription("Send job role request panel"),

  async execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ You do not have permission.",
        flags: 64
      });
    }

    // =========================
    // EMBED (UNCHANGED DESIGN)
    // =========================
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setAuthor({
        name: "WHITELISTED JOB ROLE REQUEST",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setDescription(
        "**Welcome to Poblacion City Roleplay**\n\n" +
        "Select your job below to submit a whitelist request.\n\n" +
        "⚠️ **Rules:**\n" +
        "• Must be verified by Directors\n" +
        "• Admin approval required\n" +
        "• One job only\n" +
        "• Invalid requests will be denied"
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setImage(
        "https://cdn.discordapp.com/attachments/1446053243221446667/1489807559228526622/jobs-ezgif.com-video-to-gif-converter.gif"
      )
      .setFooter({
        text: "Poblacion City Roleplay",
        iconURL: "https://cdn.discordapp.com/attachments/1466355570805313719/1466355571706826842/Poblagif1.gif"
      });

    // =========================
    // EMOJIS (SYNCED TO YOUR JOBS)
    // =========================
    const jobEmojis = {
      POLICE: "🚓",
      EMS: "🚑",
      MECHANIC: "🔧"
    };

    // =========================
    // DROPDOWN OPTIONS
    // =========================
    const options = Object.entries(jobs).map(([key, job]) => ({
      label: job.name,
      value: key,
      emoji: jobEmojis[key] || "⚪"
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId("job_select")
      .setPlaceholder("Select your Job Role here...")
      .addOptions(options);

    const dropdownRow = new ActionRowBuilder().addComponents(select);

    // =========================
    // UNROLE BUTTON
    // =========================
    const leaveButton = new ButtonBuilder()
      .setCustomId("job_leave")
      .setLabel("Unrole Request")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🚪");

    const buttonRow = new ActionRowBuilder().addComponents(leaveButton);

    // =========================
    // SEND PANEL
    // =========================
    await interaction.channel.send({
      embeds: [embed],
      components: [dropdownRow, buttonRow]
    });

    return interaction.reply({
      content: "✅ Job panel sent to the channel.",
      flags: 64
    });
  }
};