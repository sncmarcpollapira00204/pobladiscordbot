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
    const question = interaction.options.getString("question");

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
      // 🔥 defer ASAP (prevents Unknown interaction)
      await interaction.deferReply();

      const prompt = `
You are a STRICT roleplay server support assistant.

ONLY answer using the rules below.

RULES:
${rules}

INSTRUCTIONS:
- Do NOT invent anything
- If not found → reply EXACTLY: "Please contact staff."
- Keep answer short and clear

User question:
${question}
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You answer strictly from rules." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
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

      // 🔥 safe fallback (prevents crash)
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