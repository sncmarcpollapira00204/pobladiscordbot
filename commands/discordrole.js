const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Shows all server role IDs'),

  async execute(interaction) {

    await interaction.deferReply(); // public reply

    const rolesArray = interaction.guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(role => `${role.name} : ${role.id}`);

    if (!rolesArray.length) {
      return interaction.editReply("No roles found.");
    }

    const rolesText = rolesArray.join('\n');

    const chunkSize = 1800;
    const chunks = [];

    for (let i = 0; i < rolesText.length; i += chunkSize) {
      chunks.push(rolesText.slice(i, i + chunkSize));
    }

    await interaction.editReply({
      content: `\`\`\`\n${chunks[0]}\n\`\`\``
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: `\`\`\`\n${chunks[i]}\n\`\`\``
      });
    }
  },
};