# Installation

Set up your development environment for Discord.js v14.25.1.

## Node.js Requirements

Discord.js v14.25.1 requires:
- **Node.js 16.11.0** or higher
- **npm 7.0.0** or higher (or yarn/pnpm)

Verify your Node.js version:
```bash
node --version
```

## Install Discord.js

Create a new project directory and initialize npm:
```bash
mkdir my-bot
cd my-bot
npm init -y
```

Install Discord.js v14.25.1:
```bash
npm install discord.js@14.25.1
```

## TypeScript Support (Optional)

For TypeScript development, install type definitions:
```bash
npm install -D typescript @types/node
npm install -D discord.js@14.25.1
```

Create a `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Environment Setup

Create a `.env` file for your bot token:
```env
DISCORD_TOKEN=your_bot_token_here
```

Install dotenv to load environment variables:
```bash
npm install dotenv
```

## Project Structure

Recommended project structure:
```
my-bot/
├── src/
│   ├── index.js
│   ├── commands/
│   └── events/
├── .env
├── package.json
└── README.md
```

## Verification

Test your installation with a simple bot:
```js
import { Client, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)
```

Run your bot:
```bash
node src/index.js
```

## Common Issues

- **Node.js Version**: Ensure you're using Node.js 16.11.0 or higher
- **Token Security**: Never commit your bot token to version control
- **Permissions**: Your bot application needs proper bot permissions

## Next Steps

Continue to [Bot Application](/getting-started/bot-application) to create your Discord bot application.