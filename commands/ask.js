const { SlashCommandBuilder } = require("discord.js");
const { OpenAI } = require("openai");
const rules = require("../data/serverRules");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// simple cooldown
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

    // 🔒 cooldown (5 seconds)
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

    // 🔒 limit question length
    if (question.length > 300) {
      return interaction.reply({
        content: "❌ Keep your question shorter.",
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
- Answer ONLY based on the rules above
- Do NOT invent or assume anything
- If not found in rules → say "Please contact staff"
- Keep answers short and clear
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
      console.error("AI ERROR:", err);

      await interaction.editReply("❌ AI support is unavailable.");
    }
  }
};