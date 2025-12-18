# Collectors Overview

Collectors enable complex multi-step interactions by gathering multiple user inputs over time. This page covers collector patterns, lifecycle management, and best practices for Discord.js v14.25.1.

## What Are Collectors

Collectors listen for specific events and accumulate them until a condition is met. They enable:
- Multi-step wizards
- Polling systems
- Form inputs
- Interactive games
- Complex workflows

## Collector Types

### Message Collectors

```js
const filter = (message) => message.author.id === interaction.user.id

const collector = interaction.channel.createMessageCollector({
  filter,
  time: 30000, // 30 seconds
  max: 1
})

collector.on('collect', async (message) => {
  await interaction.editReply(`You said: ${message.content}`)
  collector.stop()
})

collector.on('end', (collected, reason) => {
  if (reason === 'time') {
    interaction.editReply('Time ran out!')
  }
})
```

### Component Collectors

```js
const filter = (interaction) => interaction.user.id === interaction.user.id

const collector = interaction.channel.createMessageComponentCollector({
  filter,
  time: 60000, // 1 minute
  max: 5
})

collector.on('collect', async (componentInteraction) => {
  await componentInteraction.reply({
    content: `You clicked: ${componentInteraction.customId}`,
    ephemeral: true
  })
})

collector.on('end', (collected, reason) => {
  console.log(`Collected ${collected.size} interactions`)
})
```

## Collector Lifecycle

### Creation Phase
```js
const collector = channel.createMessageCollector({
  filter: (message) => message.author.id === userId,
  time: 30000,
  max: 3,
  dispose: true // Handle deleted messages
})
```

### Collection Phase
```js
collector.on('collect', (item) => {
  console.log('Collected:', item.content || item.customId)
  collectedData.push(item)
})
```

### Termination Phase
```js
collector.on('end', (collected, reason) => {
  console.log(`Collection ended: ${reason}`)
  console.log(`Total collected: ${collected.size}`)

  // Process collected data
  processCollectedData(collected)
})
```

## Advanced Patterns

### Conditional Collection

```js
class ConditionalCollector {
  constructor(channel, userId) {
    this.channel = channel
    this.userId = userId
    this.collected = []
    this.step = 0
    this.steps = ['name', 'age', 'color']
  }

  async start() {
    await this.nextStep()
  }

  async nextStep() {
    if (this.step >= this.steps.length) {
      await this.finish()
      return
    }

    const currentStep = this.steps[this.step]
    const prompt = this.getPrompt(currentStep)

    const message = await this.channel.send(prompt)

    const filter = (message) => message.author.id === this.userId
    const collector = this.channel.createMessageCollector({ filter, time: 30000, max: 1 })

    collector.on('collect', async (message) => {
      const validated = await this.validateStep(currentStep, message.content)

      if (validated) {
        this.collected.push({ step: currentStep, value: message.content })
        this.step++
        await this.nextStep()
      } else {
        await message.reply('Invalid input. Please try again.')
        await this.nextStep()
      }

      message.delete().catch(() => {}) // Clean up user message
    })

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && this.step < this.steps.length) {
        this.channel.send('Collection timed out.')
      }
    })
  }

  getPrompt(step) {
    const prompts = {
      name: 'What is your name?',
      age: 'How old are you?',
      color: 'What is your favorite color?'
    }
    return prompts[step]
  }

  async validateStep(step, value) {
    switch (step) {
      case 'age':
        const age = parseInt(value)
        return !isNaN(age) && age >= 13 && age <= 120
      case 'name':
        return value.length >= 2 && value.length <= 50
      case 'color':
        const colors = ['red', 'blue', 'green', 'yellow', 'purple']
        return colors.includes(value.toLowerCase())
      default:
        return true
    }
  }

  async finish() {
    const embed = new EmbedBuilder()
      .setTitle('Profile Complete')
      .addFields(
        { name: 'Name', value: this.collected.find(c => c.step === 'name').value },
        { name: 'Age', value: this.collected.find(c => c.step === 'age').value },
        { name: 'Color', value: this.collected.find(c => c.step === 'color').value }
      )
      .setColor('Green')

    await this.channel.send({ embeds: [embed] })
  }
}
```

## Collector Management

### Collector Registry

```js
class CollectorManager {
  constructor() {
    this.collectors = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  register(collector, metadata = {}) {
    const id = `collector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.collectors.set(id, {
      collector,
      metadata,
      createdAt: Date.now(),
      channelId: metadata.channelId,
      userId: metadata.userId
    })

    collector.on('end', () => {
      this.collectors.delete(id)
    })

    return id
  }

  get(id) {
    return this.collectors.get(id)
  }

  stop(id) {
    const entry = this.collectors.get(id)
    if (entry) {
      entry.collector.stop()
      this.collectors.delete(id)
      return true
    }
    return false
  }

  stopUserCollectors(userId) {
    const toStop = []

    for (const [id, entry] of this.collectors) {
      if (entry.metadata.userId === userId) {
        entry.collector.stop()
        toStop.push(id)
      }
    }

    toStop.forEach(id => this.collectors.delete(id))
    return toStop.length
  }

  stopChannelCollectors(channelId) {
    const toStop = []

    for (const [id, entry] of this.collectors) {
      if (entry.metadata.channelId === channelId) {
        entry.collector.stop()
        toStop.push(id)
      }
    }

    toStop.forEach(id => this.collectors.delete(id))
    return toStop.length
  }

  cleanup() {
    // Collectors clean themselves up when they end
    // This is mainly for monitoring
    return this.collectors.size
  }

  getStats() {
    return {
      activeCollectors: this.collectors.size,
      byType: this.getCollectorsByType()
    }
  }

  getCollectorsByType() {
    const byType = {}

    for (const [id, entry] of this.collectors) {
      const type = entry.metadata.type || 'unknown'
      byType[type] = (byType[type] || 0) + 1
    }

    return byType
  }
}

const collectorManager = new CollectorManager()
```

## Best Practices

### Resource Management
```js
// Always set reasonable time limits
const collector = channel.createMessageCollector({
  time: 60000, // 1 minute maximum
  max: 10,     // Reasonable maximum
  dispose: true
})

// Clean up on errors
process.on('uncaughtException', () => {
  collectorManager.stopAll()
  process.exit(1)
})
```

### Error Handling
```js
collector.on('collect', async (item) => {
  try {
    await processItem(item)
  } catch (error) {
    console.error('Collector processing error:', error)
    // Don't crash the collector, just log the error
  }
})
```

### Performance Monitoring
```js
// Monitor collector performance
setInterval(() => {
  const stats = collectorManager.getStats()
  console.log('Collector stats:', stats)

  if (stats.activeCollectors > 100) {
    console.warn('High collector count detected')
  }
}, 60000)
```

## Next Steps

- [Message Collectors](/collectors/message-collectors) - Collecting message inputs
- [Component Collectors](/collectors/component-collectors) - Collecting component interactions
- [Filters](/collectors/filters) - Advanced filtering patterns
- [Performance](/collectors/performance) - Scaling and optimization