import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Discord.js Documentation v0.4.0',
  description: 'Complete production handbook for Discord.js v14.25.1',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'Core Concepts', link: '/core-concepts/client-lifecycle' },
      { text: 'Builders', link: '/builders/overview' },
      { text: 'Performance', link: '/performance/overview' },
      { text: 'Voice', link: '/voice/overview' },
      { text: 'Database', link: '/database/overview' },
      { text: 'Deployment', link: '/deployment/overview' }
    ],
    
    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/introduction' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Bot Application', link: '/getting-started/bot-application' },
            { text: 'First Bot', link: '/getting-started/first-bot' }
          ]
        }
      ],
      
      '/core-concepts/': [
        {
          text: 'Core Concepts',
          items: [
            { text: 'Client Lifecycle', link: '/core-concepts/client-lifecycle' },
            { text: 'Gateway vs REST', link: '/core-concepts/gateway-rest' },
            { text: 'Intents', link: '/core-concepts/intents' },
            { text: 'Caching & Partials', link: '/core-concepts/caching-partials' },
            { text: 'Snowflakes', link: '/core-concepts/snowflakes' },
            { text: 'Interaction Lifecycle', link: '/core-concepts/interaction-lifecycle' }
          ]
        }
      ],
      
      '/builders/': [
        {
          text: 'Builders',
          items: [
            { text: 'Overview', link: '/builders/overview' },
            {
              text: 'Component Builders',
              collapsed: false,
              items: [
                { text: 'ActionRowBuilder', link: '/builders/action-row-builder' },
                { text: 'ButtonBuilder', link: '/builders/button-builder' },
                { text: 'StringSelectMenuBuilder', link: '/builders/string-select-menu-builder' },
                { text: 'UserSelectMenuBuilder', link: '/builders/user-select-menu-builder' },
                { text: 'RoleSelectMenuBuilder', link: '/builders/role-select-menu-builder' },
                { text: 'ChannelSelectMenuBuilder', link: '/builders/channel-select-menu-builder' },
                { text: 'MentionableSelectMenuBuilder', link: '/builders/mentionable-select-menu-builder' }
              ]
            },
            {
              text: 'Embed & Message Builders',
              collapsed: false,
              items: [
                { text: 'EmbedBuilder', link: '/builders/embed-builder' },
                { text: 'AttachmentBuilder', link: '/builders/attachment-builder' },
                { text: 'MessagePayload', link: '/builders/message-payload' },
                { text: 'MessageCreateOptions', link: '/builders/message-create-options' }
              ]
            },
            {
              text: 'Command Tree Builders',
              collapsed: false,
              items: [
                { text: 'ContextMenuCommandBuilder', link: '/builders/context-menu-command-builder' },
                { text: 'SlashCommandSubcommandBuilder', link: '/builders/slash-command-subcommand-builder' },
                { text: 'SlashCommandSubcommandGroupBuilder', link: '/builders/slash-command-subcommand-group-builder' }
              ]
            },
            {
              text: 'Modal & Input Builders',
              collapsed: false,
              items: [
                { text: 'ModalBuilder', link: '/builders/modal-builder' },
                { text: 'TextInputBuilder', link: '/builders/text-input-builder' }
              ]
            },
            {
              text: 'v0.1.0 Builders',
              collapsed: true,
              items: [
                { text: 'SlashCommandBuilder', link: '/builders/slash-command-builder' },
                { text: 'ContainerBuilder', link: '/builders/container-builder' },
                { text: 'SectionBuilder', link: '/builders/section-builder' },
                { text: 'TextDisplayBuilder', link: '/builders/text-display-builder' },
                { text: 'LabelBuilder', link: '/builders/label-builder' },
                { text: 'SeparatorBuilder', link: '/builders/separator-builder' },
                { text: 'ThumbnailBuilder', link: '/builders/thumbnail-builder' },
                { text: 'MediaGalleryBuilder', link: '/builders/media-gallery-builder' },
                { text: 'MediaGalleryItemBuilder', link: '/builders/media-gallery-item-builder' },
                { text: 'FileBuilder', link: '/builders/file-builder' }
              ]
            }
          ]
        }
      ],

      '/interactions/': [
        {
          text: 'Interactions',
          items: [
            { text: 'Overview', link: '/interactions/overview' },
            { text: 'Lifecycle', link: '/interactions/lifecycle' },
            { text: 'Deferring and Updating', link: '/interactions/deferring-and-updating' },
            { text: 'Ephemeral Interactions', link: '/interactions/ephemeral-interactions' },
            { text: 'Error Handling', link: '/interactions/error-handling' }
          ]
        }
      ],

      '/components/': [
        {
          text: 'Components',
          items: [
            { text: 'Overview', link: '/components/overview' },
            { text: 'Component Routing', link: '/components/component-routing' },
            { text: 'State Management', link: '/components/state-management' },
            { text: 'Security', link: '/components/security' },
            { text: 'Cleanup and Timeouts', link: '/components/cleanup-and-timeouts' }
          ]
        }
      ],

      '/collectors/': [
        {
          text: 'Collectors',
          items: [
            { text: 'Overview', link: '/collectors/overview' },
            { text: 'Message Collectors', link: '/collectors/message-collectors' },
            { text: 'Component Collectors', link: '/collectors/component-collectors' },
            { text: 'Filters', link: '/collectors/filters' },
            { text: 'Performance', link: '/collectors/performance' }
          ]
        }
      ],

      '/permissions/': [
        {
          text: 'Permissions',
          items: [
            { text: 'Overview', link: '/permissions/overview' },
            { text: 'Permission Flags', link: '/permissions/permission-flags' },
            { text: 'Role Hierarchy', link: '/permissions/role-hierarchy' },
            { text: 'Slash Command Permissions', link: '/permissions/slash-command-permissions' },
            { text: 'Secure Admin Commands', link: '/permissions/secure-admin-commands' }
          ]
        }
      ],

      '/events/': [
        {
          text: 'Events',
          items: [
            { text: 'Overview', link: '/events/overview' }
          ]
        }
      ],

      '/error-handling/': [
        {
          text: 'Error Handling',
          items: [
            { text: 'Overview', link: '/error-handling/overview' }
          ]
        }
      ],

      '/previews/': [
        {
          text: 'Previews',
          items: [
            { text: 'Overview', link: '/previews/overview' }
          ]
        }
      ],

      '/performance/': [
        {
          text: 'Performance',
          items: [
            { text: 'Overview', link: '/performance/overview' },
            { text: 'Sharding', link: '/performance/sharding' },
            { text: 'Cache Management', link: '/performance/cache-management' },
            { text: 'Rate Limits', link: '/performance/rate-limits' },
            { text: 'Memory Optimization', link: '/performance/memory-optimization' },
            { text: 'Large Bots', link: '/performance/large-bots' }
          ]
        }
      ],

      '/voice/': [
        {
          text: 'Voice',
          items: [
            { text: 'Overview', link: '/voice/overview' },
            { text: 'Voice Connections', link: '/voice/voice-connections' },
            { text: 'Audio Players', link: '/voice/audio-players' },
            { text: 'Resource Lifecycle', link: '/voice/resource-lifecycle' },
            { text: 'Lavalink Integration', link: '/voice/lavalink' },
            { text: 'Error Handling', link: '/voice/error-handling' }
          ]
        }
      ],

      '/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Overview', link: '/database/overview' },
            { text: 'Schema Design', link: '/database/schema-design' },
            { text: 'MongoDB Integration', link: '/database/mongodb' },
            { text: 'Prisma ORM', link: '/database/prisma' },
            { text: 'Redis Caching', link: '/database/redis' },
            { text: 'Data Consistency', link: '/database/data-consistency' }
          ]
        }
      ],

      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Overview', link: '/deployment/overview' },
            { text: 'Environment Variables', link: '/deployment/environment-variables' },
            { text: 'VPS Setup', link: '/deployment/vps' },
            { text: 'Docker Containerization', link: '/deployment/docker' },
            { text: 'PM2 Management', link: '/deployment/pm2' },
            { text: 'CI/CD Pipelines', link: '/deployment/ci-cd' },
            { text: 'Production Checklist', link: '/deployment/production-checklist' }
          ]
        }
      ]
    },
    
    search: {
      provider: 'local'
    },
    
    ignoreDeadLinks: true
  }
})