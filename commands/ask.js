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
    const questionRaw = interaction.options.getString("question");
    const question = questionRaw.toLowerCase();

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

    if (!process.env.GROQ_API_KEY) {
      return interaction.reply({
        content: "❌ Groq API key not set.",
        flags: 64
      });
    }

    try {
      await interaction.deferReply();

      // 🔍 SMART MATCHING
      const lines = rules.split("\n");
      const words = question.split(" ");

      const matched = lines.filter(line => {
        const lower = line.toLowerCase();

        return words.some(word => lower.includes(word));
      });

      const context = matched.slice(0, 25).join("\n");

      // 🧠 SMART PROMPT (BALANCED AI)
      const prompt = `
You are a roleplay server support assistant.

Use the rules below as your MAIN reference:

${context || rules.slice(0, 1500)}

Instructions:
- Answer clearly and naturally (Taglish allowed)
- If rules are relevant → use them
- If partially related → explain properly
- If not found → give best helpful answer WITHOUT inventing fake rules
- Keep it short and easy to understand

User question:
${questionRaw}
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a helpful RP server assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 400
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