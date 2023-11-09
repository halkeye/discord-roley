import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Routes
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('games')
  .setDescription('Pick which games you are interested in playing with others');

export async function execute (interaction, rest) {
  const target = interaction.options.getUser('target');
  // const guild = await client.guilds.cache.get(server_id);

  const buttons = [];

  console.log('interaction', Object.keys(interaction));
  console.log('interaction.options', Object.keys(interaction.options));
  console.log('rest', Object.keys(rest));
  // console.log('target', Object.keys(target));

  for (const role of ['foo', 'bar']) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`role_${role}`)
        .setLabel(role)
        .setStyle(ButtonStyle.Primary)
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('starter')
    .setPlaceholder('Make a selection!')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Bulbasaur')
        .setDescription('The dual-type Grass/Poison Seed Pokémon.')
        .setValue('bulbasaur'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Charmander')
        .setDescription('The Fire-type Lizard Pokémon.')
        .setValue('charmander'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Squirtle')
        .setDescription('The Water-type Tiny Turtle Pokémon.')
        .setValue('squirtle')
    );

  // interaction.user is the object representing the User who ran the command
  // interaction.member is the GuildMember object, which represents the user in the specific guild

  await interaction.reply({
    content: `Are you sure you want to ban ${target} for reason:?`,
    ephemeral: true,
    components: [
      new ActionRowBuilder().addComponents(...buttons),
      new ActionRowBuilder().addComponents(select)
    ]
  });
}
