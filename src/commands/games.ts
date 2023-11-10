import {
  CommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  GuildMemberRoleManager,
  ComponentType,
  Collection,
  Role,
  Client,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction
} from 'discord.js';

class Category {
  name: string = ""

  constructor(data = {name: ""}) {
    this.name = data.name;
  }

  get id() {
    return this.name.toLowerCase();
  }
}

export const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Manage which roles you want')
  // .addSubcommand(subcommand => subcommand.setName('list')
  //   .setDescription('List which categories are available'))
  // .addSubcommand(subcommand => subcommand.setName('manage')
  //   .setDescription('List which categories are available')
  //   .addUserOption(option => option.setName('category')
  //   .setDescription('Which category')))

async function getRoles(interaction: CommandInteraction): Promise<{
  rolesByCategory: Collection<string, Role[]>,
  allCategories: Array<Category>,
}> {
  const rolesByCategory = new Collection<string, Role[]>();
  const allCategories = new Array<Category>();

  const sortedRoles = await interaction.guild?.roles.fetch()
  .then(roles => roles.values())
  .then(roles => Array.from(roles).sort((role1, role2) => {
    return role2.position-role1.position;
  })) || [];

  let currentCategory: Category | undefined = undefined;
  for (const role of sortedRoles) {
    if (role.name.startsWith('{')) {
      try {
        currentCategory = new Category(JSON.parse(role.name));
        rolesByCategory.set(currentCategory.id, []);
        allCategories.push(currentCategory);
        continue;
      } catch (err) {
        console.error("unable to parse role/category", err);
        continue;
      }
    }
    if (!currentCategory) {
      continue;
    }
    rolesByCategory.ensure(currentCategory.id, () => new Array<Role>()).push(role);
  }

  return { rolesByCategory, allCategories };
}

export async function execute(interaction: CommandInteraction, client: Client) {
  if (!interaction.guildId) {
    throw new Error('no guild id')
  }

  const { rolesByCategory, allCategories } = await getRoles(interaction);

  if (!allCategories.length) {
    return await interaction.reply({
      content: `No categories`,
      ephemeral: true,
    });
  }

  // Add inputs to the modal
  const response = await interaction.reply({
    content: "Select category of roles you are interested in.",
    ephemeral: true,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...allCategories.map(category => new ButtonBuilder()
          .setCustomId(`category_${category.id}`)
          .setLabel(category.name)
          .setStyle(ButtonStyle.Primary)
        )
      )
    ]
  });

  const confirmation = await response.awaitMessageComponent({
    filter: i => i.user.id === interaction.user.id,
    componentType: ComponentType.Button,
    time: 86400,
  }).catch(e => {
    console.error('error waiting for response', e);
    return null;
  });


  if (!confirmation) {
    await interaction.editReply({ content: 'Confirmation not received within 1 day, cancelling', components: [] });
    return;
  }

  const category = allCategories.find(category => category.id === confirmation.customId.replace(/^category_/, ''));
  if (!category) {
    throw new Error(`That category doesnt exist`);
  }

  const allRoles = rolesByCategory.get(category.id) as Array<Role>;

  if (!allRoles.length) {
    throw new Error(`No roles for category ${category.name}`);
  }

  if (!interaction.guild) {
    throw new Error(`Can't find guild`);
  }

  const member = interaction.guild.members.cache.get(interaction.member?.user?.id as string);
  if (!member) {
    throw new Error("Can't find you. Try again later");
  }

  const myRoles = new Set(member.roles.cache.map(role => role.id))

  await interaction.deleteReply();

  const rolesResponse = await interaction.followUp({
    content: `Which roles inside of ${category.name}`,
    ephemeral: true,
    fetchReply: true,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId('role_selection')
        .setPlaceholder('Make a selection!')
        .setMaxValues(allRoles.length)
        .addOptions(...allRoles.map(role => {
          return new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.id)
            .setDefault(myRoles.has(role.id))
        })))
    ],
  })

  const collector = rolesResponse.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1,
    maxUsers: 1,
    time: 3_600_000
  });

  collector.on('collect', async (i: StringSelectMenuInteraction) => {
    const newRoles = new Set(i.values);

    for (const roleId of newRoles) {
      if (!myRoles.has(roleId)) {
        await member.roles.add(roleId)
      }
      myRoles.delete(roleId);
    }
    for (const roleId of myRoles) {
      // confirm its one of the roles we manage
      if (allRoles.find(role => role.id === roleId)) {
        await member.roles.remove(roleId)
      }
    }
  });

  collector.on('end', async () => {
    await interaction.deleteReply(rolesResponse.id);
  });
}
