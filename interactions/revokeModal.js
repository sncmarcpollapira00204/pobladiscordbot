const { EmbedBuilder } = require("discord.js");
const pool = require("../database");
const config = require("../config.json");

const cooldowns = new Map();
const COOLDOWN = 15000; // 15 seconds

module.exports = async (interaction) => {

  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith("revoke_modal:")) return;

  const userId = interaction.user.id;
  const now = Date.now();

  // ⏳ COOLDOWN
  const last = cooldowns.get(userId);
  if (last && now - last < COOLDOWN) {
    return interaction.reply({
      content: "⏳ Please wait before revoking again.",
      flags: 64
    });
  }
  cooldowns.set(userId, now);

  await interaction.deferReply({ flags: 64 });

  const targetId = interaction.customId.split(":")[1];
  const ingameName = interaction.fields.getTextInputValue("ingame_name").trim();
  const reason = interaction.fields.getTextInputValue("reason").trim();

  const requester = `<@${userId}>`;
  const target = `<@${targetId}>`;

  try {

    // 🔍 GET CURRENT VOUCHES
    const result = await pool.query(
      "SELECT vouchers FROM whitelist WHERE discord_id = $1",
      [targetId]
    );

    if (result.rows.length === 0) {
      return interaction.editReply("❌ User has no whitelist application.");
    }

    let vouchers = result.rows[0].vouchers || "None";

    let vouchList = vouchers === "None"
      ? []
      : vouchers.split(", ");

    // ❌ CHECK IF USER VOUCHED
    if (!vouchList.includes(requester)) {
      return interaction.editReply("❌ You have not vouched this user.");
    }

    // 🔥 REMOVE VOUCH
    vouchList = vouchList.filter(v => v !== requester);

    const newValue = vouchList.length
      ? vouchList.join(", ")
      : "None";

    // 💾 UPDATE DATABASE
    await pool.query(
      "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
      [newValue, targetId]
    );

    // 📦 EMBED LOG
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ VOUCH REVOKED")
      .addFields(
        { name: "DISCORD USER", value: requester, inline: true },
        { name: "REVOKED FROM", value: target, inline: true },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "REASON", value: reason }
      )
      .setFooter({ text: "Vouch System Log" })
      .setTimestamp();

    // 📍 SEND TO CONFIG CHANNEL
    const channel = await interaction.client.channels.fetch(
      config.revokeLogChannelId
    ).catch(() => null);

    if (channel) {
      await channel.send({ embeds: [embed] });
    } else {
      console.error("❌ Revoke log channel not found.");
    }

    return interaction.editReply("❌ Your vouch has been revoked.");

  } catch (err) {
    console.error("REVOKE ERROR:", err);
    return interaction.editReply("❌ Database error.");
  }
};