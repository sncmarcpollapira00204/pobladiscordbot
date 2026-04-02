const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("revokevouch")
    .setDescription("Revoke your vouch from a user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User you vouched for")
        .setRequired(true)
    ),

  async execute(interaction) {

    const target = interaction.options.getUser("user");

    if (!target) {
      return interaction.reply({
        content: "❌ Invalid user.",
        flags: 64
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot revoke yourself.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`revoke_modal:${target.id}`)
      .setTitle("Revoke Vouch");

    const nameInput = new TextInputBuilder()
      .setCustomId("ingame_name")
      .setLabel("Your In-Game Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason for revoking")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }
};