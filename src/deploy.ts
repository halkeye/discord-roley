import { REST, Routes } from 'discord.js';
import path from 'path';
import { globSync } from 'glob'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_BOT_SECRET);

// and deploy your commands!
(async () => {
  const commands = [];

  for (const filePath of globSync('./commands/**/*.{js,ts}', { cwd: __dirname })) {
    console.log(filePath);
    const command = await import(`./${filePath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APP_ID),
      { body: commands }
    ) as any;

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
