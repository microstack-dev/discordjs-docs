# MessagePayload

Construct complete message payloads with all possible options and configurations.

## Overview

`MessagePayload` creates fully configured message objects that can be sent through various Discord.js methods. It provides a unified interface for building complex messages with embeds, attachments, components, and advanced options.

## Basic Example

```js
import { MessagePayload, EmbedBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('send-message')
  .setDescription('Send a complex message')

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Welcome!')
    .setDescription('Welcome to our server!')
    .setColor('Green')

  const payload = new MessagePayload(interaction.channel, {
    content: 'Hello everyone!',
    embeds: [embed],
    reply: { messageReference: interaction.id }
  })

  await interaction.followUp(payload)
}
```

## Advanced Usage

### Dynamic Payload Construction
```js
export function createUserWelcomePayload(member, customMessage = null) {
  const embed = new EmbedBuilder()
    .setTitle(`👋 Welcome ${member.user.username}!`)
    .setDescription(customMessage || `Welcome to ${member.guild.name}!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Account Created', value: member.user.createdAt.toDateString(), inline: true },
      { name: 'Member #', value: member.guild.memberCount.toString(), inline: true },
      { name: 'Joined At', value: member.joinedAt.toDateString(), inline: true }
    )
    .setColor('Green')
    .setTimestamp()

  const payload = new MessagePayload(member.guild.systemChannel, {
    content: `Everyone please welcome ${member.user}! 🎉`,
    embeds: [embed],
    allowedMentions: {
      users: [member.id],
      roles: [],
      everyone: false
    }
  })

  return payload
}

export async function execute(interaction) {
  const member = interaction.options.getMember('user')
  const message = interaction.options.getString('message')

  const payload = createUserWelcomePayload(member, message)

  await interaction.reply('Welcome message sent!')
  await payload.send() // Send the payload
}
```

### Interactive Message Payload with Components
```js
export function createPollPayload(question, options, channel) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Poll')
    .setDescription(question)
    .setColor('Blue')
    .setFooter({ text: 'React to vote!' })

  // Add options as fields
  options.forEach((option, index) => {
    embed.addFields({
      name: `${index + 1}. ${option}`,
      value: '0 votes',
      inline: false
    })
  })

  // Create vote buttons
  const buttons = options.map((option, index) =>
    new ButtonBuilder()
      .setCustomId(`vote_${index}`)
      .setLabel(`Vote ${index + 1}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(getNumberEmoji(index + 1))
  )

  // Split buttons into rows (max 5 per row)
  const rows = []
  for (let i = 0; i < buttons.length; i += 5) {
    const rowButtons = buttons.slice(i, i + 5)
    rows.push(new ActionRowBuilder().addComponents(rowButtons))
  }

  const payload = new MessagePayload(channel, {
    embeds: [embed],
    components: rows,
    allowedMentions: {
      parse: [] // Don't allow any mentions
    }
  })

  return payload
}

function getNumberEmoji(number) {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
  return emojis[number - 1] || '❓'
}

export async function execute(interaction) {
  const question = interaction.options.getString('question')
  const options = interaction.options.getString('options').split(',').map(opt => opt.trim())

  if (options.length < 2 || options.length > 10) {
    return await interaction.reply({
      content: 'Please provide between 2 and 10 options.',
      ephemeral: true
    })
  }

  const payload = createPollPayload(question, options, interaction.channel)

  await interaction.reply('Poll created!')
  await payload.send()
}
```

### File Upload Payload with Progress Tracking
```js
export function createFileUploadPayload(files, channel, options = {}) {
  const attachments = files.map(file =>
    new AttachmentBuilder(file.path)
      .setName(file.name)
      .setDescription(file.description)
  )

  const embed = new EmbedBuilder()
    .setTitle('📁 File Upload')
    .setDescription(`Uploading ${files.length} file(s)`)
    .setColor('Blue')
    .addFields(
      {
        name: 'Total Size',
        value: formatFileSize(files.reduce((total, file) => total + file.size, 0)),
        inline: true
      },
      {
        name: 'Files',
        value: files.map(f => f.name).join('\n').substring(0, 1024),
        inline: false
      }
    )
    .setTimestamp()

  const payload = new MessagePayload(channel, {
    content: options.message || 'Files uploaded successfully!',
    embeds: [embed],
    files: attachments,
    allowedMentions: {
      parse: options.allowMentions ? ['users', 'roles'] : []
    }
  })

  // Add progress tracking if requested
  if (options.trackProgress) {
    payload.metadata = {
      uploadId: generateUploadId(),
      totalFiles: files.length,
      totalSize: files.reduce((total, file) => total + file.size, 0),
      startedAt: new Date().toISOString(),
      uploader: options.uploader
    }
  }

  return payload
}

function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export async function execute(interaction) {
  const files = [
    { path: './uploads/doc1.pdf', name: 'document1.pdf', description: 'First document', size: 2048576 },
    { path: './uploads/doc2.pdf', name: 'document2.pdf', description: 'Second document', size: 1536000 }
  ]

  const payload = createFileUploadPayload(files, interaction.channel, {
    message: 'Your documents have been uploaded!',
    allowMentions: false,
    trackProgress: true,
    uploader: interaction.user.id
  })

  await interaction.deferReply()
  await payload.send()
  await interaction.editReply('Files uploaded successfully!')
}
```

## Payload Options

### Content and Embeds
```js
const basicPayload = new MessagePayload(channel, {
  content: 'Hello, world!',
  embeds: [embed1, embed2],
  tts: false
})
```

### Components and Interactions
```js
const interactivePayload = new MessagePayload(channel, {
  content: 'Choose an option:',
  components: [
    new ActionRowBuilder().addComponents(button1, button2),
    new ActionRowBuilder().addComponents(selectMenu)
  ]
})
```

### Files and Attachments
```js
const filePayload = new MessagePayload(channel, {
  content: 'Here are your files:',
  files: [attachment1, attachment2],
  embeds: [embed] // Can include embeds with file URLs
})
```

### Advanced Options
```js
const advancedPayload = new MessagePayload(channel, {
  content: 'Advanced message',
  embeds: [embed],
  components: [actionRow],
  allowedMentions: {
    parse: ['users'],
    users: ['123456789'],
    roles: [],
    everyone: false
  },
  reply: {
    messageReference: '987654321'
  },
  stickers: [stickerId],
  flags: MessageFlags.SuppressEmbeds
})
```

## Limits & Constraints

### Message Limits
- **Content Length**: Maximum 2000 characters
- **Embeds**: Maximum 10 embeds per message
- **Components**: Maximum 5 action rows
- **Files**: Maximum 10 files per message

### Payload Size Limits
- **Total Payload Size**: 100MB
- **Individual File Size**: 25MB (50MB for premium)
- **Embed Total Size**: 6000 characters across all embeds

### Validation Examples
```js
// Valid payload
const validPayload = new MessagePayload(channel, {
  content: 'Hello!',
  embeds: [embed],
  components: [actionRow]
})

// Error: Content too long
const invalidPayload = new MessagePayload(channel, {
  content: 'x'.repeat(2001), // Exceeds 2000 character limit
  embeds: [embed]
})

// Error: Too many embeds
const tooManyEmbeds = new MessagePayload(channel, {
  embeds: Array(11).fill(embed) // Exceeds 10 embed limit
})
```

## Best Practices

### Payload Organization
```js
// Good: Logical payload structure
const organizedPayload = new MessagePayload(channel, {
  content: 'Main message content', // Primary content
  embeds: [mainEmbed], // Supporting visual content
  components: [actionRow], // Interactive elements
  files: [attachment], // Additional files
  allowedMentions: { parse: [] } // Security settings
})
```

### Error Handling
```js
// Good: Handle payload creation errors
try {
  const payload = new MessagePayload(channel, payloadData)
  await payload.send()
} catch (error) {
  console.error('Failed to send payload:', error)
  // Handle error appropriately
}
```

### Performance Considerations
```js
// Good: Use appropriate payload sizes
const optimizedPayload = new MessagePayload(channel, {
  content: 'Summary', // Keep content concise
  embeds: [compactEmbed], // Use efficient embeds
  files: [compressedFile] // Compress files when possible
})
```

## Common Mistakes

### Overloaded Payloads
```js
// Bad: Too much content in one payload
const overloadedPayload = new MessagePayload(channel, {
  content: 'x'.repeat(2000), // Maximum content
  embeds: Array(10).fill(largeEmbed), // Maximum embeds
  components: Array(5).fill(actionRow), // Maximum components
  files: Array(10).fill(largeFile) // Maximum files
})

// Good: Split into multiple messages
const part1 = new MessagePayload(channel, {
  content: 'Part 1 of the message',
  embeds: [embed1, embed2]
})

const part2 = new MessagePayload(channel, {
  content: 'Part 2 of the message',
  components: [actionRow]
})
```

### Missing Error Handling
```js
// Bad: No error handling for payload operations
const unsafePayload = new MessagePayload(channel, payloadData)
await unsafePayload.send() // Could fail silently

// Good: Handle potential failures
try {
  const safePayload = new MessagePayload(channel, payloadData)
  await safePayload.send()
} catch (error) {
  await channel.send('Failed to send message')
}
```

### Security Issues with Mentions
```js
// Bad: Unrestricted mentions
const dangerousPayload = new MessagePayload(channel, {
  content: '@everyone Check this out!',
  allowedMentions: { parse: ['everyone'] } // Allows @everyone
})

// Good: Restrict mentions appropriately
const safePayload = new MessagePayload(channel, {
  content: 'Check this out!',
  allowedMentions: { parse: [] } // No automatic mentions
})
```

## Next Steps

- [MessageCreateOptions](/builders/message-create-options) - Configure message creation options
- [EmbedBuilder](/builders/embed-builder) - Create rich embeds