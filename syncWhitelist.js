const pool = require("./database");

module.exports = async (message) => {
  try {
    if (!message.embeds.length) return;

    const embed = message.embeds[0];
    const fields = embed.data.fields || [];

    const userField = fields.find(f => f.value?.includes("<@"));
    const match = userField?.value.match(/<@(\d+)>/);

    if (!match) return;

    const userId = match[1];

    const charField = fields.find(f =>
      f.value?.toLowerCase().includes("character name")
    );

    const character =
      charField?.value.split("Character Name:")[1]?.split("\n")[0]?.trim() || "Unknown";

    const steamField = fields.find(f =>
      f.value?.includes("steamcommunity.com")
    );

    const steam =
      steamField?.value.match(/\((.*?)\)/)?.[1] || "Unknown";

    const vouchField = fields.find(f =>
      f.name?.toUpperCase().includes("VOUCHED BY")
    );

    const vouchers = vouchField?.value || "None";

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

  } catch (err) {
    console.error("SYNC ERROR:", err);
  }
};