const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");

/* FORMAT VOUCHES */
function formatVouches(vouches) {
  if (!vouches.length) return "None";

  let result = "";
  for (let i = 0; i < vouches.length; i++) {
    if (i % 2 === 0) {
      result += vouches[i];
    } else {
      result += " , " + vouches[i] + "\n";
    }
  }

  return result.trim();
}

/* SAFE REPLY */
const safeReply = async (interaction, content) => {
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ content });
  } else {
    return interaction.reply({ content, flags: 64 });
  }
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const message = interaction.message;
  if (!message.embeds.length) return;

  const embed = EmbedBuilder.from(message.embeds[0]);
  let desc = embed.data.description;

  /* =========================
     VOUCH
  ========================= */
  if (interaction.customId === "vouch") {

    const userMatch = desc.match(/<@(\d+)>/);
    if (!userMatch) return safeReply(interaction, "❌ User not found.");

    const userId = userMatch[1];

    let vouches = [];
    const match = desc.match(/👥 VOUCHED BY: ([\s\S]*)/);

    if (match && match[1] !== "None") {
      vouches = match[1].split(/,\s|\n/).filter(v => v);
    }

    const voucher = `<@${interaction.user.id}>`;

    if (vouches.includes(voucher)) {
      vouches = vouches.filter(v => v !== voucher);
    } else {
      vouches.push(voucher);
    }

    const formatted = formatVouches(vouches);

    desc = desc.replace(
      /👥 VOUCHED BY: ([\s\S]*)/,
      `👥 VOUCHED BY: ${formatted}\n\n🔵 PENDING ADMIN REVIEW`
    );

    embed.setDescription(desc);

    await message.edit({ embeds: [embed] });

    return safeReply(interaction, "✅ Vouch updated.");
  }

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    desc = desc.replace(
      "🔵 PENDING ADMIN REVIEW",
      `✅ APPROVED BY: ${interaction.user}`
    );

    embed.setDescription(desc);

    await message.edit({
      embeds: [embed],
      components: []
    });

    return safeReply(interaction, "✅ Approved.");
  }

  /* =========================
     DENY
  ========================= */
  if (interaction.customId === "deny") {

    const modal = new ModalBuilder()
      .setCustomId(`deny_modal:${message.id}`)
      .setTitle("Deny Reason");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }
};