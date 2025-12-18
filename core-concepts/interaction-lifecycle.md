# Interaction Lifecycle

Understanding the interaction lifecycle is crucial for building responsive Discord bots. Interactions include slash commands, buttons, modals, and other user-initiated actions.

## Interaction Types

Discord.js v14.25.1 supports several interaction types:
- **Slash Commands**: Text-based commands with options
- **User Commands**: Context menu commands for users
- **Message Commands**: Context menu commands for messages
- **Buttons**: Clickable button components
- **Select Menus**: Dropdown selection components
- **Modals**: Form submissions
- **Autocomplete**: Dynamic command option suggestions

## Lifecycle Stages

### 1. Interaction Creation

User initiates an interaction:
```js
// Slash command invocation
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  
  console.log('Command invoked:', interaction.commandName)
})
```

### 2. Gateway Reception

Discord Gateway sends the interaction event to your bot:
```js
client.on('interactionCreate', async (interaction) => {
  // Interaction received from Gateway
  console.log('Interaction ID:', interaction.id)
  console.log('Interaction type:', interaction.type)
})
```

### 3. Initial Response (3 Second Window)

You must respond within 3 seconds:
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // Immediate response required
    await interaction.reply('Processing your command...')
    
    // Continue with async operations
    await processCommand(interaction)
  }
})
```

### 4. Follow-up Responses

After initial response, you can send follow-ups:
```js
async function processCommand(interaction) {
  // Perform async operation
  const result = await fetchData()
  
  // Edit original response
  await interaction.editReply({
    content: `Result: ${result}`
  })
  
  // Send additional follow-ups
  await interaction.followUp({
    content: 'Additional information',
    ephemeral: true
  })
}
```

## Response Types

### Reply
Standard response to interactions:
```js
await interaction.reply({
  content: 'Command executed successfully!',
  ephemeral: false // Visible to everyone
})
```

### Deferred Response
Indicate processing will take time:
```js
// Defer with message
await interaction.deferReply()

// Defer without message (shows "Thinking...")
await interaction.deferReply({ ephemeral: true })

// Complete later
await interaction.editReply('Processing complete!')
```

### Modal Response
Open a form for user input:
```js
const modal = new ModalBuilder()
  .setCustomId('feedback')
  .setTitle('Feedback Form')

await interaction.showModal(modal)
```

## Component Interactions

### Button Interactions
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    console.log('Button clicked:', interaction.customId)
    
    if (interaction.customId === 'confirm') {
      await interaction.update({
        content: 'Action confirmed!',
        components: [] // Remove buttons
      })
    }
  }
})
```

### Select Menu Interactions
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    const selected = interaction.values[0]
    
    await interaction.reply({
      content: `You selected: ${selected}`,
      ephemeral: true
    })
  }
})
```

### Modal Submissions
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit()) {
    const feedback = interaction.fields.getTextInputValue('feedback_input')
    
    await interaction.reply({
      content: 'Thank you for your feedback!',
      ephemeral: true
    })
    
    // Process feedback data
    await saveFeedback(feedback)
  }
})
```

## Autocomplete Interactions
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focusedValue = interaction.options.getFocused()
    
    const choices = ['option1', 'option2', 'option3']
      .filter(choice => choice.includes(focusedValue))
      .slice(0, 25) // Discord limit
    
    await interaction.respond(
      choices.map(choice => ({ name: choice, value: choice }))
    )
  }
})
```

## Error Handling

### Interaction Failures
```js
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction)
    }
  } catch (error) {
    console.error('Interaction error:', error)
    
    // Respond if not already responded
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while processing this interaction.',
        ephemeral: true
      })
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred during processing.'
      })
    }
  }
})
```

### Interaction Timeout
Interactions expire after 15 minutes:
```js
// Store interaction for later use
const pendingInteractions = new Map()

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'wait') {
    pendingInteractions.set(interaction.user.id, interaction)
    
    // Set timeout to clean up
    setTimeout(() => {
      pendingInteractions.delete(interaction.user.id)
    }, 15 * 60 * 1000) // 15 minutes
  }
})
```

## Best Practices

### Response Patterns
```js
// Good: Always respond within 3 seconds
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // Immediate acknowledgment
    await interaction.deferReply()
    
    // Process asynchronously
    try {
      const result = await longOperation()
      await interaction.editReply(`Result: ${result}`)
    } catch (error) {
      await interaction.editReply('Operation failed.')
    }
  }
})
```

### Ephemeral Responses
Use ephemeral responses for sensitive information:
```js
await interaction.reply({
  content: 'Your private data here',
  ephemeral: true
})
```

### Component Cleanup
Remove components after use:
```js
await interaction.update({
  content: 'Action completed',
  components: [] // Remove all components
})
```

## Performance Considerations

### Response Time
- Always respond within 3 seconds
- Use `deferReply()` for operations taking longer
- Cache frequently accessed data

### Memory Management
- Don't store interaction objects long-term
- Clean up pending interactions
- Use Maps with TTL for temporary storage

## Common Issues

### "Interaction has already been acknowledged"
```js
// Bad: Multiple responses
await interaction.reply('First response')
await interaction.reply('Second response') // Error

// Good: Use editReply or followUp
await interaction.reply('First response')
await interaction.followUp('Second response')
```

### "Unknown interaction"
```js
// Interaction expired (15 minutes)
// Solution: Don't store interactions long-term
```

### "Failed to send response"
```js
// Missing permissions or bot removed
// Solution: Check permissions and handle gracefully
```

## Next Steps

Continue to [Builders Overview](/builders/overview) to learn how to create safe, type-safe interactions using the builder pattern.