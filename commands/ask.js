const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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

    // ❌ no API key
    if (!process.env.GROQ_API_KEY) {
      return interaction.reply({
        content: "❌ Groq API key not set.",
        flags: 64
      });
    }

    try {
      await interaction.deferReply();

      // 🔍 smart matching
      const lines = rules.split("\n");
      const words = question.split(" ");

      const matched = lines.filter(line => {
        const lower = line.toLowerCase();
        return words.some(word => lower.includes(word));
      });

      const context = matched.slice(0, 25).join("\n");

      const prompt = `
You are a roleplay server support assistant.

Use the rules below as your MAIN reference:

${context || rules.slice(0, 1500)}

Instructions:
- Answer clearly and naturally (Taglish allowed)
- Keep it short and clean
- Do NOT invent strict rules

Question:
${questionRaw}
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a helpful RP assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 400
      });

      const aiReply =
        completion.choices?.[0]?.message?.content || "No response.";

      // 🧱 EMBED
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple
        .setTitle("📜 Server Support")
        .addFields(
          { name: "❓ Question", value: questionRaw },
          { name: "💡 Answer", value: aiReply.slice(0, 1024) }
        )
        .setFooter({ text: "Powered by AI Support System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

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