# Previews Overview

Visual previews showing real Discord UI output for better documentation understanding. This section provides screenshots and examples of actual Discord interfaces.

## Preview System

Previews show how Discord.js code outputs appear in the Discord client. They help developers understand the visual result of their code.

## Slash Command Responses

### Basic Command Response
```
User: /ping
Bot: Pong!
```

**Visual Preview:**
![Basic Command Response](https://via.placeholder.com/400x100?text=Basic+Command+Response)

### Embed Response
```js
const embed = new EmbedBuilder()
  .setTitle('Server Info')
  .setDescription('Server statistics')
  .addFields(
    { name: 'Members', value: '1,234', inline: true },
    { name: 'Created', value: 'Jan 1, 2020', inline: true }
  )
```

**Visual Preview:**
![Embed Response](https://via.placeholder.com/400x200?text=Embed+Response)

## Component Interactions

### Button Row
```js
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setLabel('Yes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setLabel('No').setStyle(ButtonStyle.Danger)
  )
```

**Visual Preview:**
![Button Row](https://via.placeholder.com/300x50?text=Button+Row)

### Select Menu
```js
const select = new StringSelectMenuBuilder()
  .setPlaceholder('Choose option')
  .addOptions(
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' }
  )
```

**Visual Preview:**
![Select Menu](https://via.placeholder.com/300x60?text=Select+Menu)

## Modal Forms

### User Input Modal
```js
const modal = new ModalBuilder()
  .setTitle('User Settings')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setLabel('Username')
        .setStyle(TextInputStyle.Short)
    )
  )
```

**Visual Preview:**
![Modal Form](https://via.placeholder.com/400x300?text=Modal+Form)

## Error States

### Permission Error
```
❌ Missing Permissions
You need the "Manage Messages" permission to use this command.
```

**Visual Preview:**
![Error State](https://via.placeholder.com/400x80?text=Error+State)

### Rate Limit Message
```
⏱️ Rate Limited
Please wait 30 seconds before trying again.
```

**Visual Preview:**
![Rate Limit](https://via.placeholder.com/400x80?text=Rate+Limit+Message)

## Preview Guidelines

### Image Requirements
- **Format**: PNG or WebP
- **Size**: Optimized for web viewing
- **Quality**: Clear, readable text
- **Context**: Show relevant Discord UI elements

### Code-to-Preview Mapping
Each preview includes:
- **Code snippet** that generates the output
- **Visual result** showing Discord UI
- **Key elements** highlighted
- **Platform notes** (desktop/mobile differences)

## Next Steps

- [Slash Command Responses](/previews/slash-command-responses) - Command output examples
- [Embeds](/previews/embeds) - Embed visualization
- [Components](/previews/components) - Interactive elements
- [Modals](/previews/modals) - Form interfaces
- [Error States](/previews/error-states) - Error handling UI