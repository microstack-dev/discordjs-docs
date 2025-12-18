# MessageCreateOptions

Configure options for creating messages with advanced settings and behaviors.

## Overview

`MessageCreateOptions` configures message creation with advanced options like mentions, replies, stickers, and message flags. It provides fine-grained control over message behavior and appearance.

## Basic Example

```js
import { MessageCreateOptions, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('send-message')
  .setDescription('Send a configured message')

export async function execute(interaction) {
  const options = {
    content: 'Hello, world!',
    tts: false,
    allowedMentions: {
      parse: [],
      users: [],
      roles: []
    }
  }

  await interaction.followUp(options)
}
```

## Advanced Usage

### Controlled Mention System
```js
export function createMentionControlledMessage(content, allowedUsers = [], allowedRoles = []) {
  const options = {
    content,
    allowedMentions: {
      parse: [], // Don't parse @everyone or @here
      users: allowedUsers, // Only allow specific users
      roles: allowedRoles, // Only allow specific roles
      repliedUser: false // Don't mention the replied user
    }
  }

  return options
}

export async function execute(interaction) {
  const content = interaction.options.getString('message')
  const mentionUsers = interaction.options.getBoolean('mention_users')
  const mentionRoles = interaction.options.getBoolean('mention_roles')

  const allowedUsers = mentionUsers ? [interaction.user.id] : []
  const allowedRoles = mentionRoles ? ['ROLE_ID_HERE'] : []

  const options = createMentionControlledMessage(content, allowedUsers, allowedRoles)

  await interaction.reply(options)
}
```

### Reply Chain Management
```js
export function createReplyOptions(originalMessage, replyContent, options = {}) {
  const replyOptions = {
    content: replyContent,
    reply: {
      messageReference: originalMessage.id,
      failIfNotExists: options.failIfNotExists ?? true
    },
    allowedMentions: {
      parse: [],
      repliedUser: options.mentionRepliedUser ?? false
    }
  }

  // Add embeds if provided
  if (options.embed) {
    replyOptions.embeds = [options.embed]
  }

  // Add components if provided
  if (options.components) {
    replyOptions.components = options.components
  }

  // Add files if provided
  if (options.files) {
    replyOptions.files = options.files
  }

  return replyOptions
}

export async function execute(interaction) {
  const originalMessageId = interaction.options.getString('message_id')
  const replyContent = interaction.options.getString('reply')

  try {
    const originalMessage = await interaction.channel.messages.fetch(originalMessageId)
    
    const replyOptions = createReplyOptions(originalMessage, replyContent, {
      mentionRepliedUser: false,
      embed: new EmbedBuilder()
        .setDescription('This is a reply')
        .setColor('Blue')
    })

    await interaction.reply(replyOptions)
  } catch (error) {
    await interaction.reply({
      content: 'Could not find the specified message to reply to.',
      ephemeral: true
    })
  }
}
```

### Message with Advanced Features
```js
export function createAdvancedMessage(content, features = {}) {
  const options = {
    content,
    tts: features.tts || false,
    nonce: features.nonce || undefined,
    allowedMentions: {
      parse: features.allowEveryone ? ['everyone', 'here'] : [],
      users: features.allowedUsers || [],
      roles: features.allowedRoles || [],
      repliedUser: features.mentionRepliedUser ?? true
    }
  }

  // Add embeds
  if (features.embeds) {
    options.embeds = features.embeds
  }

  // Add components
  if (features.components) {
    options.components = features.components
  }

  // Add files
  if (features.files) {
    options.files = features.files
  }

  // Add stickers
  if (features.stickers) {
    options.stickers = features.stickers
  }

  // Add message flags
  if (features.flags) {
    options.flags = features.flags
  }

  // Add reply reference
  if (features.replyTo) {
    options.reply = {
      messageReference: features.replyTo,
      failIfNotExists: features.failIfNotExists ?? true
    }
  }

  return options
}

export async function execute(interaction) {
  const content = interaction.options.getString('content')
  const addEmbed = interaction.options.getBoolean('embed') ?? false
  const tts = interaction.options.getBoolean('tts') ?? false

  const features = {
    tts,
    allowedUsers: [interaction.user.id],
    allowEveryone: false
  }

  if (addEmbed) {
    features.embeds = [
      new EmbedBuilder()
        .setDescription('This message includes an embed!')
        .setColor('Green')
    ]
  }

  const options = createAdvancedMessage(content, features)

  await interaction.reply(options)
}
```

## Message Options

### Basic Options
```js
const basicOptions = {
  content: 'Hello, world!',
  tts: false, // Text-to-speech
  nonce: 'unique_identifier' // Unique message identifier
}
```

### Mention Control
```js
const mentionOptions = {
  allowedMentions: {
    parse: ['users', 'roles'], // Allow @user and @role parsing
    users: ['123456789', '987654321'], // Specific allowed users
    roles: ['111111111', '222222222'], // Specific allowed roles
    repliedUser: true // Mention user being replied to
  }
}
```

### Reply Options
```js
const replyOptions = {
  reply: {
    messageReference: 'message_id_here',
    failIfNotExists: true // Throw error if message doesn't exist
  }
}
```

### Advanced Options
```js
const advancedOptions = {
  embeds: [embed1, embed2],
  components: [actionRow1, actionRow2],
  files: [attachment1, attachment2],
  stickers: [stickerId1, stickerId2],
  flags: MessageFlags.SuppressEmbeds // Suppress embed rendering
}
```

## Limits & Constraints

### Content Limits
- **Message Content**: Maximum 2000 characters
- **TTS Content**: Maximum 2000 characters
- **Embed Count**: Maximum 10 embeds
- **Component Rows**: Maximum 5 action rows

### Mention Limits
- **User Mentions**: No specific limit, but rate limited
- **Role Mentions**: No specific limit, but rate limited
- **Reply Depth**: Maximum reply chain depth

### File Limits
- **File Count**: Maximum 10 files per message
- **Total Size**: Maximum 100MB across all files
- **Individual Size**: Maximum 25MB (50MB for premium)

### Validation Examples
```js
// Valid options
const validOptions = {
  content: 'Hello!',
  allowedMentions: { parse: [] },
  embeds: [embed],
  components: [actionRow]
}

// Error: Content too long
const invalidOptions = {
  content: 'x'.repeat(2001), // Exceeds 2000 character limit
  allowedMentions: { parse: [] }
}

// Error: Invalid mention configuration
const invalidMentions = {
  allowedMentions: {
    parse: ['invalid_type'] // Invalid parse type
  }
}
```

## Best Practices

### Secure Mention Handling
```js
// Good: Restrictive mention policy
const secureOptions = {
  content: userInput,
  allowedMentions: {
    parse: [], // No automatic parsing
    users: [], // No user mentions
    roles: [], // No role mentions
    repliedUser: false // No reply mentions
  }
}

// Avoid: Permissive mention policy
const insecureOptions = {
  content: userInput,
  allowedMentions: {
    parse: ['everyone', 'here', 'users', 'roles'] // Too permissive
  }
}
```

### Appropriate TTS Usage
```js
// Good: TTS for important announcements
const announcementOptions = {
  content: 'Server maintenance in 5 minutes',
  tts: true,
  allowedMentions: { parse: ['everyone'] }
}

// Avoid: TTS for spam or frequent messages
const spamOptions = {
  content: 'Hello',
  tts: true // Unnecessary TTS
}
```

### Performance-Aware Options
```js
// Good: Efficient message options
const efficientOptions = {
  content: 'Quick response',
  embeds: [], // Minimal embeds
  files: [], // No files
  components: [] // No components
}

// Avoid: Resource-intensive options
const heavyOptions = {
  content: 'Heavy message',
  embeds: Array(10).fill(largeEmbed), // Many large embeds
  files: Array(10).fill(largeFile), // Many large files
  components: Array(5).fill(complexRow) // Complex components
}
```

## Common Mistakes

### Missing Mention Controls
```js
// Bad: Uncontrolled mentions
const dangerousOptions = {
  content: userInput + ' @everyone', // Could ping everyone
  allowedMentions: undefined // Default allows all mentions
}

// Good: Controlled mentions
const safeOptions = {
  content: userInput,
  allowedMentions: {
    parse: [] // No automatic mentions
  }
}
```

### Incorrect Reply Configuration
```js
// Bad: Broken reply reference
const brokenReply = {
  reply: {
    messageReference: 'invalid_id',
    failIfNotExists: false // Hides the error
  }
}

// Good: Validated reply reference
const validReply = {
  reply: {
    messageReference: validMessageId,
    failIfNotExists: true // Fail fast on error
  }
}
```

### Ignoring Message Flags
```js
// Bad: No flags for sensitive content
const unhiddenOptions = {
  content: 'Spoiler content',
  embeds: [spoilerEmbed] // Embeds visible to all
}

// Good: Appropriate flags
const hiddenOptions = {
  content: 'Spoiler content',
  flags: MessageFlags.SuppressEmbeds // Hide embeds
}
```

## Next Steps

- [EmbedBuilder](/builders/embed-builder) - Create rich embeds for messages
- [AttachmentBuilder](/builders/attachment-builder) - Handle file attachments