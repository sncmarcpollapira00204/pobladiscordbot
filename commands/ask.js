const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Groq = require("groq-sdk");
const rules = require("../data/serverRules");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cooldown = new Map();

// 🔧 normalize text
const clean = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, "");

// 🔧 basic keywords (extend anytime)
const KEYWORDS = [
  "vdm", "rdm", "rob", "kidnap", "hostage",
  "highground", "traphouse", "raid", "scam"
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

      // 🔍 MATCHING (accurate + tolerant)
      const lines = rules.split("\n");
      const words = question.split(" ").filter(Boolean);

      const matched = lines.filter(line => {
        const lower = clean(line);

        return (
          // keyword boost
          KEYWORDS.some(k =>
            question.includes(k) && lower.includes(k)
          ) ||
          // word match + plural tolerance
          words.some(word =>
            lower.includes(word) ||
            lower.includes(word.replace(/s$/, ""))
          )
        );
      });

      // 🔥 context (STRICT but safe fallback)
      const context =
        matched.length > 0
          ? matched.slice(0, 20).join("\n")
          : ""; // IMPORTANT: empty = forces DEPENDE

      // 🧠 PERFECT ACCURACY PROMPT
      const prompt = `
      you can answer everything using your brain
      answer everything questions

Question:
${questionRaw}
`;

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a strict rule-only judge." },
          { role: "user", content: prompt }
        ],
        temperature: 0, // 🔥 removes creativity (important)
        max_tokens: 300
      });

      let aiReply =
        completion.choices?.[0]?.message?.content || "";

      // 🔥 FAILSAFE (NO BLANK EVER)
      if (!aiReply || aiReply.trim() === "") {
        aiReply = "Verdict: DEPENDE\nBasis:\n- No exact matching rule found.";
      }

      // 🧱 EMBED OUTPUT
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📜 Server Rule Verdict")
        .addFields(
          { name: "❓ Question", value: questionRaw },
          { name: "⚖️ Result", value: aiReply.slice(0, 1024) }
        )
        .setFooter({ text: "Accurate Rule System • No Guessing" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Groq Error:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "❌ System error. Please try again."
        );
      } else {
        await interaction.reply({
          content: "❌ System error. Please try again.",
          flags: 64
        });
      }
    }
  }
};