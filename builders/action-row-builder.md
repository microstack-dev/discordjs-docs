# ActionRowBuilder

Organize interactive components in horizontal rows within messages and modals.

## Overview

`ActionRowBuilder` creates horizontal rows that contain interactive components like buttons and select menus. It's the container that groups components together and defines their layout within Discord's UI system.

## Basic Example

```js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('actions')
  .setDescription('Display action buttons')

export async function execute(interaction) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('primary')
        .setLabel('Primary Action')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('secondary')
        .setLabel('Secondary Action')
        .setStyle(ButtonStyle.Secondary)
    )

  await interaction.reply({
    content: 'Choose an action:',
    components: [row]
  })
}
```

## Advanced Usage

### Multi-Row Layout with Select Menu
```js
export async function createComplexMenu(interaction) {
  // Button row
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('edit')
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('delete')
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    )

  // Select menu row
  const selectRow = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('action_select')
        .setPlaceholder('Choose an additional action')
        .addOptions(
          {
            label: 'Share',
            description: 'Share this item',
            value: 'share'
          },
          {
            label: 'Archive',
            description: 'Move to archive',
            value: 'archive'
          },
          {
            label: 'Duplicate',
            description: 'Create a copy',
            value: 'duplicate'
          }
        )
    )

  await interaction.reply({
    content: 'Item Management',
    components: [buttonRow, selectRow]
  })
}
```

### Dynamic Row Building with Permissions
```js
export function createAdminControls(userPermissions) {
  const components = []

  // Always available
  components.push(
    new ButtonBuilder()
      .setCustomId('refresh')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
  )

  // Permission-based buttons
  if (userPermissions.includes('MANAGE_MESSAGES')) {
    components.push(
      new ButtonBuilder()
        .setCustomId('purge')
        .setLabel('Purge Messages')
        .setStyle(ButtonStyle.Danger)
    )
  }

  if (userPermissions.includes('BAN_MEMBERS')) {
    components.push(
      new ButtonBuilder()
        .setCustomId('ban')
        .setLabel('Ban User')
        .setStyle(ButtonStyle.Danger)
    )
  }

  // Create rows with maximum 5 components per row
  const rows = []
  for (let i = 0; i < components.length; i += 5) {
    const rowComponents = components.slice(i, i + 5)
    rows.push(
      new ActionRowBuilder().addComponents(rowComponents)
    )
  }

  return rows
}

export async function execute(interaction) {
  const userPermissions = interaction.member.permissions.toArray()
  const rows = createAdminControls(userPermissions)

  await interaction.reply({
    content: 'Administrative Controls',
    components: rows,
    ephemeral: true
  })
}
```

## Limits & Constraints

### Component Limits per Row
- **Maximum 5 buttons** per ActionRow
- **Maximum 1 select menu** per ActionRow
- **Cannot mix** buttons and select menus in same row

### Message Limits
- **Maximum 5 ActionRows** per message
- **Maximum 25 total components** per message

### Validation Examples
```js
// Valid: Mixed component types in separate rows
const buttonRow = new ActionRowBuilder()
  .addComponents(button1, button2, button3)

const selectRow = new ActionRowBuilder()
  .addComponents(selectMenu)

await interaction.reply({
  components: [buttonRow, selectRow]
})

// Error: Mixing buttons and select menu in same row
const mixedRow = new ActionRowBuilder()
  .addComponents(button1, selectMenu) // Will throw error
```

## Best Practices

### Logical Component Grouping
```js
// Good: Group related actions together
const navigationRow = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('Previous'),
    new ButtonBuilder().setCustomId('next').setLabel('Next')
  )

const actionsRow = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setCustomId('edit').setLabel('Edit'),
    new ButtonBuilder().setCustomId('delete').setLabel('Delete')
  )
```

### Consistent Button Ordering
```js
// Good: Primary actions first, destructive last
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
  )
```

### Responsive Component Distribution
```js
// Good: Balance components across rows
function distributeComponents(components) {
  const rows = []
  const maxPerRow = 5

  for (let i = 0; i < components.length; i += maxPerRow) {
    const chunk = components.slice(i, i + maxPerRow)
    rows.push(new ActionRowBuilder().addComponents(chunk))
  }

  return rows
}
```

## Common Mistakes

### Exceeding Component Limits
```js
// Bad: Too many buttons in one row
const overcrowdedRow = new ActionRowBuilder()
  .addComponents(btn1, btn2, btn3, btn4, btn5, btn6) // Exceeds 5 button limit

// Good: Split into multiple rows
const row1 = new ActionRowBuilder().addComponents(btn1, btn2, btn3, btn4, btn5)
const row2 = new ActionRowBuilder().addComponents(btn6)
```

### Mixing Incompatible Components
```js
// Bad: Buttons and select menu in same row
const invalidRow = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setCustomId('btn'),
    new StringSelectMenuBuilder().setCustomId('select') // Incompatible
  )

// Good: Separate rows
const buttonRow = new ActionRowBuilder().addComponents(button)
const selectRow = new ActionRowBuilder().addComponents(selectMenu)
```

### Ignoring Message Component Limits
```js
// Bad: Too many rows per message
const tooManyRows = []
for (let i = 0; i < 10; i++) { // Exceeds 5 row limit
  tooManyRows.push(new ActionRowBuilder().addComponents(button))
}

// Good: Limit to 5 rows maximum
const maxRows = rows.slice(0, 5)
await interaction.reply({ components: maxRows })
```

## Next Steps

- [ButtonBuilder](/builders/button-builder) - Create interactive buttons
- [StringSelectMenuBuilder](/builders/string-select-menu-builder) - Create dropdown menus