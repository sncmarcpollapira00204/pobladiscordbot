const pool = require("./database");

module.exports = async (message) => {
  try {
    if (!message.embeds.length) return;

    const embed = message.embeds[0];
    const desc = embed.data.description || "";

    // USER ID
    const userMatch = desc.match(/<@(\d+)>/);
    if (!userMatch) return;

    const userId = userMatch[1];

    // CHARACTER NAME
    const nameMatch = desc.match(/IN-GAME NAME: (.*)/);
    const character = nameMatch ? nameMatch[1] : "Unknown";

    // STEAM LINK
    const steamMatch = desc.match(/\((https:\/\/steamcommunity\.com\/.*?)\)/);
    const steam = steamMatch ? steamMatch[1] : "Unknown";

    // VOUCHES
    const vouchMatch = desc.match(/👥 VOUCHED BY: ([\s\S]*?)\n\n/);
    let vouchers = "None";

    if (vouchMatch && vouchMatch[1].trim() !== "None") {
      vouchers = vouchMatch[1].trim();
    }

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