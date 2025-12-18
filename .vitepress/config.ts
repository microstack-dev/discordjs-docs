import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Discord.js Documentation',
  description: 'Complete documentation handbook for Discord.js v14.25.1',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'Core Concepts', link: '/core-concepts/client-lifecycle' },
      { text: 'Builders', link: '/builders/overview' }
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
      ]
    },
    
    search: {
      provider: 'local'
    },
    
    ignoreDeadLinks: true
  }
})