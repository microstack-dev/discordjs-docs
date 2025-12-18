# SectionBuilder

Create structured content sections with headers, content, and optional containers.

## Overview

`SectionBuilder` creates organized content sections that can include headers, descriptions, and interactive components. It's perfect for building structured messages and modals.

## Basic Example

```js
import { SectionBuilder, ContainerBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Display user profile')

export async function execute(interaction) {
  const profileSection = new SectionBuilder()
    .setTitle('User Profile')
    .setDescription('View and manage your profile information')
    .setContainer(
      new ContainerBuilder()
        .setId('profile_actions')
        .setType('action_row')
        .setComponents([
          new ButtonBuilder()
            .setCustomId('edit_profile')
            .setLabel('Edit Profile')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('view_stats')
            .setLabel('View Stats')
            .setStyle(ButtonStyle.Secondary)
        ])
    )

  await interaction.reply({
    content: profileSection.build()
  })
}
```

## Advanced Usage

### Multi-Section Layout
```js
export async function createDashboard(interaction) {
  // Header section
  const headerSection = new SectionBuilder()
    .setTitle('📊 Dashboard')
    .setDescription('Welcome to your personal dashboard')
    .setStyle('header')

  // Stats section
  const statsSection = new SectionBuilder()
    .setTitle('Statistics')
    .setDescription('Your activity statistics')
    .addFields([
      { name: 'Messages Sent', value: '1,234', inline: true },
      { name: 'Commands Used', value: '567', inline: true },
      { name: 'Server Count', value: '12', inline: true }
    ])
    .setContainer(
      new ContainerBuilder()
        .setId('stats_actions')
        .setType('action_row')
        .setComponents([
          new ButtonBuilder()
            .setCustomId('refresh_stats')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary)
        ])
    )

  // Actions section
  const actionsSection = new SectionBuilder()
    .setTitle('Quick Actions')
    .setDescription('Common tasks and utilities')
    .setContainer(
      new ContainerBuilder()
        .setId('quick_actions')
        .setType('action_row')
        .setComponents([
          new ButtonBuilder()
            .setCustomId('settings')
            .setLabel('Settings')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('help')
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('logout')
            .setLabel('Logout')
            .setStyle(ButtonStyle.Danger)
        ])
    )

  const content = [
    headerSection.build(),
    statsSection.build(),
    actionsSection.build()
  ].join('\n\n')

  await interaction.reply({ content })
}
```

### Dynamic Section Building
```js
export function createStatsSection(userStats, userRole) {
  const section = new SectionBuilder()
    .setTitle('📈 Your Statistics')
    .setDescription('Your recent activity and achievements')

  // Add role-specific fields
  const fields = [
    { name: 'Total Points', value: userStats.points.toString(), inline: true },
    { name: 'Level', value: userStats.level.toString(), inline: true },
    { name: 'Rank', value: `#${userStats.rank}`, inline: true }
  ]

  // Add admin-only fields
  if (userRole === 'admin') {
    fields.push(
      { name: 'Server Health', value: '98%', inline: true },
      { name: 'Active Users', value: '1,234', inline: true }
    )
  }

  section.addFields(fields)

  // Add action buttons based on role
  const buttons = []
  
  if (userRole === 'admin') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('admin_panel')
        .setLabel('Admin Panel')
        .setStyle(ButtonStyle.Danger)
    )
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId('detailed_stats')
      .setLabel('Detailed View')
      .setStyle(ButtonStyle.Primary)
  )

  section.setContainer(
    new ContainerBuilder()
      .setId('stats_actions')
      .setType('action_row')
      .setComponents(buttons)
  )

  return section
}
```

### Conditional Section Content
```js
export function createWelcomeSection(isNewUser, hasCompletedTutorial) {
  const section = new SectionBuilder()
    .setTitle('👋 Welcome!')
    .setDescription('Welcome to our community!')

  if (isNewUser) {
    section.addFields([
      { 
        name: 'Getting Started', 
        value: 'Complete the tutorial to unlock all features!',
        inline: false 
      }
    ])

    if (!hasCompletedTutorial) {
      section.setContainer(
        new ContainerBuilder()
          .setId('tutorial_actions')
          .setType('action_row')
          .setComponents([
            new ButtonBuilder()
              .setCustomId('start_tutorial')
              .setLabel('Start Tutorial')
              .setStyle(ButtonStyle.Primary)
          ])
      )
    }
  } else {
    section.addFields([
      { 
        name: 'Welcome Back!', 
        value: 'Continue where you left off or explore new features.',
        inline: false 
      }
    ])

    section.setContainer(
      new ContainerBuilder()
        .setId('return_actions')
        .setType('action_row')
        .setComponents([
          new ButtonBuilder()
            .setCustomId('continue')
            .setLabel('Continue')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('explore')
            .setLabel('Explore')
            .setStyle(ButtonStyle.Secondary)
        ])
    )
  }

  return section
}
```

## Section Styles

### Header Style
```js
const headerSection = new SectionBuilder()
  .setTitle('Main Title')
  .setStyle('header')
```

### Card Style
```js
const cardSection = new SectionBuilder()
  .setTitle('Card Title')
  .setDescription('Card description')
  .setStyle('card')
```

### List Style
```js
const listSection = new SectionBuilder()
  .setTitle('List Items')
  .setStyle('list')
  .addFields([
    { name: 'Item 1', value: 'Description 1', inline: false },
    { name: 'Item 2', value: 'Description 2', inline: false }
  ])
```

## Limits and Constraints

### Section Limits
- **Title**: Maximum 256 characters
- **Description**: Maximum 4096 characters
- **Fields**: Maximum 25 fields per section
- **Field Name**: Maximum 256 characters
- **Field Value**: Maximum 1024 characters

### Content Limits
```js
// Valid section
const validSection = new SectionBuilder()
  .setTitle('Valid Title')
  .setDescription('Valid description within limits')
  .addFields([
    { name: 'Field 1', value: 'Value 1' }
  ])

// Error: Title too long
const invalidSection = new SectionBuilder()
  .setTitle('This title is way too long and exceeds the maximum character limit allowed by Discord')
  .setDescription('This will throw an error')
```

## Best Practices

### Clear Section Hierarchy
```js
// Good: Logical section organization
const headerSection = new SectionBuilder()
  .setTitle('📊 Overview')
  .setDescription('System overview and status')
  .setStyle('header')

const detailsSection = new SectionBuilder()
  .setTitle('Detailed Information')
  .setDescription('In-depth details and metrics')
  .setStyle('card')

const actionsSection = new SectionBuilder()
  .setTitle('Available Actions')
  .setDescription('Actions you can perform')
  .setStyle('card')
```

### Consistent Field Formatting
```js
// Good: Consistent field structure
section.addFields([
  { name: 'User ID', value: userId, inline: true },
  { name: 'Username', value: username, inline: true },
  { name: 'Status', value: status, inline: true },
  { name: 'Last Active', value: lastActive, inline: false }
])
```

### Descriptive Titles and Descriptions
```js
// Good: Clear, informative content
const goodSection = new SectionBuilder()
  .setTitle('🔒 Security Settings')
  .setDescription('Configure your account security and privacy preferences')

// Avoid: Vague content
const vagueSection = new SectionBuilder()
  .setTitle('Settings')
  .setDescription('Configure stuff')
```

## Common Mistakes

### Too Many Fields
```js
// Error: Exceeds field limit
const tooManyFields = new SectionBuilder()
  .setTitle('Too Many Fields')

// Adding 26 fields will throw an error
for (let i = 0; i < 26; i++) {
  tooManyFields.addField(`Field ${i}`, `Value ${i}`)
}
```

### Missing Required Properties
```js
// Error: Missing title
const noTitle = new SectionBuilder()
  .setDescription('Description without title')

// Error: Empty title
const emptyTitle = new SectionBuilder()
  .setTitle('')
  .setDescription('Empty title')
```

### Invalid Field Values
```js
// Error: Field value too long
const longField = new SectionBuilder()
  .setTitle('Test')
  .addField('Short Name', 'x'.repeat(1025)) // Exceeds 1024 character limit
```

## Integration with Other Builders

### With ContainerBuilder
```js
const section = new SectionBuilder()
  .setTitle('Interactive Section')
  .setContainer(
    new ContainerBuilder()
      .setId('section_container')
      .setType('action_row')
      .setComponents(buttons)
  )
```

### With ModalBuilder
```js
const modalSection = new SectionBuilder()
  .setTitle('Form Section')
  .setDescription('Please fill out the required fields')

const modal = new ModalBuilder()
  .setTitle('User Form')
  .addComponents(modalSection.buildModal())
```

## Performance Considerations

- Sections are built as strings, minimal memory usage
- Complex sections with many fields may impact rendering
- Use sections to organize content logically
- Avoid overly long descriptions

## Next Steps

- [TextDisplayBuilder](/builders/text-display-builder) - Create formatted text displays
- [LabelBuilder](/builders/label-builder) - Add descriptive labels
- [SeparatorBuilder](/builders/separator-builder) - Create visual dividers