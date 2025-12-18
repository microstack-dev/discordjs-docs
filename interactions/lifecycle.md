# Interaction Lifecycle

Understanding the complete lifecycle of Discord interactions is crucial for building reliable, responsive bots. This page covers the detailed flow from interaction creation to completion.

## Lifecycle Stages

### 1. Interaction Creation

Discord creates an interaction when a user performs an action:

- User sends slash command
- User clicks button or selects from menu
- User submits modal form
- User uses context menu

### 2. Gateway Transmission

The interaction travels through Discord's Gateway:
- Serialized as JSON payload
- Includes user, guild, and context data
- Contains unique interaction token
- Has 3-second initial response window

### 3. Bot Reception

Your bot receives the interaction via `interactionCreate` event:
```js
client.on('interactionCreate', async (interaction) => {
  console.log('Received interaction:', interaction.id)
  console.log('Type:', interaction.type)
  console.log('Token expires:', new Date(interaction.createdTimestamp + 15 * 60 * 1000))
})
```

### 4. Processing Phase

Bot processes the interaction:
- Validate permissions
- Check rate limits
- Parse input data
- Prepare response

### 5. Response Phase

Bot responds within constraints:
- **3 seconds** for initial response
- **15 minutes** for follow-ups
- Token becomes invalid after expiration

## Response Timing Rules

### Immediate Response Required
```js
client.on('interactionCreate', async (interaction) => {
  // This code MUST complete within 3 seconds
  const startTime = Date.now()

  // Fast validation
  if (!interaction.isChatInputCommand()) return

  // Quick permission check
  if (!interaction.member.permissions.has('MANAGE_MESSAGES')) {
    return await interaction.reply({
      content: 'Missing permissions',
      ephemeral: true
    })
  }

  // If processing takes longer, defer
  if (complexOperationWillTakeTime()) {
    await interaction.deferReply()
    await performComplexOperation()
    await interaction.editReply('Operation complete')
  } else {
    await interaction.reply('Fast response')
  }

  const processingTime = Date.now() - startTime
  console.log(`Processed in ${processingTime}ms`)
})
```

### Deferred Response Pattern
```js
async function handleSlowOperation(interaction) {
  // Defer immediately (within 3 seconds)
  await interaction.deferReply()

  try {
    // Perform slow operation
    const result = await slowDatabaseQuery()
    const processed = await heavyComputation(result)

    // Edit the deferred response
    await interaction.editReply({
      content: `Result: ${processed}`,
      embeds: [createResultEmbed(processed)]
    })
  } catch (error) {
    // Edit with error message
    await interaction.editReply({
      content: 'An error occurred during processing.',
      embeds: [],
      components: []
    })
  }
}
```

## State Management

### Interaction State Tracking
```js
class InteractionManager {
  constructor() {
    this.activeInteractions = new Map()
  }

  trackInteraction(interaction) {
    const state = {
      id: interaction.id,
      userId: interaction.user.id,
      type: interaction.type,
      startTime: Date.now(),
      lastActivity: Date.now(),
      step: 0,
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    }

    this.activeInteractions.set(interaction.id, state)
  }

  updateState(interactionId, updates) {
    const state = this.activeInteractions.get(interactionId)
    if (state) {
      Object.assign(state, updates, { lastActivity: Date.now() })
    }
  }

  getState(interactionId) {
    return this.activeInteractions.get(interactionId)
  }

  cleanup() {
    const now = Date.now()
    for (const [id, state] of this.activeInteractions) {
      if (now > state.expiresAt) {
        this.activeInteractions.delete(id)
      }
    }
  }
}

const interactionManager = new InteractionManager()

client.on('interactionCreate', async (interaction) => {
  interactionManager.trackInteraction(interaction)

  // Use state for multi-step processes
  const state = interactionManager.getState(interaction.id)
})
```

## Error Scenarios

### Timeout Handling
```js
client.on('interactionCreate', async (interaction) => {
  try {
    // Set up timeout handler
    const timeout = setTimeout(async () => {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'This operation is taking longer than expected. Please try again.',
          ephemeral: true
        })
      }
    }, 2500) // 2.5 seconds

    clearTimeout(timeout)
    await interaction.reply('Response sent')
  } catch (error) {
    console.error('Interaction timeout or error:', error)
  }
})
```

### Token Expiration
```js
function isInteractionValid(interaction) {
  const age = Date.now() - interaction.createdTimestamp
  const maxAge = 15 * 60 * 1000 // 15 minutes
  return age < maxAge
}

client.on('interactionCreate', async (interaction) => {
  if (!isInteractionValid(interaction)) {
    console.warn('Received expired interaction:', interaction.id)
    return
  }
  // Process valid interaction
})
```

## Best Practices

### Response Strategy Selection
- Use `reply()` for simple, immediate responses
- Use `deferReply()` for operations taking 1-3 seconds
- Use `update()` for component interactions
- Use `followUp()` for additional messages

### Error Recovery
- Handle errors after deferring with `editReply()`
- Provide user-friendly error messages
- Log errors for debugging

### Resource Management
- Clean up interaction references
- Use collectors for complex flows
- Monitor memory usage

## Next Steps

- [Deferring and Updating](/interactions/deferring-and-updating) - Advanced response timing
- [Ephemeral Interactions](/interactions/ephemeral-interactions) - Private responses
- [Error Handling](/interactions/error-handling) - Robust error management