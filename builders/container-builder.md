# ContainerBuilder

Organize and structure UI components within Discord messages and modals.

## Overview

`ContainerBuilder` creates logical containers for UI components, providing structure and organization to complex interfaces. It's essential for building clean, maintainable component layouts.

## Basic Example

```js
import { ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('menu')
  .setDescription('Display an interactive menu')

export async function execute(interaction) {
  // Create container for navigation buttons
  const navigationContainer = new ContainerBuilder()
    .setId('navigation')
    .setType('action_row')

  // Create action row with buttons
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
    )

  await interaction.reply({
    content: 'Navigation Menu',
    components: [buttonRow]
  })
}
```

## Advanced Usage

### Multi-Container Layout
```js
import { 
  ContainerBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder 
} from 'discord.js'

export async function createComplexMenu(interaction) {
  // Header container with title and actions
  const headerContainer = new ContainerBuilder()
    .setId('header')
    .setType('action_row')
    .setComponents([
      new ButtonBuilder()
        .setCustomId('refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('settings')
        .setLabel('Settings')
        .setStyle(ButtonStyle.Secondary)
    ])

  // Main content container with select menu
  const contentContainer = new ContainerBuilder()
    .setId('content')
    .setType('action_row')
    .setComponents([
      new StringSelectMenuBuilder()
        .setCustomId('main_menu')
        .setPlaceholder('Select an option')
        .addOptions(
          { label: 'Profile', value: 'profile' },
          { label: 'Inventory', value: 'inventory' },
          { label: 'Stats', value: 'stats' }
        )
    ])

  // Footer container with navigation
  const footerContainer = new ContainerBuilder()
    .setId('footer')
    .setType('action_row')
    .setComponents([
      new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('home')
        .setLabel('Home')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('forward')
        .setLabel('Forward')
        .setStyle(ButtonStyle.Secondary)
    ])

  await interaction.reply({
    content: 'Complex Menu System',
    components: [
      headerContainer.toJSON(),
      contentContainer.toJSON(),
      footerContainer.toJSON()
    ]
  })
}
```

### Dynamic Container Building
```js
export function createMenuContainer(menuType, userPermissions) {
  const container = new ContainerBuilder()
    .setId(`menu_${menuType}`)
    .setType('action_row')

  const components = []

  // Add menu-specific components
  switch (menuType) {
    case 'admin':
      if (userPermissions.includes('ADMINISTRATOR')) {
        components.push(
          new ButtonBuilder()
            .setCustomId('admin_panel')
            .setLabel('Admin Panel')
            .setStyle(ButtonStyle.Danger)
        )
      }
      break

    case 'moderation':
      if (userPermissions.includes('KICK_MEMBERS')) {
        components.push(
          new ButtonBuilder()
            .setCustomId('kick_user')
            .setLabel('Kick User')
            .setStyle(ButtonStyle.Secondary)
        )
      }
      break

    case 'user':
      components.push(
        new ButtonBuilder()
          .setCustomId('profile')
          .setLabel('Profile')
          .setStyle(ButtonStyle.Primary)
      )
      break
  }

  // Add help button to all menus
  components.push(
    new ButtonBuilder()
      .setCustomId('help')
      .setLabel('Help')
      .setStyle(ButtonStyle.Secondary)
  )

  return container.setComponents(components)
}
```

## Container Types

### Action Row Container
```js
const actionRowContainer = new ContainerBuilder()
  .setId('actions')
  .setType('action_row')
  .setComponents([
    new ButtonBuilder()
      .setCustomId('action1')
      .setLabel('Action 1')
      .setStyle(ButtonStyle.Primary)
  ])
```

### Modal Container
```js
const modalContainer = new ContainerBuilder()
  .setId('modal_content')
  .setType('modal')
  .setTitle('User Input Form')
  .setComponents([
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('username')
        .setLabel('Username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  ])
```

## Limits and Constraints

### Component Limits per Container
- **Action Rows**: Maximum 5 buttons or 1 select menu
- **Modal Containers**: Maximum 5 action rows
- **Container ID**: Maximum 100 characters
- **Total Components**: Maximum 25 components per message

### Validation Examples
```js
// Valid container
const validContainer = new ContainerBuilder()
  .setId('valid_container')
  .setType('action_row')
  .setComponents([
    new ButtonBuilder()
      .setCustomId('btn1')
      .setLabel('Button 1')
      .setStyle(ButtonStyle.Primary)
  ])

// Error: Too many components in action row
const invalidContainer = new ContainerBuilder()
  .setId('invalid')
  .setType('action_row')

// Adding 6 buttons will throw an error
for (let i = 0; i < 6; i++) {
  invalidContainer.addComponent(
    new ButtonBuilder()
      .setCustomId(`btn${i}`)
      .setLabel(`Button ${i}`)
      .setStyle(ButtonStyle.Secondary)
  )
}
```

## Best Practices

### Logical Container Organization
```js
// Good: Organized by function
const headerContainer = new ContainerBuilder()
  .setId('header_actions')
  .setType('action_row')
  .setComponents(headerButtons)

const mainContainer = new ContainerBuilder()
  .setId('main_content')
  .setType('action_row')
  .setComponents(mainContent)

const footerContainer = new ContainerBuilder()
  .setId('footer_navigation')
  .setType('action_row')
  .setComponents(navigationButtons)
```

### Descriptive Container IDs
```js
// Good: Clear, descriptive IDs
const userProfileContainer = new ContainerBuilder()
  .setId('user_profile_actions')
  .setType('action_row')

// Avoid: Generic IDs
const genericContainer = new ContainerBuilder()
  .setId('container1')
  .setType('action_row')
```

### Component Grouping
```js
// Group related components together
const moderationContainer = new ContainerBuilder()
  .setId('moderation_actions')
  .setType('action_row')
  .setComponents([
    new ButtonBuilder()
      .setCustomId('warn')
      .setLabel('Warn')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('kick')
      .setLabel('Kick')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ban')
      .setLabel('Ban')
      .setStyle(ButtonStyle.Danger)
  ])
```

## Common Mistakes

### Mixing Component Types
```js
// Error: Cannot mix buttons and select menus in same action row
const mixedContainer = new ContainerBuilder()
  .setId('mixed')
  .setType('action_row')
  .setComponents([
    new ButtonBuilder()
      .setCustomId('button')
      .setLabel('Button')
      .setStyle(ButtonStyle.Primary),
    new StringSelectMenuBuilder()
      .setCustomId('select')
      .setPlaceholder('Select')
  ])
```

### Exceeding Component Limits
```js
// Error: Too many components
const overloadedContainer = new ContainerBuilder()
  .setId('overloaded')
  .setType('action_row')

// This will fail when trying to add the 6th button
const buttons = []
for (let i = 0; i < 6; i++) {
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`btn${i}`)
      .setLabel(`Button ${i}`)
      .setStyle(ButtonStyle.Secondary)
  )
}
overloadedContainer.setComponents(buttons)
```

### Invalid Container Types
```js
// Error: Invalid container type
const invalidContainer = new ContainerBuilder()
  .setId('invalid')
  .setType('invalid_type') // Will throw error
```

## Integration with Other Builders

### With SectionBuilder
```js
const section = new SectionBuilder()
  .setTitle('User Actions')
  .setContainer(
    new ContainerBuilder()
      .setId('user_actions')
      .setType('action_row')
      .setComponents(userActionButtons)
  )
```

### With ModalBuilder
```js
const modal = new ModalBuilder()
  .setTitle('User Registration')
  .setCustomId('registration_form')

const container = new ContainerBuilder()
  .setId('form_fields')
  .setType('modal')
  .setComponents(formFields)

modal.addComponents(container.toJSON())
```

## Performance Considerations

- Containers are lightweight and have minimal performance impact
- Use containers to organize complex layouts
- Avoid nesting containers unnecessarily
- Keep container IDs short but descriptive

## Next Steps

- [SectionBuilder](/builders/section-builder) - Create structured content sections
- [ModalBuilder](/builders/modal-builder) - Build interactive forms