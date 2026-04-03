const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = async (interaction) => {

  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "gang_select") return;

  const selectedGang = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`gang_request:${selectedGang}`)
    .setTitle("Gang Role Request");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("ingame_name")
        .setLabel("IN-GAME NAME")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  return interaction.showModal(modal);
};