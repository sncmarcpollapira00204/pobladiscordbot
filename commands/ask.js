const { SlashCommandBuilder } = require("discord.js");
const rules = require("../data/serverRules"); // make sure tama path

const cooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Search server rules")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Enter keyword (e.g. vdm, gang, whitelist)")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const query = interaction.options.getString("question").toLowerCase();

    // ⏳ cooldown (5 seconds)
    if (cooldown.has(userId)) {
      const time = cooldown.get(userId);
      if (Date.now() < time) {
        return interaction.reply({
          content: "⏳ Wait before asking again.",
          flags: 64
        });
      }
    }
    cooldown.set(userId, Date.now() + 5000);

    // split rules into lines
    const lines = rules.split("\n");

    // find matches
    const results = lines.filter(line =>
      line.toLowerCase().includes(query)
    );

    // ❌ no results
    if (results.length === 0) {
      return interaction.reply({
        content: "❌ Walang nakita sa rules.\n👉 Try different keyword.",
        flags: 64
      });
    }

    // 🔥 chunk system (para hindi ma-2000 char limit)
    const chunks = [];
    let current = "";

    for (const line of results) {
      if ((current + line).length > 1900) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }

    if (current) chunks.push(current);

    // send first reply
    await interaction.reply(`📜 **RESULTS for:** \`${query}\`\n\n${chunks[0]}`);

    // send remaining chunks
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp(chunks[i]);
    }
  }
};