# TextInputBuilder

Create text input fields for modal forms with validation and formatting options.

## Overview

`TextInputBuilder` constructs text input fields for Discord modals, providing controlled text input with validation, formatting, and user experience features. Essential for collecting structured user input through modal interactions.

## Basic Example

```js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Submit feedback')

export async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('feedback_modal')
    .setTitle('Feedback Form')

  const feedbackInput = new TextInputBuilder()
    .setCustomId('feedback_text')
    .setLabel('Your feedback')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Share your thoughts with us...')
    .setRequired(true)
    .setMaxLength(1000)

  const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput)
  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
}
```

## Advanced Usage

### Multi-Field Modal Form
```js
export function createUserProfileModal() {
  const modal = new ModalBuilder()
    .setCustomId('profile_setup')
    .setTitle('Complete Your Profile')

  // Username input
  const usernameInput = new TextInputBuilder()
    .setCustomId('username')
    .setLabel('Display Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your display name')
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(32)

  // Bio input
  const bioInput = new TextInputBuilder()
    .setCustomId('bio')
    .setLabel('Bio')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell us about yourself...')
    .setRequired(false)
    .setMaxLength(500)

  // Favorite game input
  const gameInput = new TextInputBuilder()
    .setCustomId('favorite_game')
    .setLabel('Favorite Game')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('What game do you play most?')
    .setRequired(false)
    .setMaxLength(100)

  // Experience level input
  const experienceInput = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('Experience Level')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Beginner, Intermediate, or Advanced')
    .setRequired(true)
    .setMaxLength(20)

  // Website input
  const websiteInput = new TextInputBuilder()
    .setCustomId('website')
    .setLabel('Website/Social Media')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com or @twitter_handle')
    .setRequired(false)
    .setMaxLength(200)

  modal.addComponents(
    new ActionRowBuilder().addComponents(usernameInput),
    new ActionRowBuilder().addComponents(bioInput),
    new ActionRowBuilder().addComponents(gameInput),
    new ActionRowBuilder().addComponents(experienceInput),
    new ActionRowBuilder().addComponents(websiteInput)
  )

  return modal
}

export async function execute(interaction) {
  const modal = createUserProfileModal()
  await interaction.showModal(modal)
}
```

### Dynamic Input Validation
```js
export function createEmailCollectionModal() {
  const modal = new ModalBuilder()
    .setCustomId('email_collection')
    .setTitle('Newsletter Signup')

  const emailInput = new TextInputBuilder()
    .setCustomId('email')
    .setLabel('Email Address')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('user@example.com')
    .setRequired(true)
    .setMaxLength(254) // RFC 5321 limit

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Full Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('John Doe')
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(100)

  const interestsInput = new TextInputBuilder()
    .setCustomId('interests')
    .setLabel('Interests (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('What topics interest you? (e.g., gaming, programming, art)')
    .setRequired(false)
    .setMaxLength(300)

  modal.addComponents(
    new ActionRowBuilder().addComponents(emailInput),
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(interestsInput)
  )

  return modal
}

export async function execute(interaction) {
  const modal = createEmailCollectionModal()
  await interaction.showModal(modal)
}

// Modal submission handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return

  if (interaction.customId === 'email_collection') {
    const email = interaction.fields.getTextInputValue('email')
    const name = interaction.fields.getTextInputValue('name')
    const interests = interaction.fields.getTextInputValue('interests') || 'Not specified'

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return await interaction.reply({
        content: 'Please enter a valid email address.',
        ephemeral: true
      })
    }

    // Process the data
    await saveNewsletterSignup(email, name, interests)

    await interaction.reply({
      content: `Thank you ${name}! You've been signed up with ${email}.`,
      ephemeral: true
    })
  }
})
```

### Conditional Input Forms
```js
export function createSupportTicketModal() {
  const modal = new ModalBuilder()
    .setCustomId('support_ticket')
    .setTitle('Create Support Ticket')

  const categoryInput = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Issue Category')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('bug, feature, account, billing, other')
    .setRequired(true)
    .setMaxLength(50)

  const subjectInput = new TextInputBuilder()
    .setCustomId('subject')
    .setLabel('Subject')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Brief description of the issue')
    .setRequired(true)
    .setMaxLength(100)

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Detailed Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Please provide as much detail as possible about the issue...')
    .setRequired(true)
    .setMaxLength(2000)

  const priorityInput = new TextInputBuilder()
    .setCustomId('priority')
    .setLabel('Priority Level')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('low, medium, high, urgent')
    .setRequired(true)
    .setMaxLength(10)

  const contactInput = new TextInputBuilder()
    .setCustomId('contact')
    .setLabel('Preferred Contact Method')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('discord, email: user@example.com')
    .setRequired(false)
    .setMaxLength(100)

  modal.addComponents(
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(priorityInput),
    new ActionRowBuilder().addComponents(contactInput)
  )

  return modal
}
```

## Input Styles

### Short Text Input
```js
const shortInput = new TextInputBuilder()
  .setCustomId('short_field')
  .setLabel('Short Input')
  .setStyle(TextInputStyle.Short)
  .setPlaceholder('Single line input')
  .setMaxLength(100)
```

### Paragraph Text Input
```js
const paragraphInput = new TextInputBuilder()
  .setCustomId('long_field')
  .setLabel('Long Input')
  .setStyle(TextInputStyle.Paragraph)
  .setPlaceholder('Multi-line input...')
  .setMaxLength(1000)
```

## Limits & Constraints

### Text Input Limits
- **Label Length**: Maximum 45 characters
- **Placeholder Length**: Maximum 100 characters
- **Short Input**: Maximum 4000 characters
- **Paragraph Input**: Maximum 4000 characters
- **Custom ID Length**: Maximum 100 characters

### Modal Limits
- **Inputs per Modal**: Maximum 5 text inputs
- **Modal Title**: Maximum 45 characters

### Validation Examples
```js
// Valid text input
const validInput = new TextInputBuilder()
  .setCustomId('valid_input')
  .setLabel('Valid Label')
  .setStyle(TextInputStyle.Short)
  .setMaxLength(100)

// Error: Label too long
const invalidLabel = new TextInputBuilder()
  .setCustomId('input')
  .setLabel('This label is way too long and exceeds the 45 character limit')
  .setStyle(TextInputStyle.Short)

// Error: Invalid length constraints
const invalidLengths = new TextInputBuilder()
  .setCustomId('length_test')
  .setLabel('Test')
  .setStyle(TextInputStyle.Short)
  .setMinLength(10)
  .setMaxLength(5) // Min > Max
```

## Best Practices

### Clear, Descriptive Labels
```js
// Good: Clear, descriptive labels
const goodInputs = [
  new TextInputBuilder()
    .setCustomId('email')
    .setLabel('Email Address')
    .setPlaceholder('user@example.com'),
  new TextInputBuilder()
    .setCustomId('feedback')
    .setLabel('Your Feedback')
    .setPlaceholder('Share your thoughts...')
]

// Avoid: Unclear labels
const badInputs = [
  new TextInputBuilder()
    .setCustomId('field1')
    .setLabel('Input')
    .setPlaceholder('Enter something'),
  new TextInputBuilder()
    .setCustomId('text')
    .setLabel('Text Field')
    .setPlaceholder('Type here')
]
```

### Appropriate Input Styles
```js
// Good: Choose appropriate styles
const appropriateInputs = [
  new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Full Name')
    .setStyle(TextInputStyle.Short) // Short input for names
    .setMaxLength(100),
  new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Project Description')
    .setStyle(TextInputStyle.Paragraph) // Paragraph for longer text
    .setMaxLength(1000)
]

// Avoid: Wrong style choices
const inappropriateInputs = [
  new TextInputBuilder()
    .setCustomId('email')
    .setLabel('Email')
    .setStyle(TextInputStyle.Paragraph), // Should be Short
  new TextInputBuilder()
    .setCustomId('first_name')
    .setLabel('First Name')
    .setStyle(TextInputStyle.Paragraph) // Should be Short
]
```

### Helpful Placeholder Text
```js
// Good: Helpful, contextual placeholders
const helpfulPlaceholders = [
  new TextInputBuilder()
    .setCustomId('phone')
    .setLabel('Phone Number')
    .setPlaceholder('+1 (555) 123-4567'),
  new TextInputBuilder()
    .setCustomId('date')
    .setLabel('Event Date')
    .setPlaceholder('YYYY-MM-DD'),
  new TextInputBuilder()
    .setCustomId('url')
    .setLabel('Website URL')
    .setPlaceholder('https://example.com')
]

// Avoid: Unhelpful placeholders
const unhelpfulPlaceholders = [
  new TextInputBuilder()
    .setCustomId('input')
    .setLabel('Input Field')
    .setPlaceholder('Enter text here'),
  new TextInputBuilder()
    .setCustomId('data')
    .setLabel('Data')
    .setPlaceholder('Type something')
]
```

## Common Mistakes

### Missing Required Validation
```js
// Bad: No client-side validation
const unvalidatedInput = new TextInputBuilder()
  .setCustomId('email')
  .setLabel('Email')
  .setStyle(TextInputStyle.Short)
  .setRequired(true)
// No length limits or format validation

// Good: Proper validation constraints
const validatedInput = new TextInputBuilder()
  .setCustomId('email')
  .setLabel('Email Address')
  .setStyle(TextInputStyle.Short)
  .setRequired(true)
  .setMaxLength(254)
  .setPlaceholder('user@example.com')
```

### Inconsistent Input Patterns
```js
// Bad: Inconsistent naming and requirements
const inconsistentModal = new ModalBuilder()
  .setTitle('Form')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('field_1')
        .setLabel('First Field')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('second_field')
        .setLabel('2nd Field')
        .setRequired(false) // Inconsistent with first field
    )
  )

// Good: Consistent patterns
const consistentModal = new ModalBuilder()
  .setTitle('Contact Form')
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Full Name')
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Message (Optional)')
        .setRequired(false)
        .setMaxLength(500)
    )
  )
```

### Ignoring Length Limits
```js
// Bad: No length constraints
const unlimitedInput = new TextInputBuilder()
  .setCustomId('unlimited')
  .setLabel('Unlimited Input')
  .setStyle(TextInputStyle.Paragraph)
// No max length - could cause issues

// Good: Appropriate length limits
const limitedInput = new TextInputBuilder()
  .setCustomId('limited')
  .setLabel('Limited Input')
  .setStyle(TextInputStyle.Paragraph)
  .setMaxLength(1000) // Reasonable limit
```

### Poor Error Handling
```js
// Bad: No validation in submission handler
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === 'form') {
    const value = interaction.fields.getTextInputValue('field')
    // No validation - could process invalid data
    await processForm(value)
  }
})

// Good: Proper validation and error handling
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === 'email_form') {
    const email = interaction.fields.getTextInputValue('email')
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return await interaction.reply({
        content: 'Please enter a valid email address.',
        ephemeral: true
      })
    }
    
    await processEmailForm(email)
    await interaction.reply({
      content: 'Form submitted successfully!',
      ephemeral: true
    })
  }
})
```

## Next Steps

- [ModalBuilder](/builders/modal-builder) - Create modal forms with text inputs
- [SlashCommandBuilder](/builders/slash-command-builder) - Create slash commands