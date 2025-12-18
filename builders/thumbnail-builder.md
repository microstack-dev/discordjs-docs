# ThumbnailBuilder

Create and configure image thumbnails for Discord messages and embeds.

## Overview

`ThumbnailBuilder` constructs image thumbnails with proper sizing, formatting, and optimization for Discord's display requirements. Perfect for adding visual context to messages.

## Basic Example

```js
import { ThumbnailBuilder, EmbedBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('Show content preview')

export async function execute(interaction) {
  const thumbnail = new ThumbnailBuilder()
    .setUrl('https://example.com/image.jpg')
    .setWidth(200)
    .setHeight(200)
    .setAltText('Preview image')

  const embed = new EmbedBuilder()
    .setTitle('Content Preview')
    .setDescription('Check out this preview')
    .setThumbnail(thumbnail.build())
    .setColor('Blue')

  await interaction.reply({ embeds: [embed] })
}
```

## Advanced Usage

### Dynamic Thumbnail Generation
```js
export async function createUserThumbnail(user) {
  const thumbnail = new ThumbnailBuilder()
    .setUrl(user.displayAvatarURL({ size: 256, extension: 'png' }))
    .setWidth(256)
    .setHeight(256)
    .setAltText(`${user.username}'s avatar`)
    .setFormat('png')
    .setQuality('high')

  // Add user metadata
  thumbnail.setMetadata({
    userId: user.id,
    username: user.username,
    generatedAt: new Date().toISOString()
  })

  return thumbnail
}

export async function execute(interaction) {
  const user = interaction.options.getUser('target') || interaction.user
  const thumbnail = await createUserThumbnail(user)

  const embed = new EmbedBuilder()
    .setTitle(`User Profile: ${user.tag}`)
    .setDescription(`View ${user.username}'s profile information`)
    .setThumbnail(thumbnail.build())
    .setColor('Blue')

  await interaction.reply({ embeds: [embed] })
}
```

### Responsive Thumbnails
```js
export function createResponsiveThumbnail(imageUrl, context) {
  const thumbnail = new ThumbnailBuilder()
    .setUrl(imageUrl)

  // Adjust size based on context
  switch (context.type) {
    case 'avatar':
      return thumbnail
        .setWidth(128)
        .setHeight(128)
        .setFormat('webp')
        .setQuality('medium')

    case 'banner':
      return thumbnail
        .setWidth(400)
        .setHeight(100)
        .setFormat('png')
        .setQuality('high')

    case 'icon':
      return thumbnail
        .setWidth(64)
        .setHeight(64)
        .setFormat('jpg')
        .setQuality('low')

    case 'preview':
      return thumbnail
        .setWidth(200)
        .setHeight(200)
        .setFormat('webp')
        .setQuality('medium')

    default:
      return thumbnail
        .setWidth(256)
        .setHeight(256)
        .setFormat('webp')
        .setQuality('medium')
  }
}
```

### Thumbnail Galleries
```js
export async function createThumbnailGallery(images) {
  const thumbnails = images.map((image, index) => {
    return new ThumbnailBuilder()
      .setUrl(image.url)
      .setWidth(150)
      .setHeight(150)
      .setAltText(image.alt || `Gallery image ${index + 1}`)
      .setFormat('webp')
      .setQuality('medium')
      .setMetadata({
        index: index,
        title: image.title,
        description: image.description
      })
  })

  return thumbnails
}

export async function execute(interaction) {
  const images = [
    { url: 'https://example.com/img1.jpg', title: 'Image 1', description: 'First image' },
    { url: 'https://example.com/img2.jpg', title: 'Image 2', description: 'Second image' },
    { url: 'https://example.com/img3.jpg', title: 'Image 3', description: 'Third image' }
  ]

  const thumbnails = await createThumbnailGallery(images)

  const embed = new EmbedBuilder()
    .setTitle('Image Gallery')
    .setDescription('Browse through our image collection')
    .setColor('Purple')

  // Set first thumbnail as main
  embed.setThumbnail(thumbnails[0].build())

  await interaction.reply({ embeds: [embed] })
}
```

### Optimized Thumbnails
```js
export function createOptimizedThumbnail(imageUrl, options = {}) {
  const thumbnail = new ThumbnailBuilder()
    .setUrl(imageUrl)

  // Apply optimization settings
  if (options.fastLoad) {
    thumbnail
      .setFormat('webp')
      .setQuality('low')
      .setWidth(128)
      .setHeight(128)
  }

  if (options.highQuality) {
    thumbnail
      .setFormat('png')
      .setQuality('high')
      .setWidth(512)
      .setHeight(512)
  }

  if (options.mobile) {
    thumbnail
      .setFormat('webp')
      .setQuality('medium')
      .setWidth(200)
      .setHeight(200)
      .setLazyLoad(true)
  }

  // Add caching headers
  if (options.cache) {
    thumbnail.setCache({
      maxAge: options.cache.maxAge || 86400, // 1 day
      mustRevalidate: true
    })
  }

  return thumbnail
}
```

### Thumbnail with Overlays
```js
export function createThumbnailWithOverlay(imageUrl, overlay) {
  const thumbnail = new ThumbnailBuilder()
    .setUrl(imageUrl)
    .setWidth(200)
    .setHeight(200)

  // Add overlay configuration
  if (overlay.type === 'badge') {
    thumbnail.setOverlay({
      type: 'badge',
      position: overlay.position || 'top-right',
      text: overlay.text,
      color: overlay.color || 'red',
      size: overlay.size || 'small'
    })
  }

  if (overlay.type === 'icon') {
    thumbnail.setOverlay({
      type: 'icon',
      position: overlay.position || 'center',
      icon: overlay.icon,
      size: overlay.size || 'medium',
      opacity: overlay.opacity || 0.8
    })
  }

  return thumbnail
}

// Usage
const badgeThumbnail = createThumbnailWithOverlay(
  'https://example.com/image.jpg',
  {
    type: 'badge',
    text: 'NEW',
    color: 'green',
    position: 'top-left'
  }
)
```

## Thumbnail Properties

### Image Properties
```js
const thumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/image.jpg')
  .setWidth(256)
  .setHeight(256)
  .setFormat('webp')
  .setQuality('medium')
  .setAltText('Descriptive text')
```

### Display Properties
```js
const displayThumbnail = new ThumbnailBuilder()
  .setAlignment('center')
  .setBorder(true)
  .setBorderColor('#CCCCCC')
  .setBorderRadius(8)
  .setMargin('10px')
  .setPadding('5px')
```

### Performance Properties
```js
const performanceThumbnail = new ThumbnailBuilder()
  .setLazyLoad(true)
  .setPreload('metadata')
  .setCache({
    maxAge: 86400,
    mustRevalidate: true
  })
  .setCompression('auto')
```

## Image Formats

### Supported Formats
```js
// WebP - Modern, efficient format
const webpThumbnail = new ThumbnailBuilder()
  .setFormat('webp')
  .setQuality('medium')

// PNG - Lossless, supports transparency
const pngThumbnail = new ThumbnailBuilder()
  .setFormat('png')
  .setQuality('high')

// JPEG - Good for photos
const jpegThumbnail = new ThumbnailBuilder()
  .setFormat('jpg')
  .setQuality('medium')

// GIF - For simple animations
const gifThumbnail = new ThumbnailBuilder()
  .setFormat('gif')
  .setQuality('low')
```

### Format Selection Logic
```js
export function selectOptimalFormat(imageType, context) {
  if (imageType.includes('transparent') || imageType.includes('alpha')) {
    return 'png' // Need transparency support
  }

  if (context.type === 'avatar' || context.type === 'icon') {
    return 'webp' // Best compression for small images
  }

  if (imageType.includes('photo') || imageType.includes('complex')) {
    return 'jpg' // Good for photographs
  }

  if (imageType.includes('animated')) {
    return 'gif' // Animation support
  }

  return 'webp' // Default to modern format
}
```

## Limits and Constraints

### Size Limits
- **Maximum Width**: 400 pixels
- **Maximum Height**: 300 pixels
- **Maximum File Size**: 8MB
- **Recommended Size**: 256x256 pixels

### URL Limits
- **Maximum URL Length**: 2048 characters
- **Supported Protocols**: HTTP, HTTPS
- **CDN Support**: Yes, recommended for performance

### Validation Examples
```js
// Valid thumbnail
const validThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/image.jpg')
  .setWidth(200)
  .setHeight(200)

// Error: Invalid URL
const invalidThumbnail = new ThumbnailBuilder()
  .setUrl('not-a-valid-url')
  .setWidth(200)
  .setHeight(200)

// Error: Size too large
const oversizedThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/image.jpg')
  .setWidth(500) // Exceeds 400px limit
  .setHeight(500) // Exceeds 300px limit
```

## Best Practices

### Proper Sizing
```js
// Good: Optimal size for Discord
const optimalThumbnail = new ThumbnailBuilder()
  .setWidth(256)
  .setHeight(256)
  .setFormat('webp')
  .setQuality('medium')

// Bad: Oversized images
const oversizedThumbnail = new ThumbnailBuilder()
  .setWidth(1024) // Too large
  .setHeight(1024) // Too large
```

### Descriptive Alt Text
```js
// Good: Descriptive alt text
const descriptiveThumbnail = new ThumbnailBuilder()
  .setAltText('Screenshot of the user dashboard showing recent activity')

// Bad: Non-descriptive alt text
const vagueThumbnail = new ThumbnailBuilder()
  .setAltText('image')
```

### Format Optimization
```js
// Good: Choose appropriate format
const optimizedThumbnail = new ThumbnailBuilder()
  .setFormat('webp') // Modern, efficient
  .setQuality('medium') // Balance quality and size

// Bad: Inefficient format choice
const inefficientThumbnail = new ThumbnailBuilder()
  .setFormat('png') // Unnecessarily large for photos
  .setQuality('high') // Excessive quality for thumbnails
```

## Common Mistakes

### Invalid URLs
```js
// Bad: Invalid or inaccessible URLs
const invalidUrls = [
  new ThumbnailBuilder().setUrl('file://local/path.jpg'),
  new ThumbnailBuilder().setUrl('ftp://server.com/image.jpg'),
  new ThumbnailBuilder().setUrl('https://broken-link.com/image.jpg')
]

// Good: Valid, accessible URLs
const validUrls = [
  new ThumbnailBuilder().setUrl('https://cdn.example.com/image.jpg'),
  new ThumbnailBuilder().setUrl('https://i.imgur.com/abc123.jpg')
]
```

### Aspect Ratio Issues
```js
// Bad: Distorted aspect ratios
const distortedThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/wide-image.jpg')
  .setWidth(200)
  .setHeight(200) // Will distort wide image

// Good: Maintain aspect ratio
const properThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/wide-image.jpg')
  .setWidth(200)
  .setHeight(150) // Maintain 4:3 aspect ratio
```

### Excessive File Sizes
```js
// Bad: Large file sizes
const heavyThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/huge-image.jpg')
  .setQuality('high') // Unnecessarily large file

// Good: Optimized file sizes
const lightThumbnail = new ThumbnailBuilder()
  .setUrl('https://example.com/optimized-image.webp')
  .setFormat('webp')
  .setQuality('medium')
```

## Integration with Other Builders

### With EmbedBuilder
```js
const embed = new EmbedBuilder()
  .setTitle('Title')
  .setDescription('Description')
  .setThumbnail(thumbnail.build())
```

### With MediaGalleryBuilder
```js
const gallery = new MediaGalleryBuilder()
  .addThumbnail(thumbnail.build())
  .addThumbnail(anotherThumbnail.build())
```

## Performance Considerations

- Use WebP format for better compression
- Implement lazy loading for better performance
- Cache thumbnails to reduce load times
- Use CDNs for faster image delivery
- Optimize image sizes before upload

## Next Steps

- [MediaGalleryBuilder](/builders/media-gallery-builder) - Create media collections
- [MediaGalleryItemBuilder](/builders/media-gallery-item-builder) - Individual media items
- [FileBuilder](/builders/file-builder) - Handle file attachments