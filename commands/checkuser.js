const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkuser")
    .setDescription("Check a user's whitelist application")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to check")
        .setRequired(true)
    ),

  async execute(interaction) {

    const target = interaction.options.getUser("user");

    await interaction.deferReply();

    try {

      const result = await pool.query(
        "SELECT * FROM whitelist WHERE discord_id = $1",
        [target.id]
      );

      if (result.rows.length === 0) {
        return interaction.editReply("❌ No application found for this user.");
      }

      const data = result.rows[0];

      const embed = new EmbedBuilder()
        .setColor(0xff8c00)
        .setAuthor({
          name: "WHITELIST APPLICATION LOOKUP",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setThumbnail(
          target.displayAvatarURL({ dynamic: true, size: 256 })
        )
        .addFields(
          { name: "DISCORD USER", value: `<@${target.id}>` },
          { name: "CHARACTER NAME", value: data.character_name },
          { name: "STEAM PROFILE", value: `[Steam Profile](${data.steam_profile})` },
          { name: "VOUCHERS", value: data.vouchers || "None" }
        )
        .setFooter({ text: "Poblacion City Roleplay" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {

      console.error(error);
      await interaction.editReply("❌ Database error.");

    }

  }
};