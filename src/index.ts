import { Client, Events, GatewayIntentBits, Collection, REST } from 'discord.js';
import path from 'path';
import { globSync } from 'glob'
import { fileURLToPath } from 'url';
import { Command } from './types.js';

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_BOT_SECRET);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection<string, Command>()

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, async c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
})

const loadCommands = async () => {
  for (const filePath of globSync('./commands/**/*.{js,ts}', { cwd: __dirname })) {
    console.log(filePath);
    const command = await import(`./${filePath}`);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, rest);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

loadCommands().then(() => {
  // Log in to Discord with your client's token
  client.login(process.env.DISCORD_BOT_SECRET);
});

console.log(`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=268435456&scope=bot%20applications.commands`);
