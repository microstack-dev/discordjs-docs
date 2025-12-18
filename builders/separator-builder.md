# SeparatorBuilder

Create visual separators and dividers to organize content and improve readability.

## Overview

`SeparatorBuilder` constructs visual separators that help organize content into logical sections. Perfect for dividing long messages, creating visual hierarchy, and improving content structure.

## Basic Example

```js
import { SeparatorBuilder, TextDisplayBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('guide')
  .setDescription('Display a comprehensive guide')

export async function execute(interaction) {
  const separator = new SeparatorBuilder()
    .setType('line')
    .setStyle('solid')
    .setColor('blue')

  const display = new TextDisplayBuilder()
    .setTitle('User Guide')
    .setText(`
Section 1 content here.

${separator.build()}

Section 2 content here.

${separator.build()}

Section 3 content here.
    `)

  await interaction.reply({
    content: display.build()
  })
}
```

## Advanced Usage

### Themed Separators
```js
export function createThemedSeparator(theme) {
  const separator = new SeparatorBuilder()
    .setType('line')

  switch (theme) {
    case 'modern':
      return separator
        .setStyle('gradient')
        .setColor('blue')
        .setThickness(2)
        .setOpacity(0.8)

    case 'minimal':
      return separator
        .setStyle('dotted')
        .setColor('gray')
        .setThickness(1)
        .setOpacity(0.5)

    case 'bold':
      return separator
        .setStyle('double')
        .setColor('black')
        .setThickness(3)
        .setOpacity(1.0)

    case 'elegant':
      return separator
        .setStyle('decorative')
        .setColor('gold')
        .setThickness(2)
        .setPattern('❦ ❦ ❦')

    default:
      return separator.setStyle('solid').setColor('gray')
  }
}

// Usage
const modernSeparator = createThemedSeparator('modern')
const minimalSeparator = createThemedSeparator('minimal')
```

### Content Dividers
```js
export async function createStructuredContent(interaction) {
  // Header separator
  const headerSeparator = new SeparatorBuilder()
    .setType('header')
    .setText('📚 USER GUIDE')
    .setAlignment('center')
    .setStyle('bold')

  // Section separator
  const sectionSeparator = new SeparatorBuilder()
    .setType('section')
    .setStyle('line')
    .setColor('blue')
    .setThickness(1)
    .setMargin('20px 0')

  // Subsection separator
  const subsectionSeparator = new SeparatorBuilder()
    .setType('subsection')
    .setStyle('dashed')
    .setColor('gray')
    .setThickness(1)
    .setMargin('10px 0')

  const content = `
${headerSeparator.build()}

## Getting Started

Welcome to the comprehensive user guide. This section covers the basics.

${sectionSeparator.build()}

### Installation

Follow these steps to install the application:

1. Download the installer
2. Run the setup wizard
3. Configure your settings

${subsectionSeparator.build()}

### First Steps

After installation, complete these initial tasks:

- Create your account
- Set up your profile
- Join a server

${sectionSeparator.build()}

## Advanced Features

Explore advanced capabilities and customization options.

${headerSeparator.build()}
  `

  await interaction.reply({ content })
}
```

### Interactive Separators
```js
export function createInteractiveSeparator(label, actionId) {
  const separator = new SeparatorBuilder()
    .setType('interactive')
    .setStyle('button')
    .setColor('primary')
    .setLabel(label)
    .setActionId(actionId)

  return separator
}

export async function createCollapsibleContent(interaction) {
  const expandSeparator = new SeparatorBuilder()
    .setType('collapsible')
    .setLabel('▼ Click to expand')
    .setStyle('interactive')
    .setColor('blue')

  const collapseSeparator = new SeparatorBuilder()
    .setType('collapsible')
    .setLabel('▲ Click to collapse')
    .setStyle('interactive')
    .setColor('blue')

  const content = `
${expandSeparator.build()}

**Hidden Content**
This content is initially hidden and can be expanded by clicking the separator above.

${collapseSeparator.build()}
  `

  await interaction.reply({ content })
}
```

### Custom Pattern Separators
```js
export function createPatternSeparator(pattern, color) {
  return new SeparatorBuilder()
    .setType('pattern')
    .setPattern(pattern)
    .setColor(color)
    .setRepeat('fill')
    .setSpacing(5)
}

// Usage examples
const starSeparator = createPatternSeparator('⭐', 'yellow')
const heartSeparator = createPatternSeparator('❤️', 'red')
const dashSeparator = createPatternSeparator('—', 'gray')

export async function createStyledContent(interaction) {
  const content = `
Section 1 content

${starSeparator.build()}

Section 2 content

${heartSeparator.build()}

Section 3 content

${dashSeparator.build()}

Section 4 content
  `

  await interaction.reply({ content })
}
```

### Progress Separators
```js
export function createProgressSeparator(current, total, color = 'blue') {
  const percentage = Math.round((current / total) * 100)
  
  return new SeparatorBuilder()
    .setType('progress')
    .setStyle('bar')
    .setColor(color)
    .setCurrent(current)
    .setTotal(total)
    .setLabel(`${percentage}% Complete`)
    .setShowText(true)
}

export async function createProgressContent(interaction) {
  const step1Separator = createProgressSeparator(1, 4, 'red')
  const step2Separator = createProgressSeparator(2, 4, 'orange')
  const step3Separator = createProgressSeparator(3, 4, 'yellow')
  const step4Separator = createProgressSeparator(4, 4, 'green')

  const content = `
**Step 1: Setup**
${step1Separator.build()}

**Step 2: Configuration**
${step2Separator.build()}

**Step 3: Testing**
${step3Separator.build()}

**Step 4: Deployment**
${step4Separator.build()}
  `

  await interaction.reply({ content })
}
```

## Separator Types

### Line Separator
```js
const lineSeparator = new SeparatorBuilder()
  .setType('line')
  .setStyle('solid')
  .setColor('gray')
  .setThickness(1)
```

### Text Separator
```js
const textSeparator = new SeparatorBuilder()
  .setType('text')
  .setText('--- SECTION BREAK ---')
  .setAlignment('center')
  .setStyle('bold')
```

### Icon Separator
```js
const iconSeparator = new SeparatorBuilder()
  .setType('icon')
  .setIcon('⚡')
  .setRepeat(5)
  .setSpacing(10)
```

### Space Separator
```js
const spaceSeparator = new SeparatorBuilder()
  .setType('space')
  .setHeight('20px')
  .setStyle('transparent')
```

## Separator Styles

### Line Styles
```js
// Solid line
const solidLine = new SeparatorBuilder()
  .setStyle('solid')

// Dashed line
const dashedLine = new SeparatorBuilder()
  .setStyle('dashed')

// Dotted line
const dottedLine = new SeparatorBuilder()
  .setStyle('dotted')

// Double line
const doubleLine = new SeparatorBuilder()
  .setStyle('double')

// Gradient line
const gradientLine = new SeparatorBuilder()
  .setStyle('gradient')
  .setColors(['blue', 'purple'])
```

### Decorative Styles
```js
// Decorative pattern
const decorative = new SeparatorBuilder()
  .setStyle('decorative')
  .setPattern('❦ ❦ ❦')

// Custom emoji
const emojiSeparator = new SeparatorBuilder()
  .setStyle('emoji')
  .setIcon('🌟')
  .setRepeat(3)
```

## Limits and Constraints

### Text Limits
- **Separator Text**: Maximum 100 characters
- **Label Text**: Maximum 50 characters
- **Pattern**: Maximum 200 characters

### Visual Limits
- **Thickness**: 1-10 pixels
- **Opacity**: 0.0-1.0
- **Spacing**: 0-50 pixels

### Validation Examples
```js
// Valid separator
const validSeparator = new SeparatorBuilder()
  .setType('line')
  .setStyle('solid')
  .setColor('blue')

// Error: Invalid type
const invalidSeparator = new SeparatorBuilder()
  .setType('invalid_type')
  .setStyle('solid')
```

## Best Practices

### Consistent Visual Hierarchy
```js
// Good: Logical separator hierarchy
const headerSeparator = new SeparatorBuilder()
  .setType('header')
  .setStyle('bold')
  .setThickness(3)

const sectionSeparator = new SeparatorBuilder()
  .setType('section')
  .setStyle('solid')
  .setThickness(2)

const subsectionSeparator = new SeparatorBuilder()
  .setType('subsection')
  .setStyle('dashed')
  .setThickness(1)
```

### Appropriate Spacing
```js
// Good: Proper spacing between content
const wellSpaced = new SeparatorBuilder()
  .setType('line')
  .setMargin('20px 0')
  .setPadding('10px 0')
```

### Thematic Consistency
```js
// Good: Consistent with overall theme
const themedSeparator = new SeparatorBuilder()
  .setColor('#0066CC')  // Match brand color
  .setStyle('solid')
  .setThickness(2)
```

## Common Mistakes

### Overuse of Separators
```js
// Bad: Too many separators break content flow
const overused = `
Content here

${separator.build()}

More content

${separator.build()}

Even more content

${separator.build()}

Final content
`

// Good: Use separators to divide major sections
const wellUsed = `
Major section 1 content here.

${majorSeparator.build()}

Major section 2 content here.
`
```

### Inconsistent Styling
```js
// Bad: Mixed styles create visual confusion
const inconsistent = [
  new SeparatorBuilder().setStyle('solid').setColor('blue'),
  new SeparatorBuilder().setStyle('dashed').setColor('red'),
  new SeparatorBuilder().setStyle('dotted').setColor('green')
]

// Good: Consistent styling
const consistent = [
  new SeparatorBuilder().setStyle('solid').setColor('blue'),
  new SeparatorBuilder().setStyle('solid').setColor('blue'),
  new SeparatorBuilder().setStyle('solid').setColor('blue')
]
```

### Poor Visual Choice
```js
// Bad: Hard to see separator
const invisible = new SeparatorBuilder()
  .setColor('#FFFFFF')  // White on white background
  .setThickness(1)
  .setOpacity(0.1)

// Good: High contrast separator
const visible = new SeparatorBuilder()
  .setColor('#666666')  // Gray on white background
  .setThickness(2)
  .setOpacity(0.8)
```

## Integration with Other Builders

### With TextDisplayBuilder
```js
const display = new TextDisplayBuilder()
  .setTitle('Structured Content')
  .setText(`
Content section 1

${new SeparatorBuilder().setType('line').build()}

Content section 2
  `)
```

### With SectionBuilder
```js
const section = new SectionBuilder()
  .setTitle('Section Title')
  .setSeparator(
    new SeparatorBuilder()
      .setType('line')
      .setStyle('solid')
  )
```

## Performance Considerations

- Separators are lightweight and render quickly
- Complex patterns may impact rendering slightly
- Use appropriate opacity for better performance
- Avoid excessive decorative elements

## Next Steps

- [ThumbnailBuilder](/builders/thumbnail-builder) - Add image thumbnails to content
- [MediaGalleryBuilder](/builders/media-gallery-builder) - Create media collections
- [MediaGalleryItemBuilder](/builders/media-gallery-item-builder) - Individual media items