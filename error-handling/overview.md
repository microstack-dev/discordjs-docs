# Error Handling Overview

Comprehensive error handling strategies for Discord.js applications. This section covers centralized error management, user-safe responses, and crash prevention.

## Error Categories

### Application Errors
- Database connection failures
- API timeouts
- File system errors
- Memory limits exceeded

### Discord API Errors
- Rate limiting
- Invalid permissions
- Missing resources
- Network timeouts

### User Input Errors
- Invalid command syntax
- Missing required parameters
- Incorrect data types
- Permission violations

## Centralized Error Handling

### Global Error Pipeline

```js
class ErrorHandler {
  constructor(client) {
    this.client = client
    this.errorLog = []
    this.maxLogSize = 1000
  }

  async handle(error, context = {}) {
    const errorEntry = {
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context
    }

    // Log error
    this.logError(errorEntry)

    // Handle based on type
    if (error.code === 50013) {
      return this.handlePermissionError(error, context)
    } else if (error.message.includes('rate limit')) {
      return this.handleRateLimitError(error, context)
    } else {
      return this.handleGenericError(error, context)
    }
  }

  logError(errorEntry) {
    this.errorLog.push(errorEntry)

    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize)
    }

    console.error('Error logged:', errorEntry)
  }

  async handlePermissionError(error, context) {
    if (context.interaction) {
      await context.interaction.reply({
        content: 'I don\'t have permission to perform this action.',
        ephemeral: true
      })
    }
  }

  async handleRateLimitError(error, context) {
    const retryAfter = error.retry_after || 5000

    if (context.interaction) {
      await context.interaction.reply({
        content: `Rate limited. Please wait ${Math.ceil(retryAfter / 1000)} seconds.`,
        ephemeral: true
      })
    }

    // Schedule retry if applicable
    if (context.retry) {
      setTimeout(() => context.retry(), retryAfter)
    }
  }

  async handleGenericError(error, context) {
    if (context.interaction && !context.interaction.replied) {
      await context.interaction.reply({
        content: 'An unexpected error occurred. Please try again later.',
        ephemeral: true
      })
    }
  }
}

const errorHandler = new ErrorHandler(client)
```

## User-Safe Error Messages

### Error Message Sanitization

```js
class ErrorSanitizer {
  sanitizeMessage(error, context) {
    // Remove sensitive information
    let message = error.message

    // Remove file paths
    message = message.replace(/\/[^\s]+/g, '[FILE_PATH]')

    // Remove API keys
    message = message.replace(/[A-Za-z0-9]{32,}/g, '[API_KEY]')

    // Generic messages for common errors
    if (message.includes('ECONNREFUSED')) {
      return 'Database connection failed. Please try again later.'
    }

    if (message.includes('rate limit')) {
      return 'Too many requests. Please wait and try again.'
    }

    // Default generic message
    return 'An error occurred while processing your request.'
  }

  isUserSafe(error) {
    // Errors that are safe to show to users
    const safeCodes = [10008, 50013, 50035] // Unknown Message, Missing Permissions, etc.

    return safeCodes.includes(error.code) ||
           error.message.includes('rate limit') ||
           error.message.includes('permission')
  }
}

const sanitizer = new ErrorSanitizer()
```

## Interaction-Safe Errors

### Safe Interaction Responses

```js
async function safeInteractionReply(interaction, content, options = {}) {
  const replyOptions = {
    content,
    ephemeral: true,
    ...options
  }

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(replyOptions)
    } else if (interaction.deferred) {
      await interaction.editReply(replyOptions)
    } else {
      await interaction.followUp(replyOptions)
    }
  } catch (replyError) {
    console.error('Failed to send error response:', replyError)
  }
}

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction)
  } catch (error) {
    const safeMessage = sanitizer.sanitizeMessage(error, { interaction })
    await safeInteractionReply(interaction, safeMessage)
  }
})
```

## Logging Strategies

### Structured Logging

```js
class ErrorLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 5000
  }

  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date(),
      level,
      message,
      meta
    }

    this.logs.push(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console output
    console[level](message, meta)

    // File/Database storage
    this.persistLog(entry)
  }

  error(message, meta) {
    this.log('error', message, meta)
  }

  warn(message, meta) {
    this.log('warn', message, meta)
  }

  info(message, meta) {
    this.log('info', message, meta)
  }

  async persistLog(entry) {
    // Save to file/database
    try {
      await fs.appendFile('./logs/errors.log', JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('Failed to persist log:', error)
    }
  }

  getLogs(level = null, limit = 100) {
    let filtered = this.logs

    if (level) {
      filtered = filtered.filter(log => log.level === level)
    }

    return filtered.slice(-limit)
  }
}

const logger = new ErrorLogger()

// Usage
logger.error('Database connection failed', {
  error: error.message,
  userId: interaction.user.id,
  command: interaction.commandName
})
```

## Graceful Failures

### Circuit Breaker Pattern

```js
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold
    this.timeout = timeout
    this.failures = 0
    this.lastFailureTime = null
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

const databaseCircuit = new CircuitBreaker(3, 30000)

// Usage
async function safeDatabaseOperation() {
  return databaseCircuit.execute(() => database.query('SELECT * FROM users'))
}
```

### Fallback Strategies

```js
async function withFallback(primary, fallback, maxRetries = 3) {
  let lastError

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await primary()
    } catch (error) {
      lastError = error
      console.warn(`Attempt ${i + 1} failed:`, error.message)
    }
  }

  // All retries failed, try fallback
  try {
    console.log('Attempting fallback...')
    return await fallback()
  } catch (fallbackError) {
    console.error('Fallback also failed:', fallbackError)
    throw lastError // Throw original error
  }
}

// Usage
const result = await withFallback(
  () => externalAPI.call(),
  () => cachedData.get(),
  2
)
```

## Best Practices

### Error Classification

```js
function classifyError(error) {
  if (error.code >= 50000) {
    return 'discord_api'
  }

  if (error.code >= 10000) {
    return 'user_error'
  }

  if (error.message.includes('timeout')) {
    return 'timeout'
  }

  if (error.message.includes('permission')) {
    return 'permission'
  }

  return 'application'
}

// Handle based on classification
function handleClassifiedError(error, context) {
  const type = classifyError(error)

  switch (type) {
    case 'discord_api':
      return handleDiscordError(error, context)
    case 'user_error':
      return handleUserError(error, context)
    case 'timeout':
      return handleTimeoutError(error, context)
    default:
      return handleApplicationError(error, context)
  }
}
```

### Monitoring and Alerts

```js
class ErrorMonitor {
  constructor() {
    this.errors = new Map()
    this.alertThreshold = 10 // errors per minute
  }

  trackError(error, context) {
    const key = `${error.name}:${context.source || 'unknown'}`
    const now = Date.now()
    const minute = Math.floor(now / 60000)

    if (!this.errors.has(key)) {
      this.errors.set(key, new Map())
    }

    const minuteMap = this.errors.get(key)
    const count = minuteMap.get(minute) || 0
    minuteMap.set(minute, count + 1)

    // Check threshold
    if (count + 1 >= this.alertThreshold) {
      this.alert(key, count + 1)
    }
  }

  alert(errorKey, count) {
    console.error(`ALERT: High error rate for ${errorKey}: ${count} errors/minute`)

    // Send notification to developers
    sendDeveloperAlert(`High error rate: ${errorKey} (${count}/min)`)
  }

  getStats() {
    const stats = {}

    for (const [errorKey, minuteMap] of this.errors) {
      const total = Array.from(minuteMap.values()).reduce((sum, count) => sum + count, 0)
      stats[errorKey] = total
    }

    return stats
  }
}

const errorMonitor = new ErrorMonitor()

// Track errors
try {
  await riskyOperation()
} catch (error) {
  errorMonitor.trackError(error, { source: 'riskyOperation' })
  throw error
}
```

## Next Steps

- [Centralized Handling](/error-handling/centralized-handling) - Global error management
- [Interaction-Safe Errors](/error-handling/interaction-safe-errors) - Safe user responses
- [Logging](/error-handling/logging) - Comprehensive error logging