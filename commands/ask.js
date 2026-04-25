const { SlashCommandBuilder } = require("discord.js");
const rules = require("../data/serverRules");

let OpenAI;

// 🔒 SAFE IMPORT (para hindi mag crash kung wala pang openai)
try {
  OpenAI = require("openai").OpenAI;
} catch (err) {
  console.error("❌ OpenAI package not installed.");
}

let openai;

if (OpenAI && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// cooldown
const cooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask support AI")
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

    // 🔒 limit
    if (question.length > 300) {
      return interaction.reply({
        content: "❌ Keep your question shorter.",
        flags: 64
      });
    }

    // ❌ if no OpenAI
    if (!openai) {
      return interaction.reply({
        content: "❌ AI not configured (missing API key or package).",
        flags: 64
      });
    }

    await interaction.deferReply();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are a support assistant for Poblacion Roleplay.

You MUST follow these rules strictly:

${rules}

Instructions:
- Answer ONLY based on the rules
- Do NOT invent anything
- If not found → say "Please contact staff"
- Keep answers short
`
          },
          {
            role: "user",
            content: question
          }
        ]
      });

      const reply = response.choices[0].message.content;

      await interaction.editReply(reply);

    } catch (err) {
      console.error("❌ AI ERROR:", err);

      await interaction.editReply("❌ AI failed. Try again later.");
    }
  }
};