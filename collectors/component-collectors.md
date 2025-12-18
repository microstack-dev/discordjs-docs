# Component Collectors

Component collectors gather interactions from buttons, select menus, and other UI components. This page covers patterns for collecting component interactions with proper state management and validation.

## Basic Component Collection

### Button Interaction Collection

```js
const filter = (interaction) =>
  interaction.isButton() &&
  interaction.user.id === targetUserId

const collector = interaction.channel.createMessageComponentCollector({
  filter,
  time: 30000,
  max: 5
})

await interaction.reply({
  content: 'Click the buttons below:',
  components: [createButtonRow()]
})

collector.on('collect', async (componentInteraction) => {
  const buttonId = componentInteraction.customId

  await componentInteraction.reply({
    content: `You clicked: ${buttonId}`,
    ephemeral: true
  })
})

collector.on('end', (collected, reason) => {
  console.log(`Collected ${collected.size} button clicks`)
})
```

### Select Menu Collection

```js
const filter = (interaction) =>
  interaction.isStringSelectMenu() &&
  interaction.customId === 'color_select'

const collector = interaction.channel.createMessageComponentCollector({
  filter,
  time: 60000,
  max: 1
})

await interaction.reply({
  content: 'Choose your favorite color:',
  components: [createColorSelect()]
})

collector.on('collect', async (selectInteraction) => {
  const selectedValues = selectInteraction.values

  await selectInteraction.update({
    content: `You selected: ${selectedValues.join(', ')}`,
    components: []
  })
})
```

## Advanced Component Collection

### Multi-Step Component Flow

```js
class MultiStepComponentCollector {
  constructor(channel, userId) {
    this.channel = channel
    this.userId = userId
    this.step = 0
    this.data = {}
    this.message = null
  }

  async start() {
    await this.showStep()
  }

  async showStep() {
    const steps = [
      {
        title: 'Choose Category',
        content: 'What type of item would you like to create?',
        components: [this.createCategorySelect()]
      },
      {
        title: 'Enter Details',
        content: 'Provide the item details:',
        components: [this.createDetailInputs()]
      },
      {
        title: 'Confirm',
        content: 'Please confirm your choices:',
        components: [this.createConfirmationButtons()]
      }
    ]

    if (this.step >= steps.length) {
      await this.finish()
      return
    }

    const currentStep = steps[this.step]

    const embed = new EmbedBuilder()
      .setTitle(`${currentStep.title} (${this.step + 1}/${steps.length})`)
      .setDescription(currentStep.content)
      .setColor('Blue')

    // Add collected data to embed
    if (Object.keys(this.data).length > 0) {
      embed.addFields(
        Object.entries(this.data).map(([key, value]) => ({
          name: key,
          value: String(value),
          inline: true
        }))
      )
    }

    if (this.message) {
      await this.message.edit({
        embeds: [embed],
        components: currentStep.components
      })
    } else {
      this.message = await this.channel.send({
        embeds: [embed],
        components: currentStep.components
      })
    }

    await this.collectStepResponse()
  }

  async collectStepResponse() {
    const filter = (interaction) =>
      interaction.user.id === this.userId &&
      interaction.message.id === this.message.id

    const collector = this.channel.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
      max: 1
    })

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.isButton()) {
        if (componentInteraction.customId === 'cancel') {
          await componentInteraction.update({
            content: 'Operation cancelled.',
            embeds: [],
            components: []
          })
          return
        }

        if (componentInteraction.customId === 'back') {
          this.step = Math.max(0, this.step - 1)
          await this.showStep()
          return
        }

        if (componentInteraction.customId === 'next') {
          this.step++
          await this.showStep()
          return
        }

        if (componentInteraction.customId === 'confirm') {
          await this.finish()
          return
        }
      }

      if (componentInteraction.isStringSelectMenu()) {
        const selectedValues = componentInteraction.values

        if (componentInteraction.customId === 'category') {
          this.data.category = selectedValues[0]
        }

        await componentInteraction.update({
          content: 'Selection saved. Click Next to continue.',
          embeds: this.message.embeds,
          components: this.message.components
        })
      }

      if (componentInteraction.isModalSubmit()) {
        // Handle modal submission
        const fields = componentInteraction.fields

        this.data.name = fields.getTextInputValue('name')
        this.data.description = fields.getTextInputValue('description')

        await componentInteraction.update({
          content: 'Details saved. Click Next to continue.',
          embeds: this.message.embeds,
          components: this.message.components
        })
      }
    })

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        this.message.edit({
          content: 'Session timed out.',
          embeds: [],
          components: []
        }).catch(() => {})
      }
    })
  }

  createCategorySelect() {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('category')
        .setPlaceholder('Select a category')
        .addOptions(
          { label: 'Task', value: 'task', description: 'A task or todo item' },
          { label: 'Event', value: 'event', description: 'An event or meeting' },
          { label: 'Project', value: 'project', description: 'A project or initiative' }
        )
    )
  }

  createDetailInputs() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('edit_details')
        .setLabel('Edit Details')
        .setStyle(ButtonStyle.Primary)
    )
  }

  createConfirmationButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    )
  }

  async finish() {
    const embed = new EmbedBuilder()
      .setTitle('Item Created Successfully')
      .setDescription('Your item has been created with the following details:')
      .addFields(
        Object.entries(this.data).map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value),
          inline: true
        }))
      )
      .setColor('Green')

    await this.message.edit({
      embeds: [embed],
      components: []
    })
  }
}

// Usage
const flow = new MultiStepComponentCollector(interaction.channel, interaction.user.id)
await flow.start()
```

## Component Collector Options

### Filter Patterns

```js
// User-specific filter
const userFilter = (interaction) =>
  interaction.user.id === targetUserId

// Component type filter
const buttonFilter = (interaction) =>
  interaction.isButton()

// Custom ID pattern filter
const customIdFilter = (interaction) =>
  interaction.customId.startsWith('menu_')

// Complex filter
const complexFilter = (interaction) => {
  return interaction.user.id === userId &&
         interaction.customId.startsWith('wizard_') &&
         interaction.message.id === messageId
}
```

### Collector Configuration

```js
const collector = channel.createMessageComponentCollector({
  filter: complexFilter,
  time: 300000,     // 5 minutes
  max: 25,         // Maximum interactions
  maxUsers: 1,     // Only one user
  maxComponents: 10, // Maximum component types
  componentType: 'BUTTON' // Specific component type
})
```

## State Management with Collectors

### Collector State Tracking

```js
class StatefulComponentCollector {
  constructor(channel, userId) {
    this.channel = channel
    this.userId = userId
    this.state = {}
    this.collector = null
  }

  async start(initialState = {}) {
    this.state = { ...initialState }

    const filter = (interaction) =>
      interaction.user.id === this.userId &&
      this.isValidInteraction(interaction)

    this.collector = this.channel.createMessageComponentCollector({
      filter,
      time: 600000 // 10 minutes
    })

    this.collector.on('collect', (interaction) => {
      this.handleInteraction(interaction)
    })

    this.collector.on('end', (collected, reason) => {
      this.handleEnd(collected, reason)
    })

    await this.showCurrentState()
  }

  isValidInteraction(interaction) {
    // Validate interaction based on current state
    return true
  }

  async handleInteraction(interaction) {
    if (interaction.isButton()) {
      await this.handleButton(interaction)
    } else if (interaction.isStringSelectMenu()) {
      await this.handleSelect(interaction)
    }
  }

  async handleButton(interaction) {
    const action = interaction.customId.split('_')[0]

    switch (action) {
      case 'next':
        this.state.step++
        break
      case 'prev':
        this.state.step--
        break
      case 'save':
        await this.saveState()
        break
    }

    await this.showCurrentState()
    await interaction.deferUpdate()
  }

  async handleSelect(interaction) {
    const selectedValues = interaction.values
    this.state.selectedValues = selectedValues

    await this.showCurrentState()
    await interaction.deferUpdate()
  }

  async showCurrentState() {
    // Implementation depends on specific use case
  }

  async saveState() {
    // Save state to database
  }

  stop() {
    if (this.collector) {
      this.collector.stop()
    }
  }

  handleEnd(collected, reason) {
    console.log(`Collector ended: ${reason}`)
    // Cleanup logic
  }
}
```

## Best Practices

### Resource Management
```js
// Always set reasonable timeouts
const collector = channel.createMessageComponentCollector({
  time: 300000, // 5 minutes max
  max: 50,      // Reasonable interaction limit
  dispose: true // Handle deleted messages
})

// Clean up on process exit
process.on('exit', () => {
  collector.stop()
})
```

### Error Handling
```js
collector.on('collect', async (interaction) => {
  try {
    await processComponentInteraction(interaction)
  } catch (error) {
    console.error('Component processing error:', error)

    await interaction.reply({
      content: 'An error occurred processing your interaction.',
      ephemeral: true
    }).catch(() => {})
  }
})
```

### Performance Monitoring
```js
let interactionCount = 0

collector.on('collect', () => {
  interactionCount++

  if (interactionCount % 100 === 0) {
    console.log(`Processed ${interactionCount} interactions`)
  }
})
```

## Next Steps

- [Filters](/collectors/filters) - Advanced filtering patterns
- [Performance](/collectors/performance) - Scaling and optimization