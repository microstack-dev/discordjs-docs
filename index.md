# Discord.js Documentation

Complete documentation handbook for Discord.js v14.25.1

## 📚 Sections

- [Getting Started](/getting-started/introduction) - Learn the basics and set up your first bot
- [Core Concepts](/core-concepts/client-lifecycle) - Understand fundamental Discord.js concepts
- [Builders](/builders/overview) - Master the builder pattern for safe API interactions

## 🎯 Focus

This documentation focuses on **Discord.js v14.25.1** with modern patterns:

- Slash commands first
- Builders over raw JSON
- `async/await` only
- Clean, maintainable code

## 🚀 Quick Start

```bash
npm install discord.js@14.25.1
```

```js
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js'

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  
  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!')
  }
})

await client.login('YOUR_TOKEN')
```