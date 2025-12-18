# ModalBuilder

Create interactive modal forms for collecting user input through Discord interactions.

## Overview

`ModalBuilder` constructs popup modals that can collect structured user input through text fields, dropdowns, and other form elements. Perfect for surveys, configuration forms, and data collection.

## Basic Example

```js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Submit feedback')

export async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('feedback_form')
    .setTitle('Feedback Form')

  // Add text input
  const feedbackInput = new TextInputBuilder()
    .setCustomId('feedback_text')
    .setLabel('Your feedback')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder('Share your thoughts with us...')

  const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput)
  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
}
```

## Advanced Usage

### Complex Form Modal
```js
export async function createRegistrationModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('user_registration')
    .setTitle('User Registration')
    .setDescription('Complete your profile information')

  // Username field
  const usernameInput = new TextInputBuilder()
    .setCustomId('username')
    .setLabel('Username')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(20)
    .setPlaceholder('Enter your desired username')
    .setValue(interaction.user.username)

  // Email field
  const emailInput = new TextInputBuilder()
    .setCustomId('email')
    .setLabel('Email Address')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('user@example.com')

  // Bio field
  const bioInput = new TextInputBuilder()
    .setCustomId('bio')
    .setLabel('Bio')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Tell us about yourself...')

  // Experience field
  const experienceInput = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('Experience Level')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Beginner, Intermediate, or Advanced')

  // Create action rows
  const firstRow = new ActionRowBuilder().addComponents(usernameInput)
  const secondRow = new ActionRowBuilder().addComponents(emailInput)
  const thirdRow = new ActionRowBuilder().addComponents(bioInput)
  const fourthRow = new ActionRowBuilder().addComponents(experienceInput)

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow)

  await interaction.showModal(modal)
}
```

### Dynamic Modal Generation
```js
export function createDynamicModal(formConfig, userData = {}) {
  const modal = new ModalBuilder()
    .setCustomId(formConfig.id)
    .setTitle(formConfig.title)

  if (formConfig.description) {
    modal.setDescription(formConfig.description)
  }

  // Generate fields from configuration
  formConfig.fields.forEach(fieldConfig => {
    const input = createTextInput(fieldConfig, userData[fieldConfig.id])
    const actionRow = new ActionRowBuilder().addComponents(input)
    modal.addComponents(actionRow)
  })

  return modal
}

function createTextInput(config, defaultValue = '') {
  const input = new TextInputBuilder()
    .setCustomId(config.id)
    .setLabel(config.label)
    .setStyle(getStyle(config.type))
    .setRequired(config.required || false)

  // Apply optional properties
  if (config.placeholder) {
    input.setPlaceholder(config.placeholder)
  }

  if (config.maxLength) {
    input.setMaxLength(config.maxLength)
  }

  if (config.minLength) {
    input.setMinLength(config.minLength)
  }

  if (defaultValue) {
    input.setValue(defaultValue)
  }

  return input
}

function getStyle(type) {
  const styles = {
    'short': TextInputStyle.Short,
    'paragraph': TextInputStyle.Paragraph
  }
  return styles[type] || TextInputStyle.Short
}

// Usage
const modalConfig = {
  id: 'survey_modal',
  title: 'User Survey',
  description: 'Help us improve your experience',
  fields: [
    {
      id: 'satisfaction',
      label: 'How satisfied are you?',
      type: 'short',
      required: true,
      placeholder: 'Rate 1-10'
    },
    {
      id: 'improvements',
      label: 'What improvements would you like?',
      type: 'paragraph',
      required: false,
      maxLength: 1000
    }
  ]
}

const surveyModal = createDynamicModal(modalConfig)
```

### Multi-Step Modal
```js
export async function createMultiStepModal(interaction, step = 1) {
  const modal = new ModalBuilder()
    .setCustomId(`multi_step_${step}`)
    .setTitle(`Step ${step} of 3`)

  switch (step) {
    case 1:
      // Personal information
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('full_name')
            .setLabel('Full Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('age')
            .setLabel('Age')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('18-100')
        )
      )
      break

    case 2:
      // Preferences
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('interests')
            .setLabel('Interests')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('What are you interested in?')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('experience')
            .setLabel('Experience Level')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Beginner, Intermediate, Advanced')
        )
      )
      break

    case 3:
      // Additional information
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('comments')
            .setLabel('Additional Comments')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(1000)
        )
      )
      break
  }

  await interaction.showModal(modal)
}
```

### Validation Modal
```js
export async function createValidationModal(interaction, data) {
  const modal = new ModalBuilder()
    .setCustomId('validation_form')
    .setTitle('Confirm Your Information')

  // Display current data for confirmation
  const nameInput = new TextInputBuilder()
    .setCustomId('confirm_name')
    .setLabel('Name (confirm or edit)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(data.name || '')

  const emailInput = new TextInputBuilder()
    .setCustomId('confirm_email')
    .setLabel('Email (confirm or edit)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(data.email || '')

  const phoneInput = new TextInputBuilder()
    .setCustomId('confirm_phone')
    .setLabel('Phone (confirm or edit)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(data.phone || '')

  // Add validation note
  const noteInput = new TextInputBuilder()
    .setCustomId('validation_note')
    .setLabel('Any corrections needed?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder('Let us know if anything needs to be corrected...')

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(emailInput),
    new ActionRowBuilder().addComponents(phoneInput),
    new ActionRowBuilder().addComponents(noteInput)
  )

  await interaction.showModal(modal)
}
```

## Modal Components

### Text Input Styles
```js
// Short text input (single line)
const shortInput = new TextInputBuilder()
  .setStyle(TextInputStyle.Short)
  .setMaxLength(100)

// Paragraph text input (multi-line)
const paragraphInput = new TextInputBuilder()
  .setStyle(TextInputStyle.Paragraph)
  .setMaxLength(4000)
```

### Input Validation
```js
const validatedInput = new TextInputBuilder()
  .setCustomId('validated_field')
  .setLabel('Validated Field')
  .setStyle(TextInputStyle.Short)
  .setRequired(true)
  .setMinLength(5)
  .setMaxLength(50)
  .setPlaceholder('Enter 5-50 characters')
```

### Pre-filled Values
```js
const preFilledInput = new TextInputBuilder()
  .setCustomId('prefilled')
  .setLabel('Pre-filled Field')
  .setStyle(TextInputStyle.Short)
  .setValue('Default value')
  .setRequired(false)
```

## Modal Properties

### Basic Properties
```js
const modal = new ModalBuilder()
  .setCustomId('unique_modal_id')
  .setTitle('Modal Title')
  .setDescription('Optional description')
```

### Component Organization
```js
const modal = new ModalBuilder()
  .setTitle('Form with Multiple Fields')

// Add up to 5 action rows
modal.addComponents(
  new ActionRowBuilder().addComponents(input1),
  new ActionRowBuilder().addComponents(input2),
  new ActionRowBuilder().addComponents(input3),
  new ActionRowBuilder().addComponents(input4),
  new ActionRowBuilder().addComponents(input5)
)
```

## Limits and Constraints

### Modal Limits
- **Title Length**: Maximum 45 characters
- **Custom ID Length**: Maximum 100 characters
- **Components**: Maximum 5 action rows
- **Fields per Row**: 1 text input per action row

### Input Field Limits
- **Label Length**: Maximum 45 characters
- **Placeholder Length**: Maximum 100 characters
- **Short Input**: Maximum 4000 characters
- **Paragraph Input**: Maximum 4000 characters
- **Minimum Length**: 0-4000 characters
- **Maximum Length**: 1-4000 characters

### Validation Examples
```js
// Valid modal
const validModal = new ModalBuilder()
  .setCustomId('valid_modal')
  .setTitle('Valid Title')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('field')
        .setLabel('Field')
        .setStyle(TextInputStyle.Short)
    )
  )

// Error: Title too long
const invalidModal = new ModalBuilder()
  .setCustomId('invalid_modal')
  .setTitle('This title is way too long and exceeds the maximum character limit for Discord modals')
```

## Best Practices

### Clear, Concise Titles
```js
// Good: Descriptive and short
const goodModal = new ModalBuilder()
  .setTitle('Feedback Form')
  .setTitle('User Registration')
  .setTitle('Bug Report')

// Bad: Vague or too long
const badModal = new ModalBuilder()
  .setTitle('Form')
  .setTitle('Please fill out this form with your information')
```

### Logical Field Organization
```js
// Good: Group related fields
const organizedModal = new ModalBuilder()
  .setTitle('User Profile')

// Personal information first
.addComponents(
  new ActionRowBuilder().addComponents(nameInput),
  new ActionRowBuilder().addComponents(emailInput)
)

// Preferences second
.addComponents(
  new ActionRowBuilder().addComponents(interestsInput),
  new ActionRowBuilder().addComponents(experienceInput)
)
```

### Appropriate Field Types
```js
// Good: Use appropriate input styles
const appropriateFields = [
  new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Name')
    .setStyle(TextInputStyle.Short),  // Good for short text
  
  new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)  // Good for long text
]
```

## Common Mistakes

### Too Many Fields
```js
// Bad: More than 5 action rows
const overcrowdedModal = new ModalBuilder()
  .setTitle('Too Many Fields')

// This will fail - 6 action rows
for (let i = 0; i < 6; i++) {
  overcrowdedModal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(`field_${i}`)
        .setLabel(`Field ${i}`)
        .setStyle(TextInputStyle.Short)
    )
  )
}

// Good: Split into multiple modals
const firstModal = new ModalBuilder()
  .setTitle('Step 1: Basic Info')
  .addComponents(/* 3-5 fields max */)

const secondModal = new ModalBuilder()
  .setTitle('Step 2: Additional Info')
  .addComponents(/* 3-5 fields max */)
```

### Missing Required Fields
```js
// Bad: Required field without proper validation
const invalidField = new TextInputBuilder()
  .setCustomId('required_field')
  .setLabel('Required Field')
  .setStyle(TextInputStyle.Short)
  .setRequired(true)
  // Missing setMinLength for required field

// Good: Proper validation for required fields
const validField = new TextInputBuilder()
  .setCustomId('required_field')
  .setLabel('Required Field')
  .setStyle(TextInputStyle.Short)
  .setRequired(true)
  .setMinLength(1)
  .setMaxLength(100)
```

### Poor User Experience
```js
// Bad: Unclear field labels
const confusingModal = new ModalBuilder()
  .setTitle('Form')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('field1')
        .setLabel('Field 1')
        .setStyle(TextInputStyle.Short)
    )
  )

// Good: Clear, descriptive labels
const clearModal = new ModalBuilder()
  .setTitle('Contact Information')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('email_address')
        .setLabel('Email Address')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('user@example.com')
    )
  )
```

## Modal Submission Handling

```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit()) {
    const modalId = interaction.customId
    
    switch (modalId) {
      case 'feedback_form':
        await handleFeedbackSubmission(interaction)
        break
      case 'user_registration':
        await handleRegistrationSubmission(interaction)
        break
      default:
        await interaction.reply({
          content: 'Unknown form submitted',
          ephemeral: true
        })
    }
  }
})

async function handleFeedbackSubmission(interaction) {
  const feedbackText = interaction.fields.getTextInputValue('feedback_text')
  
  // Process feedback
  await saveFeedback(interaction.user.id, feedbackText)
  
  await interaction.reply({
    content: 'Thank you for your feedback!',
    ephemeral: true
  })
}
```

## Next Steps

- [FileBuilder](/builders/file-builder) - Handle file attachments
- [ContainerBuilder](/builders/container-builder) - Organize UI components
- [TextInputBuilder](/builders/text-input-builder) - Create text input fields