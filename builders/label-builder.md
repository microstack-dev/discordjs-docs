# LabelBuilder

Create descriptive labels and badges for UI components and content organization.

## Overview

`LabelBuilder` constructs styled labels and badges that can be used to categorize, highlight, or organize content. Perfect for status indicators, categories, and metadata display.

## Basic Example

```js
import { LabelBuilder, TextDisplayBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check system status')

export async function execute(interaction) {
  const statusLabel = new LabelBuilder()
    .setText('Online')
    .setStyle('success')
    .setIcon('🟢')
    .setSize('medium')

  const display = new TextDisplayBuilder()
    .setTitle('System Status')
    .setText(`Status: ${statusLabel.build()}`)

  await interaction.reply({
    content: display.build()
  })
}
```

## Advanced Usage

### Status Labels
```js
export function createStatusLabel(status, details = null) {
  const label = new LabelBuilder()
    .setText(status.toUpperCase())
    .setSize('medium')

  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
      return label.setStyle('success').setIcon('🟢')

    case 'offline':
    case 'inactive':
      return label.setStyle('danger').setIcon('🔴')

    case 'maintenance':
      return label.setStyle('warning').setIcon('🟡')

    case 'loading':
    case 'pending':
      return label.setStyle('info').setIcon('🔄')

    default:
      return label.setStyle('secondary').setIcon('⚪')
  }
}

// Usage
const onlineLabel = createStatusLabel('online')
const maintenanceLabel = createStatusLabel('maintenance', 'Scheduled maintenance')
```

### Category Labels
```js
export function createCategoryLabel(category, count = null) {
  const label = new LabelBuilder()
    .setText(category)
    .setStyle('category')
    .setSize('small')

  // Add category-specific styling
  const categoryStyles = {
    'announcement': { color: 'purple', icon: '📢' },
    'tutorial': { color: 'blue', icon: '📚' },
    'bug': { color: 'red', icon: '🐛' },
    'feature': { color: 'green', icon: '✨' },
    'question': { color: 'orange', icon: '❓' }
  }

  const style = categoryStyles[category.toLowerCase()] || { color: 'gray', icon: '📄' }
  
  label.setColor(style.color).setIcon(style.icon)

  if (count !== null) {
    label.setBadge(count.toString())
  }

  return label
}

// Usage
const tutorialLabel = createCategoryLabel('tutorial', 12)
const bugLabel = createCategoryLabel('bug', 3)
```

### Priority Labels
```js
export function createPriorityLabel(priority) {
  const label = new LabelBuilder()
    .setText(priority)
    .setSize('small')
    .setBorder(true)

  const priorityConfig = {
    'critical': { style: 'danger', icon: '🚨', color: 'red' },
    'high': { style: 'warning', icon: '⚠️', color: 'orange' },
    'medium': { style: 'info', icon: '📋', color: 'blue' },
    'low': { style: 'secondary', icon: '📝', color: 'gray' }
  }

  const config = priorityConfig[priority.toLowerCase()] || priorityConfig['medium']
  
  return label
    .setStyle(config.style)
    .setIcon(config.icon)
    .setColor(config.color)
}

// Usage
const criticalLabel = createPriorityLabel('critical')
const mediumLabel = createPriorityLabel('medium')
```

### User Role Labels
```js
export function createRoleLabel(role, permissions = []) {
  const label = new LabelBuilder()
    .setText(role)
    .setSize('medium')
    .setShape('rounded')

  const roleStyles = {
    'administrator': { color: 'red', icon: '👑', style: 'gradient' },
    'moderator': { color: 'orange', icon: '🛡️', style: 'filled' },
    'vip': { color: 'purple', icon: '💎', style: 'gradient' },
    'member': { color: 'blue', icon: '👤', style: 'default' },
    'guest': { color: 'gray', icon: '👋', style: 'outline' }
  }

  const style = roleStyles[role.toLowerCase()] || roleStyles['guest']
  
  label
    .setColor(style.color)
    .setIcon(style.icon)
    .setStyle(style.style)

  // Add permission indicators
  if (permissions.length > 0) {
    label.setTooltip(`Permissions: ${permissions.join(', ')}`)
  }

  return label
}

// Usage
const adminLabel = createRoleLabel('administrator', ['ban', 'kick', 'manage'])
const memberLabel = createRoleLabel('member')
```

### Metadata Labels
```js
export function createMetadataLabel(type, value, format = null) {
  const label = new LabelBuilder()
    .setText(value)
    .setSize('small')
    .setStyle('metadata')

  const typeConfig = {
    'date': { icon: '📅', color: 'blue' },
    'time': { icon: '🕐', color: 'green' },
    'version': { icon: '🏷️', color: 'purple' },
    'size': { icon: '📏', color: 'orange' },
    'count': { icon: '🔢', color: 'red' }
  }

  const config = typeConfig[type.toLowerCase()] || typeConfig['count']
  
  label.setIcon(config.icon).setColor(config.color)

  // Apply formatting
  if (format) {
    switch (format) {
      case 'short':
        label.setFormat('abbreviated')
        break
      case 'long':
        label.setFormat('full')
        break
      case 'relative':
        label.setFormat('timeago')
        break
    }
  }

  return label
}

// Usage
const dateLabel = createMetadataLabel('date', '2024-01-15', 'short')
const versionLabel = createMetadataLabel('version', 'v2.1.0')
```

## Label Styles

### Status Styles
```js
// Success/Green
const successLabel = new LabelBuilder()
  .setText('Complete')
  .setStyle('success')
  .setIcon('✅')

// Warning/Yellow
const warningLabel = new LabelBuilder()
  .setText('Warning')
  .setStyle('warning')
  .setIcon('⚠️')

// Danger/Red
const dangerLabel = new LabelBuilder()
  .setText('Error')
  .setStyle('danger')
  .setIcon('❌')
```

### Information Styles
```js
// Info/Blue
const infoLabel = new LabelBuilder()
  .setText('Info')
  .setStyle('info')
  .setIcon('ℹ️')

// Secondary/Gray
const secondaryLabel = new LabelBuilder()
  .setText('Secondary')
  .setStyle('secondary')
  .setIcon('📄')
```

### Custom Styles
```js
const customLabel = new LabelBuilder()
  .setText('Custom')
  .setStyle('custom')
  .setColor('#FF6B6B')
  .setBackgroundColor('#2D2D2D')
  .setBorderColor('#FF6B6B')
```

## Label Properties

### Size Options
```js
const smallLabel = new LabelBuilder().setSize('small')
const mediumLabel = new LabelBuilder().setSize('medium')
const largeLabel = new LabelBuilder().setSize('large')
```

### Shape Options
```js
const squareLabel = new LabelBuilder().setShape('square')
const roundedLabel = new LabelBuilder().setShape('rounded')
const pillLabel = new LabelBuilder().setShape('pill')
```

### Border Options
```js
const borderedLabel = new LabelBuilder()
  .setBorder(true)
  .setBorderWidth(2)
  .setBorderStyle('solid')
```

## Limits and Constraints

### Text Limits
- **Label Text**: Maximum 50 characters
- **Tooltip**: Maximum 200 characters
- **Badge Text**: Maximum 10 characters

### Icon Limits
- **Icon Size**: Maximum 32x32 pixels
- **Custom Icons**: Must be valid emoji or Unicode character

### Validation Examples
```js
// Valid label
const validLabel = new LabelBuilder()
  .setText('Valid Label')
  .setStyle('success')

// Error: Text too long
const invalidLabel = new LabelBuilder()
  .setText('This label text is way too long and exceeds the maximum character limit')
  .setStyle('info')
```

## Best Practices

### Clear, Concise Text
```js
// Good: Short, descriptive labels
const goodLabels = [
  new LabelBuilder().setText('Active').setStyle('success'),
  new LabelBuilder().setText('Pending').setStyle('warning'),
  new LabelBuilder().setText('Failed').setStyle('danger')
]

// Bad: Vague or long labels
const badLabels = [
  new LabelBuilder().setText('This is the current status'),
  new LabelBuilder().setText('P')
]
```

### Consistent Color Coding
```js
// Good: Consistent meaning across colors
const statusColors = {
  success: 'green',    // Completed, active, online
  warning: 'orange',   // Pending, warning, maintenance
  danger: 'red',       // Failed, error, offline
  info: 'blue',        // Information, neutral
  secondary: 'gray'    // Disabled, inactive
}
```

### Appropriate Icons
```js
// Good: Icons that match the label meaning
const meaningfulIcons = {
  'online': '🟢',
  'offline': '🔴',
  'warning': '⚠️',
  'error': '❌',
  'success': '✅'
}

// Bad: Conflicting or irrelevant icons
const confusingIcons = {
  'online': '❌',    // Conflicting meaning
  'error': '✅',     // Opposite meaning
  'warning': '😊'   // Irrelevant emotion
}
```

## Common Mistakes

### Overloading Labels
```js
// Bad: Too much information in one label
const overloadedLabel = new LabelBuilder()
  .setText('ERROR: CRITICAL SYSTEM FAILURE IMMEDIATE ACTION REQUIRED')
  .setStyle('danger')
  .setIcon('🚨')
  .setBadge('999')
  .setTooltip('This is a critical error that requires immediate attention...')

// Good: Separate concerns
const errorType = new LabelBuilder()
  .setText('CRITICAL')
  .setStyle('danger')
  .setIcon('🚨')

const errorCount = new LabelBuilder()
  .setText('999')
  .setStyle('secondary')
```

### Inconsistent Styling
```js
// Bad: Mixed styles for similar concepts
const inconsistentLabels = [
  new LabelBuilder().setText('Success').setStyle('success').setColor('green'),
  new LabelBuilder().setText('Complete').setStyle('info').setColor('blue'), // Should be success
  new LabelBuilder().setText('Done').setStyle('secondary').setColor('gray')  // Should be success
]
```

### Poor Color Contrast
```js
// Bad: Hard to read color combinations
const poorContrast = new LabelBuilder()
  .setText('Hard to Read')
  .setColor('#FFFF00')  // Yellow text
  .setBackgroundColor('#FFFFCC')  // Light yellow background

// Good: High contrast
const goodContrast = new LabelBuilder()
  .setText('Easy to Read')
  .setColor('#FFFFFF')  // White text
  .setBackgroundColor('#2D2D2D')  // Dark background
```

## Integration with Other Builders

### With SectionBuilder
```js
const section = new SectionBuilder()
  .setTitle('Status Overview')
  .addLabel(createStatusLabel('online'))
  .addLabel(createCategoryLabel('system'))
```

### With TextDisplayBuilder
```js
const display = new TextDisplayBuilder()
  .setTitle('System Information')
  .setText(`Status: ${createStatusLabel('active').build()}`)
```

## Performance Considerations

- Labels are lightweight and render quickly
- Complex styling may impact rendering slightly
- Use labels sparingly to avoid visual clutter
- Cache frequently used label configurations

## Next Steps

- [SeparatorBuilder](/builders/separator-builder) - Create visual dividers between content
- [ThumbnailBuilder](/builders/thumbnail-builder) - Add image thumbnails to content
- [MediaGalleryBuilder](/builders/media-gallery-builder) - Create media collections