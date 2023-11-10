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
  ButtonStyle
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

function buildReply(category: Category, allRoles: Array<Role>, myRoles: Set<string>) {
  const options = Array<StringSelectMenuOptionBuilder>();

  for (const role of allRoles) {
    if (!role) { continue; }
    options.push(new StringSelectMenuOptionBuilder()
      .setLabel(role.name)
      .setValue(role.id)
      .setDefault(myRoles.has(role.id))
    )
  }

  // interaction.user is the object representing the User who ran the command
  // interaction.member is the GuildMember object, which represents the user in the specific guild

  return {
    content: `What games are you interested in being pinged about?`,
    ephemeral: true,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('Make a selection!')
        .setMaxValues(options.length)
        .addOptions(...options)),
    ],
  }
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
  let response = await interaction.reply({
    content: "Select category of roles you are interested in.",
    ephemeral: true,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...allCategories.map(category => new ButtonBuilder()
          .setCustomId(`role_${category.id}`)
          .setLabel(category.name)
          .setStyle(ButtonStyle.Primary)
        )
      )
    ]
  });

  try {
    const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 86400 });
  } catch (e) {
    await interaction.editReply({ content: 'Confirmation not received within 1 day, cancelling', components: [] });
  }

  return;

  // const category = new Category({ name: "games" });

  // const allRoles = await getRoles(interaction, interaction.guildId, category.id);

  // if (!allRoles.length) {
  //   return await interaction.reply({
  //     content: `No roles for category ${category.name}`,
  //     ephemeral: true,
  //   });
  // }

  // let myRoles = new Set((interaction.member?.roles instanceof GuildMemberRoleManager ?
  // interaction.member?.roles.cache.map(role => role.id) : interaction.member?.roles) || []);

  // const response = await interaction.reply(buildReply(category, allRoles, myRoles))

  // const collector = response.createMessageComponentCollector({
  //   componentType: ComponentType.StringSelect,
  //   time: 3_600_000
  // });

  // collector.on('collect', async (i: StringSelectMenuInteraction) => {
  //   let guild = await client.guilds.fetch(interaction.guildId as string)
  //   let member = guild.members.cache.get(interaction.member?.user?.id as string);
  //   if (!member) {
  //     return;
  //   }

  //   for (const roleId of i.values) {
  //     if (myRoles.has(roleId)) {
  //       member.roles.add(roleId)
  //     } else {
  //       myRoles.delete(roleId)
  //       member.roles.remove(roleId)
  //     }
  //   }
  //   console.log(i);

  //   interaction.editReply({ content: "Thanks. All Done" })
  // });
}
