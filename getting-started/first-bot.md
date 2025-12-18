# First Bot

Create your first functional Discord bot with slash commands using Discord.js v14.25.1.

## Basic Bot Structure

Create `src/index.js`:
```js
import { Client, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)
```

## Slash Command Setup

Create `src/commands/ping.js`:
```js
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')

export async function execute(interaction) {
  await interaction.reply('Pong!')
}
```

## Command Handler

Create `src/handlers/interactionCreate.js`:
```js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function handleInteractionCreate(interaction) {
  if (!interaction.isChatInputCommand()) return

  const commandPath = path.join(__dirname, '../commands')
  const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'))
  
  for (const file of commandFiles) {
    const filePath = path.join(commandPath, file)
    const command = await import(filePath)
    
    if (interaction.commandName === command.data.name) {
      await command.execute(interaction)
      break
    }
  }
}
```

## Register Commands

Create `src/deploy-commands.js`:
```js
import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
    .toJSON(),
  
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Displays server information')
    .toJSON()
]

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

try {
  console.log('Started refreshing application (/) commands.')
  
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  )
  
  console.log('Successfully reloaded application (/) commands.')
} catch (error) {
  console.error(error)
}
```

## Complete Bot Example

Update `src/index.js`:
```js
import { Client, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'
import { handleInteractionCreate } from './handlers/interactionCreate.js'

dotenv.config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('interactionCreate', handleInteractionCreate)

client.login(process.env.DISCORD_TOKEN)
```

## Additional Commands

Create `src/commands/server.js`:
```js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Displays server information')

export async function execute(interaction) {
  const guild = interaction.guild
  
  const embed = new EmbedBuilder()
    .setTitle(`Server Information: ${guild.name}`)
    .addFields(
      { name: 'Server ID', value: guild.id },
      { name: 'Created', value: guild.createdAt.toDateString() },
      { name: 'Members', value: `${guild.memberCount}` },
      { name: 'Owner', value: `<@${guild.ownerId}>` }
    )
    .setThumbnail(guild.iconURL())
    .setColor('Blue')
  
  await interaction.reply({ embeds: [embed] })
}
```

## Environment Variables

Update your `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

Find your Client ID in the Discord Developer Portal under **"General Information"**.

## Running Your Bot

1. Deploy commands:
   ```bash
   node src/deploy-commands.js
   ```

2. Start your bot:
   ```bash
   node src/index.js
   ```

3. Test commands in Discord:
   - `/ping` - Should reply with "Pong!"
   - `/server` - Should display server information

## Error Handling

Add basic error handling to your bot:
```js
client.on('error', (error) => {
  console.error('Discord client error:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
})
```

## Next Steps

Your first bot is now running! Continue to [Core Concepts](/core-concepts/client-lifecycle) to understand how Discord.js works under the hood.