# Interactions Overview

Interactions are the primary mechanism for Discord.js bots to receive and respond to user actions. This section covers the complete interaction system architecture in Discord.js v14.25.1.

## What Are Interactions

Interactions represent user-initiated actions that Discord sends to your bot:

- **Slash Commands**: `/command` text commands
- **Context Menus**: Right-click user/message commands
- **Buttons**: Clickable UI components
- **Select Menus**: Dropdown selections
- **Modal Submissions**: Form responses

## Interaction Types

### Chat Input Commands (Slash Commands)
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction

  if (commandName === 'ping') {
    await interaction.reply('Pong!')
  }
})
```

### User Context Menu Commands
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isUserContextMenuCommand()) return

  const { commandName, targetUser } = interaction

  if (commandName === 'Get User Info') {
    await interaction.reply(`User: ${targetUser.tag}`)
  }
})
```

### Message Context Menu Commands
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return

  const { commandName, targetMessage } = interaction

  if (commandName === 'Quote Message') {
    await interaction.reply(`"${targetMessage.content}"`)
  }
})
```

### Button Interactions
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return

  const { customId } = interaction

  if (customId === 'confirm') {
    await interaction.update({ content: 'Confirmed!', components: [] })
  }
})
```

### Select Menu Interactions
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return

  const { customId, values } = interaction

  if (customId === 'color_select') {
    await interaction.reply(`Selected: ${values.join(', ')}`)
  }
})
```

### Modal Submissions
```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return

  const { customId, fields } = interaction

  if (customId === 'feedback_form') {
    const feedback = fields.getTextInputValue('feedback')
    await interaction.reply('Thank you for your feedback!')
  }
})
```

## Interaction Lifecycle

All interactions follow a strict lifecycle:

1. **Receive**: Discord sends interaction to your bot
2. **Process**: Your bot processes the interaction
3. **Respond**: Bot responds within 3 seconds (or defers)
4. **Follow-up**: Additional responses if needed
5. **Expire**: Interaction becomes unusable after 15 minutes

## Response Methods

### Immediate Response (reply)
```js
await interaction.reply({
  content: 'Response content',
  embeds: [embed],
  components: [actionRow],
  ephemeral: false
})
```

### Deferred Response (deferReply)
```js
await interaction.deferReply()

// Later...
await interaction.editReply('Final response')
```

### Update Response (for components)
```js
await interaction.update({
  content: 'Updated content',
  components: [] // Remove components
})
```

### Follow-up Response (followUp)
```js
await interaction.followUp({
  content: 'Additional message',
  ephemeral: true
})
```

## Security Considerations

### Interaction Tokens
- Each interaction has a unique token
- Tokens expire after 15 minutes
- Tokens are single-use for initial responses

### User Verification
```js
// Always verify interaction source
if (interaction.user.id !== authorizedUserId) {
  return await interaction.reply({
    content: 'Unauthorized',
    ephemeral: true
  })
}
```

### Rate Limiting
- Interactions are subject to global rate limits
- Implement proper error handling for rate limits
- Use exponential backoff for retries

## Performance Considerations

### Response Time Limits
- **3 seconds** for initial response
- **15 minutes** for follow-ups
- Use `deferReply()` for operations > 500ms

### Memory Management
- Clean up interaction references after use
- Don't store interaction objects long-term
- Use collectors for complex multi-step flows

### Scaling Patterns
- Use sharding for large bots
- Implement proper error boundaries
- Monitor interaction latency

## Error Handling

### Safe Error Responses
```js
client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction)
  } catch (error) {
    console.error('Interaction error:', error)

    // Safe error response
    await safeReplyError(interaction, 'An unexpected error occurred.')
  }
})

async function safeReplyError(interaction, message) {
  const errorResponse = {
    content: message,
    ephemeral: true
  }

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(errorResponse)
    } else if (interaction.deferred) {
      await interaction.editReply(errorResponse)
    } else {
      await interaction.followUp(errorResponse)
    }
  } catch (replyError) {
    console.error('Failed to send error response:', replyError)
  }
})
```

## Best Practices

### Consistent Response Patterns
- Use `reply()` for simple, immediate responses
- Use `deferReply()` for operations taking 1-3 seconds
- Use `followUp()` for additional messages after initial response
- Use `update()` for component interactions

### Error Recovery
- Implement retry logic for network errors
- Provide user-friendly error messages
- Log errors for debugging

### Security
- Validate all user inputs
- Check permissions before actions
- Use interaction tokens properly

## Next Steps

- [Interaction Lifecycle](/interactions/lifecycle) - Detailed lifecycle explanation
- [Deferring and Updating](/interactions/deferring-and-updating) - Response timing strategies
- [Ephemeral Interactions](/interactions/ephemeral-interactions) - Private user responses
- [Error Handling](/interactions/error-handling) - Robust error management