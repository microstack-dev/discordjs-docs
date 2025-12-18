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
            { text: 'SlashCommandBuilder', link: '/builders/slash-command-builder' },
            { text: 'ContainerBuilder', link: '/builders/container-builder' },
            { text: 'SectionBuilder', link: '/builders/section-builder' },
            { text: 'TextDisplayBuilder', link: '/builders/text-display-builder' },
            { text: 'LabelBuilder', link: '/builders/label-builder' },
            { text: 'SeparatorBuilder', link: '/builders/separator-builder' },
            { text: 'ThumbnailBuilder', link: '/builders/thumbnail-builder' },
            { text: 'MediaGalleryBuilder', link: '/builders/media-gallery-builder' },
            { text: 'MediaGalleryItemBuilder', link: '/builders/media-gallery-item-builder' },
            { text: 'ModalBuilder', link: '/builders/modal-builder' },
            { text: 'FileBuilder', link: '/builders/file-builder' }
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