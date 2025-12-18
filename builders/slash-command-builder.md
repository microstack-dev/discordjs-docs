# SlashCommandBuilder

Create slash commands with type-safe options and validation.

## Overview

`SlashCommandBuilder` constructs Discord slash commands with proper validation, type checking, and API compliance. It's the primary way to define command structure in Discord.js v14.25.1.

## Basic Example

```js
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')

export async function execute(interaction) {
  await interaction.reply('Pong!')
}
```

## Advanced Usage

### Multiple Options
```js
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Get information about a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to get info about')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('detailed')
      .setDescription('Show detailed information')
      .setRequired(false)
  )

export async function execute(interaction) {
  const user = interaction.options.getUser('user') || interaction.user
  const detailed = interaction.options.getBoolean('detailed') ?? false
  
  let response = `User: ${user.tag}\nID: ${user.id}`
  
  if (detailed) {
    response += `\nCreated: ${user.createdAt.toDateString()}`
    response += `\nBot: ${user.bot ? 'Yes' : 'No'}`
  }
  
  await interaction.reply(response)
}
```

### Subcommands
```js
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure bot settings')
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Set a configuration value')
      .addStringOption(option =>
        option
          .setName('key')
          .setDescription('Configuration key')
          .setRequired(true)
          .addChoices(
            { name: 'Prefix', value: 'prefix' },
            { name: 'Language', value: 'language' },
            { name: 'Welcome Channel', value: 'welcome_channel' }
          )
      )
      .addStringOption(option =>
        option
          .setName('value')
          .setDescription('Configuration value')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('get')
      .setDescription('Get a configuration value')
      .addStringOption(option =>
        option
          .setName('key')
          .setDescription('Configuration key')
          .setRequired(true)
      )
  )
```

## Option Types

### String Options
```js
.addStringOption(option =>
  option
    .setName('message')
    .setDescription('Message to send')
    .setRequired(true)
    .setMaxLength(1000)
    .setMinLength(1)
    .addChoices(
      { name: 'Hello', value: 'hello' },
      { name: 'Goodbye', value: 'goodbye' }
    )
)
```

### Integer Options
```js
.addIntegerOption(option =>
  option
    .setName('amount')
    .setDescription('Amount to process')
    .setRequired(false)
    .setMinValue(1)
    .setMaxValue(100)
)
```

### Boolean Options
```js
.addBooleanOption(option =>
  option
    .setName('public')
    .setDescription('Make response public')
    .setRequired(false)
)
```

### User Options
```js
.addUserOption(option =>
  option
    .setName('target')
    .setDescription('Target user')
    .setRequired(false)
)
```

### Channel Options
```js
.addChannelOption(option =>
  option
    .setName('channel')
    .setDescription('Target channel')
    .setRequired(false)
    .addChannelTypes(
      ChannelType.GuildText,
      ChannelType.GuildVoice
    )
)
```

### Role Options
```js
.addRoleOption(option =>
  option
    .setName('role')
    .setDescription('Target role')
    .setRequired(false)
)
```

### Mentionable Options
```js
.addMentionableOption(option =>
  option
    .setName('target')
    .setDescription('User or role to target')
    .setRequired(false)
)
```

### Attachment Options
```js
.addAttachmentOption(option =>
  option
    .setName('file')
    .setDescription('File to process')
    .setRequired(false)
)
```

## Limits and Constraints

### Command Limits
- **Name**: 1-32 characters, lowercase, alphanumeric, hyphens
- **Description**: 1-100 characters
- **Options**: Maximum 25 options
- **Subcommands**: Maximum 25 subcommands or subcommand groups

### Option Limits
- **Name**: 1-32 characters, lowercase, alphanumeric, hyphens
- **Description**: 1-100 characters
- **Choices**: Maximum 25 choices per option
- **String Length**: Max 6000 characters

### Validation Examples
```js
// Valid command
const validCommand = new SlashCommandBuilder()
  .setName('valid-command')
  .setDescription('A valid command')

// Invalid: Name too long
const invalidCommand = new SlashCommandBuilder()
  .setName('this-name-is-way-too-long-and-exceeds-the-limit')
  .setDescription('This will throw an error')
```

## Best Practices

### Descriptive Names and Descriptions
```js
// Good
const goodCommand = new SlashCommandBuilder()
  .setName('ban-user')
  .setDescription('Ban a user from the server')

// Avoid
const badCommand = new SlashCommandBuilder()
  .setName('bu')
  .setDescription('Ban')
```

### Required vs Optional Options
```js
// Good: Clear required options
.addStringOption(option =>
  option
    .setName('reason')
    .setDescription('Reason for the ban')
    .setRequired(true)
)
.addIntegerOption(option =>
  option
    .setName('days')
    .setDescription('Days to delete messages')
    .setRequired(false)
)
```

### Use Choices for Fixed Values
```js
.addStringOption(option =>
  option
    .setName('action')
    .setDescription('Action to perform')
    .setRequired(true)
    .addChoices(
      { name: 'Kick', value: 'kick' },
      { name: 'Ban', value: 'ban' },
      { name: 'Warn', value: 'warn' }
    )
)
```

## Common Mistakes

### Mixing Subcommands and Options
```js
// Error: Cannot have both subcommands and options
const errorCommand = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuration')
  .addSubcommand(subcommand =>
    subcommand.setName('set').setDescription('Set value')
  )
  .addStringOption(option =>
    option.setName('value').setDescription('Value')
  )
```

### Invalid Characters in Names
```js
// Error: Uppercase letters not allowed
const errorCommand = new SlashCommandBuilder()
  .setName('InvalidName')
  .setDescription('This will fail')
```

### Exceeding Limits
```js
// Error: Too many options
const errorCommand = new SlashCommandBuilder()
  .setName('too-many')

// Adding 26 options will throw an error
for (let i = 0; i < 26; i++) {
  errorCommand.addStringOption(option =>
    option.setName(`option${i}`).setDescription(`Option ${i}`)
  )
}
```

## Integration with Command Handler

```js
// commands/utility/ping.js
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency')

export async function execute(interaction) {
  const sent = await interaction.reply({ 
    content: 'Pinging...', 
    fetchReply: true 
  })
  
  const timeDiff = sent.createdTimestamp - interaction.createdTimestamp
  
  await interaction.editReply(
    `🏓 Pong! Latency: ${timeDiff}ms`
  )
}
```

## Localization Support

```js
// Builder supports localization
const localizedCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Get help information')
  .setNameLocalization('es', 'ayuda')
  .setDescriptionLocalization('es', 'Obtener información de ayuda')
```

## Next Steps

- [ContainerBuilder](/builders/container-builder) - Organize UI components
- [ModalBuilder](/builders/modal-builder) - Create interactive forms
- [SectionBuilder](/builders/section-builder) - Structure content sections