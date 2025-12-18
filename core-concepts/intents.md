# Intents

Intents control what events your bot receives through the Discord Gateway. They're essential for privacy, performance, and security.

## What Are Intents

Intents are subscriptions to specific categories of Gateway events. They tell Discord what types of events your bot needs to receive.

## Intent Categories

Discord intents fall into two categories:

### Non-Privileged Intents
Available to all bots without special approval:
- `Guilds`: Server joins, leaves, updates
- `GuildMembers`: Member joins, leaves, updates (privileged in v14)
- `GuildBans`: Ban and unban events
- `GuildEmojisAndStickers`: Emoji and sticker updates
- `GuildIntegrations`: Server integration events
- `GuildWebhooks`: Webhook events
- `GuildInvites`: Invite creation/deletion
- `GuildVoiceStates`: Voice channel join/leave
- `GuildPresences`: User status updates (privileged)
- `GuildMessages`: Message events in servers
- `GuildMessageReactions`: Message reactions
- `GuildMessageTyping`: Typing indicators
- `DirectMessages`: DM events
- `DirectMessageReactions`: DM reactions
- `DirectMessageTyping`: DM typing indicators

### Privileged Intents
Require special approval in the Discord Developer Portal:
- `GuildMembers`: Member events
- `GuildPresences`: User presence/status
- `MessageContent`: Message content access

## Configuring Intents

Set intents when creating your client:
```js
import { GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required for slash commands
    GatewayIntentBits.GuildMessages,    // Message events
    GatewayIntentBits.MessageContent   // Message content (privileged)
  ]
})
```

## Common Intent Combinations

### Basic Bot (Slash Commands Only)
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})
```

### Message Handling Bot
```js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})
```

### Full-Featured Bot
```js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent
  ]
})
```

## Intent Impact on Events

Without proper intents, events won't fire:
```js
// This won't work without GuildMessages intent
client.on('messageCreate', (message) => {
  console.log('Message received:', message.content)
})

// This won't work without MessageContent intent
client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('Pong!')
  }
})

// This works with just Guilds intent
client.on('interactionCreate', (interaction) => {
  if (interaction.isChatInputCommand()) {
    // Handle slash commands
  }
})
```

## Privileged Intents Setup

### Enable in Developer Portal
1. Go to your application in the Discord Developer Portal
2. Navigate to the **"Bot"** tab
3. Enable the required privileged intents
4. Save changes

### Message Content Intent
The `MessageContent` intent requires bot verification for:
- Bots in 100+ servers
- Bots that need message content

Alternatives to Message Content intent:
- Use slash commands instead of message-based commands
- Use interaction-based workflows
- Request specific message content via REST API

## Performance Optimization

### Minimal Intents
Use only the intents you need:
```js
// Bad: Uses all intents unnecessarily
const client = new Client({
  intents: Object.values(GatewayIntentBits)
})

// Good: Uses only required intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})
```

### Intent Impact on Resources
- More intents = more events = higher resource usage
- Privileged intents can significantly increase event volume
- Consider your bot's actual needs

## Troubleshooting Intents

### Events Not Firing
Check if you have the required intents:
```js
console.log('Client intents:', client.options.intents)
```

### Missing Message Content
If you can't read message content:
1. Enable `MessageContent` intent in Developer Portal
2. Add `GatewayIntentBits.MessageContent` to your client
3. Verify your bot is verified if in 100+ servers

### Member Events Not Working
For member-related events:
1. Enable `GuildMembers` intent in Developer Portal
2. Add `GatewayIntentBits.GuildMembers` to your client

## Dynamic Intent Management

Discord.js v14.25.1 doesn't support dynamic intent changes after login. You must restart your client to change intents.

## Best Practices

- Use the minimum intents required
- Enable privileged intents only when necessary
- Consider slash commands over message content
- Monitor your bot's event volume
- Test with different intent combinations

## Next Steps

Continue to [Caching & Partials](/core-concepts/caching-partials) to understand how Discord.js manages data storage and partial structures.