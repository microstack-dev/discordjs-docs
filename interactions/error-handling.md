# Interaction Error Handling

Robust error handling is critical for Discord.js bots. This page covers comprehensive strategies for handling interaction failures, timeouts, and unexpected errors while maintaining user experience.

## Error Categories

### Network Errors
- Connection timeouts
- Rate limiting
- Discord API outages
- Gateway disconnections

### Validation Errors
- Invalid user input
- Permission failures
- Missing required parameters
- Malformed data

### Application Errors
- Database failures
- External API errors
- File system issues
- Memory limits

### Discord API Errors
- Invalid interaction tokens
- Expired interactions
- Permission denied
- Resource not found

## Basic Error Handling

### Try-Catch Blocks

```js
client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction)
  } catch (error) {
    console.error('Interaction error:', error)
    await safeReplyError(interaction, 'An unexpected error occurred.')
  }
})

async function safeReplyError(interaction, message) {
  const response = { content: message, ephemeral: true }

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(response)
    } else if (interaction.deferred) {
      await interaction.editReply(response)
    } else {
      await interaction.followUp(response)
    }
  } catch (replyError) {
    console.error('Failed to send error response:', replyError)
  }
}
```

## Advanced Error Handling Patterns

### Centralized Error Handler

```js
class InteractionErrorHandler {
  constructor(client) {
    this.client = client
    this.errorCounts = new Map()
  }

  async handleError(interaction, error, context = {}) {
    console.error('Interaction Error:', {
      interactionId: interaction.id,
      userId: interaction.user.id,
      command: interaction.commandName,
      error: error.message,
      stack: error.stack,
      ...context
    })

    this.trackError(error)
    const errorResponse = this.categorizeError(error)
    await this.sendErrorResponse(interaction, errorResponse)
  }

  categorizeError(error) {
    if (error.code === 10008) {
      return { message: 'The referenced message no longer exists.', type: 'user_error' }
    }
    if (error.code === 50013) {
      return { message: 'I don\'t have permission to perform this action.', type: 'permission_error' }
    }
    if (error.message.includes('rate limit')) {
      return { message: 'Please wait a moment before trying again.', type: 'rate_limit' }
    }
    return { message: 'An unexpected error occurred. Please try again.', type: 'system_error' }
  }

  async sendErrorResponse(interaction, errorResponse) {
    const response = {
      content: errorResponse.message,
      ephemeral: errorResponse.type !== 'public_info'
    }

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(response)
      } else if (interaction.deferred) {
        await interaction.editReply(response)
      } else {
        await interaction.followUp(response)
      }
    } catch (sendError) {
      console.error('Failed to send error response:', sendError)
    }
  }

  trackError(error) {
    const key = error.message.substring(0, 50)
    const count = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, count + 1)

    if (count > 10) {
      console.warn(`Frequent error detected: "${key}" (${count} occurrences)`)
    }
  }
}

const errorHandler = new InteractionErrorHandler(client)

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction)
  } catch (error) {
    await errorHandler.handleError(interaction, error)
  }
})
```

## Specific Error Scenarios

### Rate Limit Handling

```js
async function handleRateLimit(interaction, retryAfter) {
  const userId = interaction.user.id

  setTimeout(async () => {
    try {
      await retryOperation(interaction)
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }, retryAfter * 1000)

  await interaction.reply({
    content: `Rate limited. Retrying in ${retryAfter} seconds...`,
    ephemeral: true
  })
}
```

### Permission Error Handling

```js
async function checkAndHandlePermissions(interaction, requiredPermissions) {
  const member = interaction.member
  const missingPermissions = []

  for (const permission of requiredPermissions) {
    if (!member.permissions.has(permission)) {
      missingPermissions.push(permission)
    }
  }

  if (missingPermissions.length > 0) {
    const permissionNames = missingPermissions.map(perm =>
      perm.toLowerCase().replace(/_/g, ' ')
    )

    await interaction.reply({
      content: `Missing permissions: ${permissionNames.join(', ')}`,
      ephemeral: true
    })

    return false
  }

  return true
}
```

## Error Recovery Strategies

### Retry Logic

```js
class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries
    this.baseDelay = baseDelay
  }

  async executeWithRetry(operation, interaction) {
    let lastError

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1)
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`)

          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw error
      }
    }

    throw lastError
  }

  isRetryableError(error) {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('rate limit')
  }
}
```

## Best Practices

### Error Logging

```js
class ErrorLogger {
  logError(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context: context
    }

    console.error(JSON.stringify(logEntry, null, 2))

    if (process.env.ERROR_WEBHOOK) {
      sendToWebhook(process.env.ERROR_WEBHOOK, logEntry)
    }
  }
}
```

### User-Friendly Error Messages

```js
function getUserFriendlyError(error) {
  const errorMap = {
    'Missing Permissions': 'You don\'t have permission to do that.',
    'Unknown Message': 'The message you\'re trying to reference doesn\'t exist.',
    'Invalid Form Body': 'The data you provided is invalid.',
    'Request Timeout': 'The operation timed out.',
    'Rate Limited': 'You\'re doing that too quickly.'
  }

  for (const [key, message] of Object.entries(errorMap)) {
    if (error.message.includes(key)) {
      return message
    }
  }

  return 'Something went wrong. Please try again later.'
}
```

## Next Steps

- [Component Systems Overview](/components/overview) - Building scalable component architectures