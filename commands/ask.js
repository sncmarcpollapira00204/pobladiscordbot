const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Groq = require("groq-sdk");
const rules = require("../data/serverRules");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cooldown = new Map();

// 🔧 normalize text
const clean = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, "");

// 🔧 keywords
const KEYWORDS = [
  "vdm", "rdm", "rob", "kidnap", "hostage",
  "highground", "traphouse", "raid", "scam", "safezone"
];

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
    const question = clean(questionRaw);

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

      // 🔍 MATCHING RULE CONTEXT
      const lines = rules.split("\n");
      const words = question.split(" ").filter(Boolean);

      const matched = lines.filter(line => {
        const lower = clean(line);

        return (
          KEYWORDS.some(k =>
            question.includes(k) && lower.includes(k)
          ) ||
          words.some(word =>
            lower.includes(word) ||
            lower.includes(word.replace(/s$/, ""))
          )
        );
      });

      // 🔥 context (top matched rules)
      const context =
        matched.length > 0
          ? matched.slice(0, 25).join("\n")
          : "NO_MATCH";

      // 🧠 STRICT PROMPT (FIXED)
      const prompt = `
You are a STRICT Roleplay Server Rules AI.

You MUST ONLY answer using the provided RULES.
You are NOT allowed to use your own knowledge.

====================
SERVER RULES:
${rules}
====================

RELEVANT MATCH:
${context}
====================

USER QUESTION:
${questionRaw}

====================

RULES:
- Only use the SERVER RULES above.
- NEVER invent rules.
- NEVER assume.
- If not found, say: "No specific rule found regarding this."
- If unclear: say "Depends on scenario"
- Always include Article and Section.

FORMAT:

Verdict: (Allowed / Not Allowed / Depends)

Rule Basis:
(Exact Article + Section)

Explanation:
(Simple explanation based ONLY on rules)

Notes:
(Optional)
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a strict rule judge. No guessing." },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 500
      });

      let aiReply =
        completion.choices?.[0]?.message?.content || "";

      // 🔥 FAILSAFE
      if (!aiReply || aiReply.trim() === "") {
        aiReply = `Verdict: Depends

Rule Basis:
No specific rule found regarding this.

Explanation:
The provided rules do not clearly cover this scenario.

Notes:
Avoid assumptions. Ask admin for clarification.`;
      }

      // 🧱 EMBED
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("GATEKEEPER BOT ASSISTANT")
        .addFields(
          { name: "❓ Question", value: questionRaw },
          { name: "⚖️ Result", value: aiReply.slice(0, 1024) }
        )
        .setFooter({ text: "KIRA-AI ON IG" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Groq Error:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ System error.");
      } else {
        await interaction.reply({
          content: "❌ System error.",
          flags: 64
        });
      }
    }
  }
};