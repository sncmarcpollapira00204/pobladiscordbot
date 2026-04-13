const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = () => {
  const modal = new ModalBuilder()
    .setCustomId("whitelist_submit")
    .setTitle("📄 Whitelist Application");

  const characterName = new TextInputBuilder()
    .setCustomId("character_name")
    .setLabel("Character Name")
    .setPlaceholder("Firstname Lastname") 
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const steamProfile = new TextInputBuilder()
    .setCustomId("steam_profile")
    .setLabel("Steam Profile URL")
    .setPlaceholder("https://steamcommunity.com/id/yourname")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(characterName),
    new ActionRowBuilder().addComponents(steamProfile)
  );

  return modal;
};
