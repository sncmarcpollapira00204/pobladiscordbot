const { SlashCommandBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const rules = require("../data/serverRules");

// init Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// simple cooldown
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

    // ⏳ cooldown (5s)
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

    // ❌ if no API key
    if (!process.env.GEMINI_API_KEY) {
      return interaction.reply({
        content: "❌ Gemini API key not configured.",
        flags: 64
      });
    }

    await interaction.deferReply();

    try {
    const model = genAI.getGenerativeModel({
    model: "gemini-pro"
    });

    const result = await model.generateContent({
    contents: [
        {
        parts: [
            {
            text: prompt
            }
        ]
        }
    ]
    });

const geminiResponse = await result.response;
const text = geminiResponse.text();

      const prompt = `
You are a STRICT support assistant for a roleplay server.

You MUST ONLY use the rules below to answer.

RULES:
${rules}

INSTRUCTIONS:
- Answer ONLY from the rules
- If not found → reply EXACTLY: "Please contact staff."
- Keep answer short and clear
- Do NOT invent anything

User question:
${question}
`;

      const response = await result.response;
      const text = response.text();

      // Discord limit safety
      const reply = text.length > 2000 ? text.slice(0, 1990) + "..." : text;

      await interaction.editReply(reply);

    } catch (error) {
      console.error("Gemini Error:", error);

      await interaction.editReply(
        "❌ GwenAI is not working properly!"
      );
    }
  }
};