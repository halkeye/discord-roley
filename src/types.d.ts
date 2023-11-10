import { SlashCommandBuilder, CommandInteraction, Collection, PermissionResolvable, Message, AutocompleteInteraction, ChatInputCommandInteraction, REST } from "discord.js"

export interface Command {
  name: string,
  execute: (interaction: CommandInteraction) => Promise<void>,
  permissions: Array<PermissionResolvable>,
  aliases: Array<string>,
  cooldown?: number,
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_APP_ID: string,
      DISCORD_PUBLIC_KEY: string,
      DISCORD_CLIENT_ID: string,
      DISCORD_CLIENT_SECRET: string,
      DISCORD_BOT_SECRET: string
    }
  }
}

declare module "discord.js" {
  export interface Client {
      commands: Collection<string, Command>,
      cooldowns: Collection<string, number>
  }
}
