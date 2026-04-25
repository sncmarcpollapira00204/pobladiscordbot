const { SlashCommandBuilder } = require("discord.js");
const rules = require("../serverRules"); // <-- your file

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Search server rules")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Search keyword")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("question").toLowerCase();

    // split rules into lines
    const lines = rules.split("\n");

    // find matching lines
    const results = lines.filter(line =>
      line.toLowerCase().includes(query)
    );

    if (results.length === 0) {
      return interaction.reply(
        "❌ Walang nakita sa rules. Try different keyword."
      );
    }

    // limit to avoid Discord 2000 char error
    const output = results.slice(0, 20).join("\n");

    return interaction.reply(`📜 **RESULTS:**\n${output}`);
  }
};