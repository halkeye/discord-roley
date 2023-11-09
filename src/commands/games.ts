import {
  CommandInteraction,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,

  Routes,
  REST,
  RESTGetAPIUserResult,
  RESTGetAPIGuildMemberResult,
  GuildMemberRoleManager,
  ComponentType
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('games')
  .setDescription('Pick which games you are interested in playing with others');

export async function execute(interaction: CommandInteraction, rest: REST) {
  if (!interaction.guildId) {
    throw new Error('no guild id')
  }

  const myRoles = interaction.member?.roles instanceof GuildMemberRoleManager ?
    interaction.member?.roles.cache.map(role => role.id) : interaction.member?.roles;

  const allRoles = (await interaction.guild?.roles.fetch())?.filter(role => {
    if (role.tags?.botId) {
      return false; // is a special bot one
      console.log('role.mention', role.name, role.mentionable);
    }
    if (!role.mentionable) {
      return false; // isn't mentionable
    }
    return true;
  });

  if (!allRoles?.size) {
    throw new Error('no roles defined for guild')
  }

  // FIXME - eww, make this some sort of database.
  const botMe = await rest.get(Routes.user('@me')) as RESTGetAPIUserResult;
  const guildMe = await rest.get(Routes.guildMember(interaction.guildId, botMe.id)) as RESTGetAPIGuildMemberResult;

  const possibleRoles = guildMe.roles.map(role => allRoles.get(role)).filter(Boolean);
  if (!possibleRoles) {
    throw new Error('Im not in any roles');
  }

  const buttons = Array<ButtonBuilder>();
  const options = Array<StringSelectMenuOptionBuilder>();

  for (const role of possibleRoles.filter(Boolean)) {
    if (!role) { continue; }
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`role_${role.id}`)
        .setLabel(role.name?.split('|')?.shift() || 'Role')
        .setStyle(myRoles?.includes(role.id) ? ButtonStyle.Danger : ButtonStyle.Primary)
    );
    options.push(new StringSelectMenuOptionBuilder()
      .setLabel(`${role.name?.split('|')?.shift() || 'Role'}`)
      .setValue(`${role.id}`)
      .setDefault(myRoles?.includes(role?.id))
    )
  }

  const options2 = Array<StringSelectMenuOptionBuilder>();
  Array(25).fill(0).forEach((_, idx) => {
    options2.push(new StringSelectMenuOptionBuilder()
      .setLabel(`Role ${idx}}`)
      .setValue(`${idx}`)
    )
  })

  const options3 = Array<StringSelectMenuOptionBuilder>();
  Array(25).fill(0).forEach((_, idx) => {
    options3.push(new StringSelectMenuOptionBuilder()
      .setLabel(`3-Role ${idx}}`)
      .setValue(`3-${idx}`)
    )
  })

  // interaction.user is the object representing the User who ran the command
  // interaction.member is the GuildMember object, which represents the user in the specific guild

  const response = await interaction.reply({
    content: `What games are you interested in being pinged about?`,
    ephemeral: true,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('Make a selection!')
        .addOptions(...options)),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId('options2')
        .setPlaceholder('Make a selection!')
        .addOptions(...options2)),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId('options3')
        .setPlaceholder('Make a selection!')
        .addOptions(...options3)),
    ],
  })

  const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

  collector.on('collect', async i => {
    console.log(i);
    await i.reply(`${i.user} has selected ${i.values}!`);
  });

  // interaction.editReply({
  //   components
}
