const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");

/* CHECK CITIZEN */
const isCitizen = (interaction) => {
  return interaction.member.roles.cache.has(config.citizenRoleId);
};

/* CHECK ADMIN */
const isAdmin = (interaction) => {
  return interaction.member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

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

  /* =========================
     OPEN MODAL (PANEL)
  ========================= */
  if (interaction.customId === "open_whitelist_modal") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_submit")
      .setTitle("📄 Whitelist Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("character_name")
          .setLabel("Character Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("steam_profile")
          .setLabel("Steam Profile URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  const message = interaction.message;

  if (!message.embeds.length) {
    return safeReply(interaction, "❌ Invalid application embed.");
  }

  const embed = EmbedBuilder.from(message.embeds[0]);
  let desc = embed.data.description || "";

/* =========================
   VOUCH
========================= */
if (interaction.customId === "vouch") {

  if (!isCitizen(interaction)) {
    return safeReply(interaction, "❌ Only **Citizens** can vouch.");
  }

  if (!desc.includes("NEW WHITELIST APPLICATION")) {
    return safeReply(interaction, "❌ This is not an application.");
  }

  const userMatch = desc.match(/<@(\d+)>/);
  if (!userMatch) return safeReply(interaction, "❌ User not found.");

  const applicantId = userMatch[1];

  if (interaction.user.id === applicantId) {
    return safeReply(interaction, "❌ You cannot vouch yourself.");
  }

  // 📌 EXTRACT DATA (para stable layout)
  const nameMatch = desc.match(/IN-GAME NAME: (.*)/);
  const steamMatch = desc.match(/STEAM LINK: (.*)/);
  const ageMatch = desc.match(/ACCOUNT AGE: (.*)/);

  const characterName = nameMatch ? nameMatch[1] : "Unknown";
  const steam = steamMatch ? steamMatch[1] : "Unknown";
  const accountAge = ageMatch ? ageMatch[1] : "Unknown";

  // 📌 GET VOUCHES
  let vouches = [];
  const match = desc.match(/👥 VOUCHED BY: (.*)/);

  if (match && match[1] !== "None") {
    vouches = match[1].split(/,\s|\n/).filter(v => v);
  }

  const voucher = `<@${interaction.user.id}>`;

  let action;

  // 🔁 TOGGLE
  if (vouches.includes(voucher)) {
    vouches = vouches.filter(v => v !== voucher);
    action = "removed";
  } else {
    vouches.push(voucher);
    action = "added";
  }

  const formatted = formatVouches(vouches);

// 🔥 REBUILD DESCRIPTION (NO MORE SPACING BUGS)
  const newDesc = 
`NEW WHITELIST APPLICATION

👤 APPLICANT INFORMATION:
DISCORD USER: <@${applicantId}>
ACCOUNT AGE: ${accountAge}

🎭 CHARACTER DETAILS:
IN-GAME NAME: ${characterName}
STEAM LINK: ${steam}

👥 VOUCHED BY: ${formatted}

${vouches.length ? "🔵 PENDING ADMIN REVIEW" : "🟡 PENDING WHITELIST APPLICATION"}`;

  embed.setDescription(newDesc);

  await message.edit({ embeds: [embed] });

  return safeReply(
    interaction,
    action === "added" ? "✅ Vouch added." : "❌ Vouch removed."
  );
}

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    if (!isAdmin(interaction)) {
      return safeReply(interaction, "❌ Only **Admins** can approve.");
    }

    if (!desc.includes("NEW WHITELIST APPLICATION")) {
      return safeReply(interaction, "❌ This is not an application.");
    }

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

    if (!isAdmin(interaction)) {
      return safeReply(interaction, "❌ Only **Admins** can deny.");
    }

    if (!desc.includes("NEW WHITELIST APPLICATION")) {
      return safeReply(interaction, "❌ This is not an application.");
    }

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