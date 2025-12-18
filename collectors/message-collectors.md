# Message Collectors

Message collectors gather user messages based on specified criteria. This page covers patterns for collecting text input, validation, and multi-step message collection.

## Basic Message Collection

### Single Message Collection

```js
const filter = (message) => {
  return message.author.id === interaction.user.id &&
         !message.author.bot
}

const collector = interaction.channel.createMessageCollector({
  filter,
  time: 30000, // 30 seconds
  max: 1
})

await interaction.reply('Please enter your name:')

collector.on('collect', async (message) => {
  const name = message.content.trim()

  if (name.length < 2 || name.length > 50) {
    await interaction.editReply('Name must be 2-50 characters. Please try again.')
    return
  }

  await interaction.editReply(`Hello, ${name}!`)
  message.delete().catch(() => {}) // Clean up user message
})

collector.on('end', (collected, reason) => {
  if (reason === 'time') {
    interaction.editReply('Time ran out. Please try again.')
  }
})
```

### Multiple Message Collection

```js
const messages = []

const collector = interaction.channel.createMessageCollector({
  filter: (message) => message.author.id === interaction.user.id,
  time: 60000,
  max: 3
})

await interaction.reply('Please provide 3 items (one per message):')

collector.on('collect', (message) => {
  messages.push(message.content.trim())

  if (messages.length < 3) {
    message.reply(`Item ${messages.length}/3 received. Send the next one.`)
  }

  message.delete().catch(() => {})
})

collector.on('end', async (collected, reason) => {
  if (messages.length === 3) {
    const embed = new EmbedBuilder()
      .setTitle('Collected Items')
      .setDescription(messages.map((item, i) => `${i + 1}. ${item}`).join('\n'))

    await interaction.editReply({ embeds: [embed] })
  } else {
    await interaction.editReply('Collection incomplete.')
  }
})
```

## Advanced Message Collection

### Validated Input Collection

```js
class ValidatedMessageCollector {
  constructor(channel, userId, validator, options = {}) {
    this.channel = channel
    this.userId = userId
    this.validator = validator
    this.options = {
      time: 30000,
      maxAttempts: 3,
      ...options
    }
    this.attempts = 0
    this.collected = null
  }

  async collect(prompt) {
    return new Promise((resolve, reject) => {
      const filter = (message) => message.author.id === this.userId

      const collector = this.channel.createMessageCollector({
        filter,
        time: this.options.time,
        max: 1
      })

      const attemptCollection = async () => {
        this.attempts++

        if (this.attempts > this.options.maxAttempts) {
          collector.stop('max_attempts')
          return
        }

        const currentPrompt = this.attempts === 1
          ? prompt
          : `${prompt} (Attempt ${this.attempts}/${this.options.maxAttempts})`

        if (this.attempts === 1) {
          await this.channel.send(currentPrompt)
        } else {
          await this.channel.send(`Invalid input. ${currentPrompt}`)
        }
      }

      collector.on('collect', async (message) => {
        const validation = await this.validator(message.content)

        if (validation.valid) {
          this.collected = {
            message,
            value: message.content,
            validation
          }
          collector.stop('success')
        } else {
          await attemptCollection()
        }
      })

      collector.on('end', (collected, reason) => {
        if (reason === 'success') {
          resolve(this.collected)
        } else {
          reject(new Error(`Collection failed: ${reason}`))
        }
      })

      attemptCollection()
    })
  }
}

// Usage
const emailValidator = async (input) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(input)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Additional validation
  if (input.length > 254) {
    return { valid: false, error: 'Email too long' }
  }

  return { valid: true, normalized: input.toLowerCase() }
}

const collector = new ValidatedMessageCollector(
  interaction.channel,
  interaction.user.id,
  emailValidator,
  { maxAttempts: 3 }
)

try {
  const result = await collector.collect('Please enter your email address:')
  await interaction.reply(`Email collected: ${result.value}`)
} catch (error) {
  await interaction.reply('Failed to collect valid email.')
}
```

### Conversational Flow Collection

```js
class ConversationalCollector {
  constructor(channel, userId) {
    this.channel = channel
    this.userId = userId
    this.conversation = []
    this.currentStep = 0
    this.steps = []
  }

  addStep(prompt, validator = null, options = {}) {
    this.steps.push({
      prompt,
      validator,
      options: { timeout: 30000, ...options }
    })
    return this
  }

  async start() {
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i
      const step = this.steps[i]

      try {
        const result = await this.collectStep(step)
        this.conversation.push({
          step: i,
          prompt: step.prompt,
          response: result.value,
          valid: result.valid
        })
      } catch (error) {
        throw new Error(`Step ${i + 1} failed: ${error.message}`)
      }
    }

    return this.conversation
  }

  async collectStep(step) {
    return new Promise((resolve, reject) => {
      const filter = (message) => message.author.id === this.userId

      const collector = this.channel.createMessageCollector({
        filter,
        time: step.options.timeout,
        max: 1
      })

      collector.on('collect', async (message) => {
        let valid = true
        let error = null

        if (step.validator) {
          const validation = await step.validator(message.content)
          valid = validation.valid
          error = validation.error
        }

        if (valid) {
          resolve({
            message,
            value: message.content,
            valid: true
          })
          message.delete().catch(() => {})
        } else {
          message.reply(`Invalid response: ${error}`).catch(() => {})
          reject(new Error(error || 'Validation failed'))
        }
      })

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          reject(new Error('Response timeout'))
        } else if (reason !== 'success') {
          reject(new Error(`Collection ended: ${reason}`))
        }
      })

      this.channel.send(step.prompt)
    })
  }
}

// Usage
const conversation = new ConversationalCollector(interaction.channel, interaction.user.id)
  .addStep('What is your name?', async (input) => ({
    valid: input.length >= 2 && input.length <= 50,
    error: 'Name must be 2-50 characters'
  }))
  .addStep('How old are you?', async (input) => {
    const age = parseInt(input)
    return {
      valid: !isNaN(age) && age >= 13 && age <= 120,
      error: 'Please enter a valid age (13-120)'
    }
  })
  .addStep('What is your favorite programming language?', async (input) => ({
    valid: input.length > 0,
    error: 'Please enter a programming language'
  }))

try {
  const results = await conversation.start()

  const embed = new EmbedBuilder()
    .setTitle('Conversation Complete')
    .addFields(results.map(r => ({
      name: r.prompt,
      value: r.response,
      inline: false
    })))

  await interaction.reply({ embeds: [embed] })
} catch (error) {
  await interaction.reply(`Conversation failed: ${error.message}`)
}
```

## Message Collector Options

### Filter Patterns

```js
// Author filter
const authorFilter = (message) => message.author.id === targetUserId

// Content filter
const contentFilter = (message) =>
  message.content.toLowerCase().includes('specific word')

// Channel filter
const channelFilter = (message) =>
  message.channel.id === allowedChannelId

// Complex filter
const complexFilter = (message) => {
  return message.author.id === userId &&
         message.content.length > 0 &&
         !message.content.startsWith('!') &&
         message.channel.type === 'GUILD_TEXT'
}

// Combined filter
const combinedFilter = (message) => {
  return authorFilter(message) &&
         contentFilter(message) &&
         channelFilter(message)
}
```

### Collector Configuration

```js
const collector = channel.createMessageCollector({
  filter: combinedFilter,
  time: 60000,        // 1 minute timeout
  max: 10,           // Maximum 10 messages
  maxProcessed: 20,  // Maximum processing attempts
  dispose: true      // Handle deleted messages
})
```

## Best Practices

### Resource Management
```js
// Always set reasonable limits
const collector = channel.createMessageCollector({
  time: Math.min(requestedTime, 300000), // Max 5 minutes
  max: Math.min(requestedMax, 25),       // Max 25 messages
  dispose: true
})

// Clean up resources
collector.on('end', () => {
  // Any cleanup logic
})
```

### User Experience
```js
// Provide clear instructions
await interaction.reply({
  content: 'Please respond with your email address (you have 30 seconds):',
  ephemeral: true
})

// Give feedback
collector.on('collect', (message) => {
  message.react('✅').catch(() => {})
})
```

### Error Recovery
```js
collector.on('end', (collected, reason) => {
  switch (reason) {
    case 'time':
      interaction.editReply('Response timed out.')
      break
    case 'max':
      interaction.editReply('Maximum responses reached.')
      break
    default:
      interaction.editReply('Collection ended unexpectedly.')
  }
})
```

## Next Steps

- [Component Collectors](/collectors/component-collectors) - Collecting component interactions
- [Filters](/collectors/filters) - Advanced filtering patterns