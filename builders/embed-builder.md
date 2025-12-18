# EmbedBuilder

Create rich embed messages with structured content and visual elements.

## Overview

`EmbedBuilder` constructs Discord embeds with formatted content, images, and structured data. Embeds provide a rich visual experience for presenting information in an organized, visually appealing format.

## Basic Example

```js
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Display information embed')

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Server Information')
    .setDescription('Welcome to our Discord server!')
    .setColor('Blue')
    .addFields(
      { name: 'Members', value: interaction.guild.memberCount.toString(), inline: true },
      { name: 'Created', value: interaction.guild.createdAt.toDateString(), inline: true },
      { name: 'Owner', value: `<@${interaction.guild.ownerId}>`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Requested by ' + interaction.user.tag })

  await interaction.reply({ embeds: [embed] })
}
```

## Advanced Usage

### Multi-Field Information Display
```js
export function createServerStatsEmbed(guild, stats) {
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${guild.name} Statistics`)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setColor('Green')

  // Basic information fields
  const basicFields = [
    { name: '👥 Members', value: stats.memberCount.toString(), inline: true },
    { name: '💬 Channels', value: stats.channelCount.toString(), inline: true },
    { name: '🎭 Roles', value: stats.roleCount.toString(), inline: true },
    { name: '📅 Created', value: guild.createdAt.toDateString(), inline: false },
    { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
    { name: '🔒 Verification', value: getVerificationLevel(guild.verificationLevel), inline: true }
  ]

  // Activity fields
  const activityFields = [
    { name: '🟢 Online', value: stats.onlineCount.toString(), inline: true },
    { name: '⏰ Joined Today', value: stats.joinedToday.toString(), inline: true },
    { name: '📈 Growth (7d)', value: `${stats.growth7d > 0 ? '+' : ''}${stats.growth7d}`, inline: true }
  ]

  embed.addFields(...basicFields, ...activityFields)

  // Add timestamp and footer
  embed
    .setTimestamp()
    .setFooter({
      text: `Requested by ${stats.requester.tag}`,
      iconURL: stats.requester.displayAvatarURL()
    })

  return embed
}

export async function execute(interaction) {
  const stats = await gatherServerStats(interaction.guild)
  stats.requester = interaction.user

  const embed = createServerStatsEmbed(interaction.guild, stats)

  await interaction.reply({ embeds: [embed] })
}
```

### Rich Media Embed with Validation
```js
export function createMediaEmbed(mediaData, validation = true) {
  const embed = new EmbedBuilder()
    .setTitle(mediaData.title)
    .setDescription(mediaData.description)
    .setURL(mediaData.url)

  // Validate and set image
  if (mediaData.image) {
    if (validation && !isValidImageUrl(mediaData.image)) {
      throw new Error('Invalid image URL provided')
    }
    embed.setImage(mediaData.image)
  }

  // Validate and set thumbnail
  if (mediaData.thumbnail) {
    if (validation && !isValidImageUrl(mediaData.thumbnail)) {
      throw new Error('Invalid thumbnail URL provided')
    }
    embed.setThumbnail(mediaData.thumbnail)
  }

  // Set author information
  if (mediaData.author) {
    const authorData = {
      name: mediaData.author.name
    }

    if (mediaData.author.iconURL) {
      authorData.iconURL = mediaData.author.iconURL
    }

    if (mediaData.author.url) {
      authorData.url = mediaData.author.url
    }

    embed.setAuthor(authorData)
  }

  // Add metadata fields
  const metadataFields = []

  if (mediaData.duration) {
    metadataFields.push({
      name: '⏱️ Duration',
      value: formatDuration(mediaData.duration),
      inline: true
    })
  }

  if (mediaData.views) {
    metadataFields.push({
      name: '👀 Views',
      value: formatNumber(mediaData.views),
      inline: true
    })
  }

  if (mediaData.likes) {
    metadataFields.push({
      name: '👍 Likes',
      value: formatNumber(mediaData.likes),
      inline: true
    })
  }

  if (metadataFields.length > 0) {
    embed.addFields(metadataFields)
  }

  // Set appropriate color based on content type
  embed.setColor(getColorForType(mediaData.type))

  // Add timestamp
  embed.setTimestamp(mediaData.publishedAt || new Date())

  return embed
}
```

### Paginated Embed System
```js
export class EmbedPaginator {
  constructor(baseEmbed, items, itemsPerPage = 10) {
    this.baseEmbed = baseEmbed
    this.items = items
    this.itemsPerPage = itemsPerPage
    this.currentPage = 1
    this.totalPages = Math.ceil(items.length / itemsPerPage)
  }

  getCurrentEmbed() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    const pageItems = this.items.slice(startIndex, endIndex)

    const embed = new EmbedBuilder(this.baseEmbed.toJSON())

    // Add page items as fields
    const fields = pageItems.map((item, index) => ({
      name: `${startIndex + index + 1}. ${item.name}`,
      value: item.value,
      inline: false
    }))

    embed.addFields(fields)

    // Add page information to footer
    const footer = embed.data.footer?.text || ''
    embed.setFooter({
      text: `${footer} • Page ${this.currentPage}/${this.totalPages}`.trim(),
      iconURL: embed.data.footer?.icon_url
    })

    return embed
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      return true
    }
    return false
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--
      return true
    }
    return false
  }

  setPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
      return true
    }
    return false
  }
}

export async function execute(interaction) {
  const items = Array.from({ length: 50 }, (_, i) => ({
    name: `Item ${i + 1}`,
    value: `Description for item ${i + 1}`
  }))

  const baseEmbed = new EmbedBuilder()
    .setTitle('Item List')
    .setDescription('Browse through all available items')
    .setColor('Blue')

  const paginator = new EmbedPaginator(baseEmbed, items, 10)

  await interaction.reply({
    embeds: [paginator.getCurrentEmbed()],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  })
}
```

## Limits & Constraints

### Embed Limits
- **Title**: Maximum 256 characters
- **Description**: Maximum 4096 characters
- **Fields**: Maximum 25 fields per embed
- **Field Name**: Maximum 256 characters
- **Field Value**: Maximum 1024 characters
- **Footer Text**: Maximum 2048 characters
- **Author Name**: Maximum 256 characters

### URL Limits
- **Image URLs**: Must be valid HTTPS URLs
- **Thumbnail URLs**: Must be valid HTTPS URLs
- **Maximum URL Length**: 2048 characters

### Color Constraints
- **Color Values**: 0-16777215 (decimal) or hex color codes
- **Default Color**: Uses Discord's default embed color

### Validation Examples
```js
// Valid embed
const validEmbed = new EmbedBuilder()
  .setTitle('Valid Title')
  .setDescription('Valid description')
  .setColor('Blue')
  .addFields({ name: 'Field', value: 'Value' })

// Error: Title too long
const invalidEmbed = new EmbedBuilder()
  .setTitle('x'.repeat(257)) // Exceeds 256 character limit
  .setDescription('Valid description')

// Error: Too many fields
const tooManyFields = new EmbedBuilder()
  .setTitle('Title')

// Adding 26 fields will throw an error
for (let i = 0; i < 26; i++) {
  tooManyFields.addFields({ name: `Field ${i}`, value: 'Value' })
}
```

## Best Practices

### Structured Information Hierarchy
```js
// Good: Logical information flow
const structuredEmbed = new EmbedBuilder()
  .setTitle('🎯 Project Status') // Main title
  .setDescription('Current project overview and metrics') // Summary
  .setThumbnail(projectLogo) // Visual identifier
  .addFields(
    { name: '📊 Progress', value: '75% Complete', inline: true },
    { name: '⏰ Deadline', value: deadline, inline: true },
    { name: '👥 Team Size', value: teamSize, inline: true }
  )
  .addFields(
    { name: '📋 Current Tasks', value: currentTasks, inline: false },
    { name: '🎯 Next Milestone', value: nextMilestone, inline: false }
  )
  .setImage(progressChart) // Supporting visualization
  .setTimestamp()
  .setFooter({ text: 'Last updated' })
```

### Consistent Color Coding
```js
// Good: Consistent color meanings
const colorScheme = {
  success: 'Green',
  warning: 'Yellow',
  error: 'Red',
  info: 'Blue',
  neutral: 'Grey'
}

const successEmbed = new EmbedBuilder()
  .setTitle('✅ Operation Successful')
  .setColor(colorScheme.success)

const errorEmbed = new EmbedBuilder()
  .setTitle('❌ Operation Failed')
  .setColor(colorScheme.error)
```

### Accessible Content
```js
// Good: Screen reader friendly
const accessibleEmbed = new EmbedBuilder()
  .setTitle('📢 Server Announcement') // Emoji provides visual cue
  .setDescription('Important server update for all members')
  .addFields(
    {
      name: '📅 Date',
      value: 'December 18, 2024',
      inline: true
    },
    {
      name: '⏰ Time',
      value: '2:00 PM EST',
      inline: true
    }
  )
  // Avoid using color alone to convey information
```

## Common Mistakes

### Information Overload
```js
// Bad: Too much information in one embed
const overloadedEmbed = new EmbedBuilder()
  .setTitle('Everything About Our Server')
  .setDescription('x'.repeat(4000)) // Way too long
  .addFields(/* 25 fields with tiny details */)

// Good: Break into multiple embeds or use attachments
const focusedEmbed = new EmbedBuilder()
  .setTitle('Server Overview')
  .setDescription('Key server information')
  .addFields(/* Only essential fields */)
```

### Inconsistent Formatting
```js
// Bad: Inconsistent field structure
const inconsistentEmbed = new EmbedBuilder()
  .addFields(
    { name: 'Users', value: '100', inline: true },
    { name: 'Server Age', value: '2 years old', inline: false },
    { name: 'Owner', value: '@username', inline: true }
  )

// Good: Consistent inline usage
const consistentEmbed = new EmbedBuilder()
  .addFields(
    { name: '👥 Users', value: '100', inline: true },
    { name: '📅 Age', value: '2 years', inline: true },
    { name: '👑 Owner', value: '@username', inline: true }
  )
```

### Missing Error Handling
```js
// Bad: No validation for external URLs
const unsafeEmbed = new EmbedBuilder()
  .setImage(userProvidedUrl) // Could be invalid or malicious

// Good: Validate URLs before use
const safeEmbed = new EmbedBuilder()

if (isValidImageUrl(userProvidedUrl)) {
  safeEmbed.setImage(userProvidedUrl)
} else {
  safeEmbed.setDescription('Invalid image URL provided')
}
```

## Next Steps

- [AttachmentBuilder](/builders/attachment-builder) - Handle file attachments
- [MessagePayload](/builders/message-payload) - Construct complete message payloads