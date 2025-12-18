# TextDisplayBuilder

Create formatted text displays with various styles and formatting options.

## Overview

`TextDisplayBuilder` constructs formatted text displays for Discord messages, supporting markdown, code blocks, and various text styles. It's ideal for creating rich text content.

## Basic Example

```js
import { TextDisplayBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Create an announcement')

export async function execute(interaction) {
  const announcement = new TextDisplayBuilder()
    .setTitle('📢 Server Announcement')
    .setText('Important update for all members!')
    .setStyle('announcement')
    .addMetadata({
      author: interaction.user.tag,
      timestamp: new Date().toISOString()
    })

  await interaction.reply({
    content: announcement.build()
  })
}
```

## Advanced Usage

### Rich Text Formatting
```js
export async function createRichDisplay(interaction) {
  const display = new TextDisplayBuilder()
    .setTitle('📚 Documentation Guide')
    .setSubtitle('Everything you need to know')
    .setText(`
This guide covers all essential topics:

**Getting Started**
- Installation and setup
- Basic configuration
- First bot creation

**Advanced Features**
- Custom commands
- Database integration
- Web dashboard setup

*For more details, visit our documentation website.*
    `)
    .setStyle('guide')
    .addFormatting(['bold', 'italic', 'code'])
    .setAlignment('left')

  await interaction.reply({
    content: display.build()
  })
}
```

### Code Display
```js
export async function createCodeDisplay(interaction) {
  const codeExample = new TextDisplayBuilder()
    .setTitle('Code Example')
    .setSubtitle('JavaScript Discord.js Example')
    .setText(`
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.on('ready', () => {
  console.log(\`Logged in as \${client.user.tag}\`)
})

client.login(process.env.DISCORD_TOKEN)
    `)
    .setStyle('code')
    .setLanguage('javascript')
    .setLineNumbers(true)
    .setTheme('dark')

  await interaction.reply({
    content: codeExample.build()
  })
}
```

### Dynamic Text Display
```js
export function createStatsDisplay(userStats, serverStats) {
  const display = new TextDisplayBuilder()
    .setTitle('📊 Statistics Dashboard')
    .setStyle('dashboard')

  let content = `
**User Statistics**
- Messages: ${userStats.messages.toLocaleString()}
- Commands Used: ${userStats.commands.toLocaleString()}
- Online Time: ${userStats.onlineTime} hours

**Server Statistics**
- Total Members: ${serverStats.members.toLocaleString()}
- Active Channels: ${serverStats.channels}
- Server Level: ${serverStats.level}
  `

  // Add achievement badges
  if (userStats.achievements.length > 0) {
    content += '\n\n**🏆 Achievements**\n'
    userStats.achievements.forEach(achievement => {
      content += `- ${achievement.icon} ${achievement.name}\n`
    })
  }

  display.setText(content.trim())

  // Add footer with last updated time
  display.setFooter(`Last updated: ${new Date().toLocaleString()}`)

  return display
}
```

### Multi-Column Display
```js
export async function createColumnDisplay(interaction) {
  const display = new TextDisplayBuilder()
    .setTitle('Feature Comparison')
    .setStyle('comparison')
    .setColumns(3)

  display.addColumn('Basic', [
    '✅ Slash Commands',
    '✅ Message Handling',
    '✅ Basic Moderation',
    '❌ Advanced Analytics'
  ])

  display.addColumn('Premium', [
    '✅ All Basic Features',
    '✅ Advanced Analytics',
    '✅ Custom Commands',
    '✅ Priority Support'
  ])

  display.addColumn('Enterprise', [
    '✅ All Premium Features',
    '✅ White Label Options',
    '✅ API Access',
    '✅ Dedicated Support'
  ])

  await interaction.reply({
    content: display.build()
  })
}
```

## Text Styles

### Announcement Style
```js
const announcement = new TextDisplayBuilder()
  .setTitle('📢 Important Announcement')
  .setText('This is an important message for all members.')
  .setStyle('announcement')
  .setUrgency('high')
```

### Guide Style
```js
const guide = new TextDisplayBuilder()
  .setTitle('📖 User Guide')
  .setText('Step-by-step instructions for using the bot.')
  .setStyle('guide')
  .setSections(['Getting Started', 'Advanced Features', 'Tips'])
```

### Code Style
```js
const code = new TextDisplayBuilder()
  .setTitle('Code Example')
  .setText('console.log("Hello, World!");')
  .setStyle('code')
  .setLanguage('javascript')
```

### List Style
```js
const list = new TextDisplayBuilder()
  .setTitle('Task List')
  .setStyle('list')
  .addItems([
    '✅ Complete setup',
    '🔄 Configure permissions',
    '⏳ Test commands'
  ])
```

## Formatting Options

### Markdown Formatting
```js
const formattedText = new TextDisplayBuilder()
  .setText('**Bold text** and *italic text*')
  .addFormatting(['bold', 'italic'])
  .enableCodeBlocks(true)
  .enableLinks(true)
```

### Code Blocks
```js
const codeBlock = new TextDisplayBuilder()
  .setText('print("Hello, World!")')
  .setStyle('code')
  .setLanguage('python')
  .setLineNumbers(true)
  .setTheme('monokai')
```

### Tables
```js
const table = new TextDisplayBuilder()
  .setStyle('table')
  .addHeaders(['Feature', 'Basic', 'Premium'])
  .addRow(['Commands', '✅', '✅'])
  .addRow(['Analytics', '❌', '✅'])
  .addRow(['Support', '📧', '⚡'])
```

## Limits and Constraints

### Text Limits
- **Title**: Maximum 256 characters
- **Subtitle**: Maximum 256 characters
- **Text Content**: Maximum 4096 characters
- **Footer**: Maximum 2048 characters

### Formatting Limits
- **Code Blocks**: Maximum 100 lines
- **Tables**: Maximum 20 rows, 10 columns
- **Lists**: Maximum 50 items

### Validation Examples
```js
// Valid display
const validDisplay = new TextDisplayBuilder()
  .setTitle('Valid Title')
  .setText('Valid content within character limits')

// Error: Text too long
const invalidDisplay = new TextDisplayBuilder()
  .setTitle('Title')
  .setText('x'.repeat(4097)) // Exceeds 4096 character limit
```

## Best Practices

### Clear Structure
```js
// Good: Well-organized content
const wellStructured = new TextDisplayBuilder()
  .setTitle('📋 Task List')
  .setSubtitle('Daily tasks and priorities')
  .setText(`
**High Priority**
- Complete project documentation
- Review pull requests

**Medium Priority**
- Update dependencies
- Write unit tests

**Low Priority**
- Clean up code comments
- Organize file structure
  `)
  .setStyle('task_list')
```

### Appropriate Formatting
```js
// Good: Use formatting purposefully
const purposefulFormatting = new TextDisplayBuilder()
  .setTitle('Installation Guide')
  .setText(`
**Step 1:** Install the package
\`\`\`bash
npm install discord.js
\`\`\`

**Step 2:** Import and configure
\`\`\`javascript
import { Client } from 'discord.js'
\`\`\`

*For more information, visit our documentation.*
  `)
```

### Consistent Styling
```js
// Good: Maintain consistent style across displays
const consistentStyle = new TextDisplayBuilder()
  .setTitle('Help Menu')
  .setStyle('help')
  .setTheme('server')
  .setAlignment('center')
```

## Common Mistakes

### Excessive Formatting
```js
// Bad: Too much formatting makes text hard to read
const overFormatted = new TextDisplayBuilder()
  .setText('**This is *way too* ~~much~~ formatting**')
  .addFormatting(['bold', 'italic', 'strikethrough', 'underline'])
```

### Missing Context
```js
// Bad: Text without proper context
const contextless = new TextDisplayBuilder()
  .setTitle('Error')
  .setText('Something went wrong.')
  // Missing: What error, how to fix, who to contact
```

### Inconsistent Styling
```js
// Bad: Mixed styles create confusion
const mixedStyles = new TextDisplayBuilder()
  .setTitle('Mixed Up')
  .setStyle('announcement')
  .addCodeBlock('console.log("code")')
  .addTable([['Data']])
```

## Integration with Other Builders

### With SectionBuilder
```js
const section = new SectionBuilder()
  .setTitle('Information Section')
  .setContent(
    new TextDisplayBuilder()
      .setText('Detailed information here')
      .setStyle('info')
      .build()
  )
```

### With EmbedBuilder
```js
const textDisplay = new TextDisplayBuilder()
  .setText('Formatted text content')

const embed = new EmbedBuilder()
  .setDescription(textDisplay.build())
  .setColor('Blue')
```

## Performance Considerations

- Text displays are built as strings, minimal memory usage
- Complex formatting may impact rendering time
- Large code blocks should be used sparingly
- Tables with many rows may cause performance issues

## Next Steps

- [LabelBuilder](/builders/label-builder) - Add descriptive labels to content
- [SeparatorBuilder](/builders/separator-builder) - Create visual dividers
- [ThumbnailBuilder](/builders/thumbnail-builder) - Add image thumbnails