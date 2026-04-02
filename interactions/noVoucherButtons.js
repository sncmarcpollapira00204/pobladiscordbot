const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const config = require("../config.json");

const cooldowns = new Map();
const COOLDOWN_TIME = 60 * 1000; // 1 minute

/* SAFE REPLY */
const safeReply = async (interaction, content) => {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply({ content });
    } else {
      return await interaction.reply({ content, flags: 64 });
    }
  } catch (err) {
    console.error("Reply failed:", err);
  }
};

/* ADMIN CHECK */
const isAdmin = async (interaction) => {
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  return member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

module.exports = async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    /* =========================
       OPEN MODAL
    ========================= */
    if (interaction.customId === "no_voucher_apply") {

      // ❌ BLOCK IF ALREADY CITIZEN
      if (interaction.member.roles.cache.has(config.citizenRoleId)) {
        return interaction.reply({
          content: "❌ You are already a **CITIZEN**.",
          flags: 64
        });
      }

      // ✅ COOLDOWN HERE
      const userId = interaction.user.id;
      const now = Date.now();

      const lastUsed = cooldowns.get(userId);

      if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
        return interaction.reply({
          content: `⏳ Wait ${remaining}s before applying again.`,
          flags: 64
        });
      }

      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME);

      // 👇 THEN your modal code continues
      const modal = new ModalBuilder()
        .setCustomId("no_voucher_modal")
        .setTitle("No Voucher Application");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("character_name")
          .setLabel("In-Game Name")
          .setPlaceholder("Firstname_Lastname")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("steam_link")
            .setLabel("Steam Link")
            .setPlaceholder("https://steamcommunity.com/id/username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    const message = interaction.message;
    if (!message.embeds.length) return;

    const embed = EmbedBuilder.from(message.embeds[0]);
    const fields = embed.data.fields || [];

    if (!fields.length) {
      return safeReply(interaction, "❌ Invalid application embed.");
    }

    const statusField = fields.find(f => f.name === "STATUS");

    if (!statusField) {
      return safeReply(interaction, "❌ Status not found.");
    }

    /* =========================
       INTERVIEWED (FINAL ACTION)
    ========================= */
    if (interaction.customId === "no_voucher_interviewed") {

      if (!(await isAdmin(interaction))) {
        return safeReply(interaction, "❌ No permission.");
      }

      if (!statusField.value.includes("PENDING")) {
        return safeReply(interaction, "❌ Already processed.");
      }

      const footer = embed.data.footer?.text;
      const userId = footer?.replace("UID:", "");

      if (!userId) {
        return safeReply(interaction, "❌ User not found.");
      }

      const nameField = fields.find(f => f.name === "IN-GAME NAME");
      const characterName = nameField?.value || "Citizen";

      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member) {
        return safeReply(interaction, "❌ User not in server.");
      }

      // ✅ ROLE
      await member.roles.add(config.citizenRoleId).catch(() => {});

      // ✅ NICKNAME
      try {
        await member.setNickname(characterName.slice(0, 32));
      } catch {}

      // ✅ UPDATE EMBED
      statusField.value = "🔵 INTERVIEWED";

      embed.addFields({
        name: "INTERVIEWED BY",
        value: `${interaction.user}`
      });

      await message.edit({
        embeds: [embed],
        components: []
      });

      return safeReply(interaction, "✅ Interview complete. Role + nickname updated.");
    }

    /* =========================
       DENY
    ========================= */
    if (interaction.customId === "no_voucher_deny") {

      if (!(await isAdmin(interaction))) {
        return safeReply(interaction, "❌ No permission.");
      }

      if (!statusField.value.includes("PENDING")) {
        return safeReply(interaction, "❌ Already processed.");
      }

      statusField.value = "❌ DENIED";

      embed.addFields({
        name: "DENIED BY",
        value: `${interaction.user}`
      });

      await message.edit({
        embeds: [embed],
        components: []
      });

      return safeReply(interaction, "❌ Application denied.");
    }

  } catch (err) {
    console.error("NoVoucher Button Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Something went wrong.",
        flags: 64
      }).catch(() => {});
    }
  }
};