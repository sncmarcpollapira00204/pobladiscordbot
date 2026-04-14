const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database");

/* SAFE REPLY */
const safeReply = async (interaction, content) => {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({ content });
    } else {
      return await interaction.reply({ content, flags: 64 });
    }
  } catch {}
};

/* ADMIN CHECK */
const isAdmin = async (interaction) => {
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  return config.adminRoleIds.some(id => member.roles.cache.has(id));
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const allowed = ["open_whitelist_modal", "vouch", "approve", "deny"];
  if (!allowed.includes(interaction.customId)) return;

  /* OPEN MODAL */
  if (interaction.customId === "open_whitelist_modal") {
    if (interaction.member.roles.cache.has(config.citizenRoleId)) {
      return safeReply(interaction, "❌ You are already a **CITIZEN**.");
    }

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
  if (!message.embeds.length) return;

  const embed = EmbedBuilder.from(message.embeds[0]);
  const desc = embed.data.description || "";

  // ✅ SAFE USER ID (NO MORE REGEX)
  const footer = embed.data.footer?.text;
  if (!footer || !footer.startsWith("UID:")) {
    return safeReply(interaction, "❌ Invalid application.");
  }
  const applicantId = footer.replace("UID:", "");

  const isPending = /PENDING/i.test(desc);

  /* ========================= VOUCH ========================= */
  if (interaction.customId === "vouch") {

    if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
      return safeReply(interaction, "❌ Only **Citizens** can vouch.");
    }

    if (!isPending) {
      return safeReply(interaction, "❌ Application is not pending.");
    }

    if (interaction.user.id === applicantId) {
      return safeReply(interaction, "❌ You cannot vouch yourself.");
    }

    let vouches = [];

    try {
      const res = await pool.query(
        "SELECT vouchers FROM whitelist WHERE discord_id = $1",
        [applicantId]
      );

      if (res.rows.length && res.rows[0].vouchers !== "None") {
        vouches = res.rows[0].vouchers.split(",");
      }
    } catch {}

    const userId = interaction.user.id;

    if (vouches.includes(userId)) {
      vouches = vouches.filter(id => id !== userId);
    } else {
      vouches.push(userId);
    }

    const dbValue = vouches.length ? vouches.join(",") : "None";

    await pool.query(
      "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
      [dbValue, applicantId]
    );

    const formatted = vouches.length
      ? vouches.map(id => `<@${id}>`).join(", ")
      : "None";

    embed.setDescription(
      desc.replace(
        /👥 \*\*VOUCHED BY:\*\*[\s\S]*?\n\n/,
        `👥 **VOUCHED BY:** ${formatted}\n\n`
      )
    );

    embed.setColor("#3498db");

    await message.edit({ embeds: [embed] });

    return safeReply(interaction, "✅ Vouch updated.");
  }

  /* ========================= APPROVE ========================= */
  if (interaction.customId === "approve") {

    if (!(await isAdmin(interaction))) {
      return safeReply(interaction, "❌ No permission.");
    }

    if (!isPending) {
      return safeReply(interaction, "❌ Already handled.");
    }

    await pool.query(
      "UPDATE whitelist SET status = 'approved' WHERE discord_id = $1",
      [applicantId]
    );

    embed.setDescription(
      desc.replace(
        /🟡 PENDING WHITELIST APPLICATION|🔵 PENDING ADMIN REVIEW/,
        `✅ APPROVED BY: ${interaction.user}`
      )
    );

    embed.setColor("#2ecc71");

    await message.edit({
      embeds: [embed],
      components: []
    });

    const member = await interaction.guild.members.fetch(applicantId).catch(() => null);

    if (member) {
      await member.roles.add(config.citizenRoleId).catch(() => {});
    }

    return safeReply(interaction, "✅ Approved.");
  }

  /* ========================= DENY ========================= */
  if (interaction.customId === "deny") {

    if (!(await isAdmin(interaction))) {
      return safeReply(interaction, "❌ No permission.");
    }

    const modal = new ModalBuilder()
      .setCustomId(`deny_reason_modal:${message.id}`)
      .setTitle("Deny Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }
};