# Bot Application

Create and configure your Discord bot application in the Discord Developer Portal.

## Create Discord Application

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter your application name
4. Click **"Create"**

## Configure Bot User

1. Navigate to the **"Bot"** tab
2. Click **"Add Bot"**
3. Confirm by clicking **"Yes, do it!"**

### Bot Settings

- **Username**: Your bot's display name
- **Icon**: Upload a bot avatar (optional)
- **Public Bot**: Uncheck if you don't want others to invite your bot
- **Require OAuth2 Code Grant**: Leave unchecked for most bots

## Generate Bot Token

1. In the **"Bot"** tab, click **"Reset Token"**
2. Copy the token immediately
3. Store it securely in your `.env` file:
   ```env
   DISCORD_TOKEN=your_copied_token_here
   ```

⚠️ **Never share your bot token publicly**. Anyone with your token can control your bot.

## OAuth2 Configuration

Configure how users invite your bot:

1. Navigate to **"OAuth2"** → **"URL Generator"**
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - `Send Messages`
   - `Read Message History`
   - `Embed Links`
   - `Use Slash Commands`

4. Copy the generated URL and use it to invite your bot to servers

## Required Intents

For Discord.js v14.25.1, configure these intents in your bot code:

```js
import { GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required for slash commands
    GatewayIntentBits.GuildMessages,    // For message content
    GatewayIntentBits.MessageContent   // For reading message content
  ]
})
```

### Intent Explanations

- **Guilds**: Required for slash commands and server interactions
- **GuildMessages**: Receive messages in servers
- **MessageContent**: Read message content (requires verification in Developer Portal)

## Privileged Intents

Some intents require special approval:

- **Presence**: User status information
- **Guild Members**: Server member updates
- **Message Content**: Already mentioned above

To enable privileged intents:
1. Go to **"Bot"** tab in Developer Portal
2. Enable the required privileged intents
3. For Message Content, your bot may need verification

## Application Commands

Enable slash commands:
1. Go to **"OAuth2"** → **"URL Generator"**
2. Include `applications.commands` scope
3. This allows your bot to register slash commands

## Testing Your Bot

1. Invite your bot to a test server using the OAuth2 URL
2. Ensure the bot has proper permissions
3. Check that the bot appears in the server member list

## Next Steps

Continue to [First Bot](/getting-started/first-bot) to create your first working Discord bot.