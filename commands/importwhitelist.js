const { SlashCommandBuilder } = require("discord.js");
const pool = require("../database");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("importwhitelist")
    .setDescription("Import old whitelist applications"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const channel = await interaction.client.channels.fetch(config.whitelistChannelId);

      let lastId;
      let imported = 0;

      while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (!messages.size) break;

        for (const msg of messages.values()) {

          if (!msg.embeds.length) continue;

          const embed = msg.embeds[0];
          const fields = embed.data.fields || [];

          // ✅ USER ID (STRONG)
          const userField = fields.find(f => f.value?.includes("<@"));
          const userMatch = userField?.value.match(/<@(\d+)>/);
          if (!userMatch) continue;

          const userId = userMatch[1];

          // ✅ CHARACTER NAME
          const charField = fields.find(f =>
            f.value?.toLowerCase().includes("character name")
          );

          const character =
            charField?.value.split("Character Name:")[1]?.split("\n")[0]?.trim() || "Unknown";

          // ✅ STEAM LINK
          const steamField = fields.find(f =>
            f.value?.includes("steamcommunity.com")
          );

          const steam =
            steamField?.value.match(/\((.*?)\)/)?.[1] || "Unknown";

          // ✅ VOUCHES
          const vouchField = fields.find(f =>
            f.name?.toUpperCase().includes("VOUCHED BY")
          );

          const vouchers = vouchField?.value || "None";

          // ✅ SAVE TO DB
          await pool.query(
            `INSERT INTO whitelist (discord_id, character_name, steam_profile, vouchers)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (discord_id)
             DO UPDATE SET
               character_name = EXCLUDED.character_name,
               steam_profile = EXCLUDED.steam_profile,
               vouchers = EXCLUDED.vouchers`,
            [userId, character, steam, vouchers]
          );

          imported++;
        }

        lastId = messages.last().id;
      }

      await interaction.editReply(`✅ Imported ${imported} applications.`);

    } catch (error) {
      console.error("IMPORT ERROR:", error);
      await interaction.editReply("❌ Import failed.");
    }
  }
};