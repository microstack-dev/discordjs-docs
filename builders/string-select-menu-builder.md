# StringSelectMenuBuilder

Create dropdown menus for string-based selections.

## Overview

`StringSelectMenuBuilder` constructs dropdown select menus that allow users to choose from predefined string options. These menus provide a clean interface for multiple choice selections and are essential for complex user interactions.

## Basic Example

```js
import { StringSelectMenuBuilder, ActionRowBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('select')
  .setDescription('Choose from options')

export async function execute(interaction) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('color_choice')
    .setPlaceholder('Choose your favorite color')
    .addOptions(
      {
        label: 'Red',
        description: 'A bold, energetic color',
        value: 'red'
      },
      {
        label: 'Blue',
        description: 'A calm, trustworthy color',
        value: 'blue'
      },
      {
        label: 'Green',
        description: 'A natural, refreshing color',
        value: 'green'
      }
    )

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'What is your favorite color?',
    components: [row]
  })
}
```

## Advanced Usage

### Dynamic Options with Categories
```js
export function createCategorySelect(serverCategories) {
  const options = []

  // Add category options
  serverCategories.forEach(category => {
    if (category.type === 'GUILD_CATEGORY') {
      options.push({
        label: category.name,
        description: `Category with ${category.children.size} channels`,
        value: `category_${category.id}`,
        emoji: '📁'
      })
    }
  })

  // Add "None" option
  options.push({
    label: 'No Category',
    description: 'Place in root level',
    value: 'no_category',
    emoji: '📍'
  })

  return new StringSelectMenuBuilder()
    .setCustomId('channel_category')
    .setPlaceholder('Select a category')
    .addOptions(options.slice(0, 25)) // Discord limit
}

export async function execute(interaction) {
  const categories = interaction.guild.channels.cache.filter(
    channel => channel.type === 'GUILD_CATEGORY'
  )

  const selectMenu = createCategorySelect(categories)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Choose a category for the new channel:',
    components: [row],
    ephemeral: true
  })
}
```

### Multi-Select with Pagination
```js
export function createPagedSelect(options, page = 1, pageSize = 20) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageOptions = options.slice(startIndex, endIndex)

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`paged_select_${page}`)
    .setPlaceholder(`Page ${page} - Select options`)
    .addOptions(pageOptions)

  // Add navigation options if multiple pages
  if (options.length > pageSize) {
    selectMenu.addOptions([
      {
        label: page > 1 ? '⬅️ Previous Page' : '⬅️ Previous Page (Disabled)',
        value: `page_${page - 1}`,
        description: page > 1 ? `Go to page ${page - 1}` : 'No previous page'
      },
      {
        label: endIndex < options.length ? '➡️ Next Page' : '➡️ Next Page (Disabled)',
        value: `page_${page + 1}`,
        description: endIndex < options.length ? `Go to page ${page + 1}` : 'No more pages'
      }
    ])
  }

  return selectMenu
}

export async function execute(interaction) {
  // Generate 50 sample options
  const allOptions = Array.from({ length: 50 }, (_, i) => ({
    label: `Option ${i + 1}`,
    description: `This is option number ${i + 1}`,
    value: `option_${i + 1}`
  }))

  const selectMenu = createPagedSelect(allOptions, 1, 20)
  const row = new ActionRowBuilder().addComponents(selectMenu)

  await interaction.reply({
    content: 'Choose from the available options:',
    components: [row]
  })
}
```

## Limits & Constraints

### Options Limits
- **Maximum 25 options** per select menu
- **Maximum 100 characters** per option label
- **Maximum 100 characters** per option description
- **Maximum 100 characters** per option value

### Placeholder Limits
- **Maximum 150 characters** for placeholder text
- **Required** when menu has options

### Custom ID Limits
- **Maximum 100 characters**
- **Alphanumeric, hyphens, underscores only**

### Validation Examples
```js
// Valid select menu
const validMenu = new StringSelectMenuBuilder()
  .setCustomId('choice_menu')
  .setPlaceholder('Make a selection')
  .addOptions([
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' }
  ])

// Error: Too many options
const invalidMenu = new StringSelectMenuBuilder()
  .setCustomId('too_many')
  .addOptions(Array(26).fill({ label: 'Option', value: 'opt' })) // Exceeds 25 limit

// Error: Invalid option value
const invalidValue = new StringSelectMenuBuilder()
  .setCustomId('invalid')
  .addOptions([
    { label: 'Option', value: 'invalid@value!' } // Invalid characters
  ])
```

## Best Practices

### Descriptive Option Labels
```js
// Good: Clear, descriptive options
const goodOptions = [
  {
    label: 'Beginner Tutorial',
    description: 'Step-by-step guide for new users',
    value: 'tutorial_beginner'
  },
  {
    label: 'Advanced Configuration',
    description: 'Complex setup and customization',
    value: 'config_advanced'
  }
]

// Avoid: Unclear labels
const badOptions = [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Thing 2', value: 'thing2' }
]
```

### Logical Value Structure
```js
// Good: Structured values for easy parsing
const structuredValues = [
  { label: 'Server Settings', value: 'category_server' },
  { label: 'User Preferences', value: 'category_user' },
  { label: 'System Configuration', value: 'category_system' }
]

// Avoid: Inconsistent value patterns
const inconsistentValues = [
  { label: 'Server', value: 'srv' },
  { label: 'User Settings', value: 'userPrefsComplex' },
  { label: 'System', value: 'sys_conf' }
]
```

### Accessible Placeholder Text
```js
// Good: Helpful placeholder
const helpfulPlaceholder = new StringSelectMenuBuilder()
  .setPlaceholder('Select your notification preference')

// Avoid: Unhelpful placeholder
const unhelpfulPlaceholder = new StringSelectMenuBuilder()
  .setPlaceholder('Choose option')
```

## Common Mistakes

### Missing Placeholder
```js
// Bad: No placeholder provided
const noPlaceholder = new StringSelectMenuBuilder()
  .setCustomId('missing_placeholder')
  .addOptions(options) // Will cause issues

// Good: Always provide placeholder
const withPlaceholder = new StringSelectMenuBuilder()
  .setCustomId('with_placeholder')
  .setPlaceholder('Choose an option')
  .addOptions(options)
```

### Duplicate Values
```js
// Bad: Duplicate values cause conflicts
const duplicateValues = new StringSelectMenuBuilder()
  .setCustomId('duplicates')
  .addOptions([
    { label: 'Option A', value: 'same_value' },
    { label: 'Option B', value: 'same_value' } // Duplicate
  ])

// Good: Unique values
const uniqueValues = new StringSelectMenuBuilder()
  .setCustomId('unique')
  .addOptions([
    { label: 'Option A', value: 'option_a' },
    { label: 'Option B', value: 'option_b' }
  ])
```

### Ignoring Selection Limits
```js
// Bad: Exceeds option limit
const tooManyOptions = new StringSelectMenuBuilder()
  .setCustomId('too_many')
  .addOptions(Array(30).fill().map((_, i) => ({
    label: `Option ${i}`,
    value: `opt${i}`
  }))) // Exceeds 25 limit

// Good: Implement pagination
const paginatedOptions = options.slice(0, 25)
const paginatedMenu = new StringSelectMenuBuilder()
  .setCustomId('paginated')
  .addOptions(paginatedOptions)
```

## Next Steps

- [UserSelectMenuBuilder](/builders/user-select-menu-builder) - Select users from server
- [RoleSelectMenuBuilder](/builders/role-select-menu-builder) - Select roles from server