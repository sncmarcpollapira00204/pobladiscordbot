const { SlashCommandBuilder } = require("discord.js");
const Groq = require("groq-sdk");
const rules = require("../data/serverRules");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask server rules")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const question = interaction.options.getString("question").toLowerCase();

    // ⏳ cooldown
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

    // ❌ no API key
    if (!process.env.GROQ_API_KEY) {
      return interaction.reply({
        content: "❌ Groq API key not set.",
        flags: 64
      });
    }

    try {
      await interaction.deferReply();

      // 🔍 FILTER RULES (FIX SA TOKEN LIMIT)
      const lines = rules.split("\n");

      const matched = lines.filter(line =>
        line.toLowerCase().includes(question)
      );

      const context = matched.slice(0, 20).join("\n");

      // ❌ NO MATCH
      if (!context) {
        return interaction.editReply("❌ No matching rule found.");
      }

      // 🧠 SMALL PROMPT LANG (NO MORE 413 ERROR)
      const prompt = `
Use ONLY this information:

${context}

If answer not found, say: "Please contact staff."

Question:
${question}
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "Answer only from given rules." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const aiReply =
        completion.choices?.[0]?.message?.content || "No response.";

      const finalReply =
        aiReply.length > 2000
          ? aiReply.slice(0, 1990) + "..."
          : aiReply;

      await interaction.editReply(finalReply);

    } catch (err) {
      console.error("Groq Error:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ AI failed. Try again.");
      } else {
        await interaction.reply({
          content: "❌ AI failed. Try again.",
          flags: 64
        });
      }
    }
  }
};