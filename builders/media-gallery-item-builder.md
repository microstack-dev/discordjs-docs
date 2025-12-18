# MediaGalleryItemBuilder

Create individual media items for galleries with rich metadata and interactive features.

## Overview

`MediaGalleryItemBuilder` constructs individual media items that can be added to media galleries. Each item can contain images, videos, documents, or other media with full metadata and interaction support.

## Basic Example

```js
import { MediaGalleryItemBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('add-item')
  .setDescription('Add an item to gallery')

export async function execute(interaction) {
  const item = new MediaGalleryItemBuilder()
    .setUrl('https://example.com/image.jpg')
    .setTitle('Beautiful Landscape')
    .setDescription('A stunning mountain vista at sunset')
    .setType('image')
    .setTags(['nature', 'landscape', 'sunset'])

  await interaction.reply({
    content: `Gallery item created: ${item.build().title}`
  })
}
```

## Advanced Usage

### Rich Media Items
```js
export function createRichMediaItem(mediaData) {
  const item = new MediaGalleryItemBuilder()
    .setUrl(mediaData.url)
    .setTitle(mediaData.title)
    .setDescription(mediaData.description)
    .setType(mediaData.type)

  // Add comprehensive metadata
  item.setMetadata({
    id: mediaData.id,
    author: mediaData.author,
    createdAt: mediaData.createdAt,
    updatedAt: mediaData.updatedAt,
    fileSize: mediaData.fileSize,
    duration: mediaData.duration,
    dimensions: mediaData.dimensions,
    format: mediaData.format,
    quality: mediaData.quality
  })

  // Add tags for categorization
  if (mediaData.tags) {
    item.setTags(mediaData.tags)
  }

  // Add thumbnail for videos and documents
  if (mediaData.type !== 'image' && mediaData.thumbnail) {
    item.setThumbnail(mediaData.thumbnail)
  }

  // Add interactive actions
  if (mediaData.actions) {
    mediaData.actions.forEach(action => {
      item.addAction(action)
    })
  }

  return item
}

// Usage
const videoItem = createRichMediaItem({
  url: 'https://example.com/video.mp4',
  title: 'Product Demo',
  description: 'Comprehensive product demonstration',
  type: 'video',
  thumbnail: 'https://example.com/video-thumb.jpg',
  duration: '5:23',
  dimensions: '1920x1080',
  fileSize: '45MB',
  tags: ['demo', 'product', 'tutorial'],
  actions: [
    {
      type: 'button',
      label: 'Play Video',
      action: 'play',
      style: 'primary'
    },
    {
      type: 'button',
      label: 'Download',
      action: 'download',
      style: 'secondary'
    }
  ]
})
```

### Interactive Items
```js
export function createInteractiveItem(content) {
  const item = new MediaGalleryItemBuilder()
    .setUrl(content.url)
    .setTitle(content.title)
    .setDescription(content.description)
    .setType(content.type)

  // Add interactive buttons
  item.addAction({
    type: 'button',
    label: 'View Details',
    action: 'details',
    style: 'primary',
    data: { itemId: content.id }
  })

  item.addAction({
    type: 'button',
    label: 'Like',
    action: 'like',
    style: 'secondary',
    data: { itemId: content.id }
  })

  item.addAction({
    type: 'button',
    label: 'Share',
    action: 'share',
    style: 'secondary',
    data: { itemId: content.id }
  })

  // Add hover effects
  item.setHoverEffect({
    scale: 1.05,
    shadow: true,
    brightness: 1.1
  })

  // Add click behavior
  item.setClickAction({
    type: 'modal',
    modalId: 'item_details',
    data: { itemId: content.id }
  })

  return item
}
```

### Document Items
```js
export function createDocumentItem(docData) {
  const item = new MediaGalleryItemBuilder()
    .setUrl(docData.url)
    .setTitle(docData.title)
    .setDescription(docData.description)
    .setType('document')

  // Document-specific metadata
  item.setMetadata({
    pages: docData.pages,
    wordCount: docData.wordCount,
    author: docData.author,
    publisher: docData.publisher,
    publishDate: docData.publishDate,
    isbn: docData.isbn,
    language: docData.language,
    fileSize: docData.fileSize,
    format: docData.format
  })

  // Document icon based on format
  const iconMap = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'txt': '📃',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '📽️',
    'pptx': '📽️'
  }

  item.setIcon(iconMap[docData.format.toLowerCase()] || '📄')

  // Document-specific actions
  item.addAction({
    type: 'button',
    label: 'Read Online',
    action: 'read',
    style: 'primary'
  })

  item.addAction({
    type: 'button',
    label: 'Download PDF',
    action: 'download',
    style: 'secondary'
  })

  if (docData.preview) {
    item.setPreview(docData.preview)
  }

  return item
}
```

### Image Items with EXIF Data
```js
export function createImageItem(imageData) {
  const item = new MediaGalleryItemBuilder()
    .setUrl(imageData.url)
    .setTitle(imageData.title)
    .setDescription(imageData.description)
    .setType('image')

  // Image-specific metadata
  item.setMetadata({
    dimensions: imageData.dimensions,
    fileSize: imageData.fileSize,
    format: imageData.format,
    colorSpace: imageData.colorSpace,
    dpi: imageData.dpi,
    aspectRatio: imageData.aspectRatio
  })

  // EXIF data if available
  if (imageData.exif) {
    item.setExifData({
      camera: imageData.exif.camera,
      lens: imageData.exif.lens,
      focalLength: imageData.exif.focalLength,
      aperture: imageData.exif.aperture,
      shutterSpeed: imageData.exif.shutterSpeed,
      iso: imageData.exif.iso,
      flash: imageData.exif.flash,
      dateTime: imageData.exif.dateTime,
      gps: imageData.exif.gps
    })
  }

  // Image-specific actions
  item.addAction({
    type: 'button',
    label: 'View Full Size',
    action: 'fullscreen',
    style: 'primary'
  })

  item.addAction({
    type: 'button',
    label: 'Download',
    action: 'download',
    style: 'secondary'
  })

  if (imageData.exif) {
    item.addAction({
      type: 'button',
      label: 'Camera Info',
      action: 'exif',
      style: 'secondary'
    })
  }

  return item
}
```

### Video Items with Chapters
```js
export function createVideoItem(videoData) {
  const item = new MediaGalleryItemBuilder()
    .setUrl(videoData.url)
    .setTitle(videoData.title)
    .setDescription(videoData.description)
    .setType('video')

  // Video-specific metadata
  item.setMetadata({
    duration: videoData.duration,
    dimensions: videoData.dimensions,
    fileSize: videoData.fileSize,
    format: videoData.format,
    bitrate: videoData.bitrate,
    framerate: videoData.framerate,
    codec: videoData.codec
  })

  // Video thumbnail
  if (videoData.thumbnail) {
    item.setThumbnail(videoData.thumbnail)
  }

  // Video chapters
  if (videoData.chapters) {
    item.setChapters(videoData.chapters.map(chapter => ({
      title: chapter.title,
      startTime: chapter.startTime,
      description: chapter.description
    })))
  }

  // Video-specific actions
  item.addAction({
    type: 'button',
    label: 'Play Video',
    action: 'play',
    style: 'primary'
  })

  item.addAction({
    type: 'button',
    label: 'Download',
    action: 'download',
    style: 'secondary'
  })

  if (videoData.chapters && videoData.chapters.length > 0) {
    item.addAction({
      type: 'dropdown',
      label: 'Jump to Chapter',
      action: 'chapter',
      options: videoData.chapters.map(chapter => ({
        label: chapter.title,
        value: chapter.startTime.toString()
      }))
    })
  }

  return item
}
```

## Item Types

### Image Items
```js
const imageItem = new MediaGalleryItemBuilder()
  .setType('image')
  .setUrl('https://example.com/image.jpg')
  .setMetadata({
    dimensions: '1920x1080',
    format: 'JPEG',
    fileSize: '2.5MB'
  })
```

### Video Items
```js
const videoItem = new MediaGalleryItemBuilder()
  .setType('video')
  .setUrl('https://example.com/video.mp4')
  .setThumbnail('https://example.com/video-thumb.jpg')
  .setMetadata({
    duration: '5:23',
    dimensions: '1920x1080',
    format: 'MP4',
    fileSize: '45MB'
  })
```

### Document Items
```js
const documentItem = new MediaGalleryItemBuilder()
  .setType('document')
  .setUrl('https://example.com/document.pdf')
  .setIcon('📄')
  .setMetadata({
    pages: 25,
    format: 'PDF',
    fileSize: '1.8MB'
  })
```

### Audio Items
```js
const audioItem = new MediaGalleryItemBuilder()
  .setType('audio')
  .setUrl('https://example.com/audio.mp3')
  .setIcon('🎵')
  .setMetadata({
    duration: '3:45',
    format: 'MP3',
    fileSize: '5.2MB'
  })
```

## Item Properties

### Basic Properties
```js
const item = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/content')
  .setTitle('Content Title')
  .setDescription('Content description')
  .setType('image')
```

### Visual Properties
```js
const visualItem = new MediaGalleryItemBuilder()
  .setThumbnail('https://example.com/thumb.jpg')
  .setIcon('🖼️')
  .setAspectRatio('16:9')
  .setBorderRadius(8)
  .setShadow(true)
```

### Interactive Properties
```js
const interactiveItem = new MediaGalleryItemBuilder()
  .addAction({
    type: 'button',
    label: 'Click Me',
    action: 'custom',
    style: 'primary'
  })
  .setHoverEffect({
    scale: 1.1,
    brightness: 1.2
  })
  .setClickAction({
    type: 'modal',
    modalId: 'details'
  })
```

## Limits and Constraints

### Content Limits
- **Title Length**: Maximum 100 characters
- **Description Length**: Maximum 500 characters
- **URL Length**: Maximum 2048 characters
- **Tags**: Maximum 10 tags, 50 characters each

### File Size Limits
- **Images**: Maximum 25MB
- **Videos**: Maximum 100MB
- **Documents**: Maximum 50MB
- **Audio**: Maximum 50MB

### Validation Examples
```js
// Valid item
const validItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/image.jpg')
  .setTitle('Valid Title')
  .setType('image')

// Error: Title too long
const invalidItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/image.jpg')
  .setTitle('This title is way too long and exceeds the maximum character limit allowed for media gallery items')
  .setType('image')
```

## Best Practices

### Descriptive Titles and Descriptions
```js
// Good: Clear, informative content
const goodItem = new MediaGalleryItemBuilder()
  .setTitle('Mountain Landscape at Sunset')
  .setDescription('A breathtaking view of snow-capped mountains bathed in golden sunset light, captured from the summit viewpoint.')

// Bad: Vague or unhelpful content
const badItem = new MediaGalleryItemBuilder()
  .setTitle('Image')
  .setDescription('Picture of stuff')
```

### Appropriate Metadata
```js
// Good: Rich, relevant metadata
const richMetadata = new MediaGalleryItemBuilder()
  .setMetadata({
    dimensions: '1920x1080',
    fileSize: '2.5MB',
    format: 'JPEG',
    camera: 'Canon EOS R5',
    lens: 'RF 24-70mm f/2.8L',
    iso: 400,
    aperture: 'f/8',
    shutterSpeed: '1/250s'
  })

// Bad: Missing or irrelevant metadata
const poorMetadata = new MediaGalleryItemBuilder()
  .setMetadata({
    random: 'data',
    unrelated: 'information'
  })
```

### Proper Tag Usage
```js
// Good: Relevant, specific tags
const goodTags = new MediaGalleryItemBuilder()
  .setTags(['landscape', 'mountains', 'sunset', 'nature', 'photography'])

// Bad: Generic or excessive tags
const badTags = new MediaGalleryItemBuilder()
  .setTags(['image', 'photo', 'picture', 'content', 'media', 'file', 'item', 'thing'])
```

## Common Mistakes

### Missing Required Properties
```js
// Bad: Missing URL or type
const incompleteItem = new MediaGalleryItemBuilder()
  .setTitle('Incomplete Item')
  // Missing .setUrl() and .setType()

// Good: Complete item
const completeItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/content.jpg')
  .setTitle('Complete Item')
  .setType('image')
```

### Inappropriate Content Types
```js
// Bad: Wrong type for content
const mismatchedItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/video.mp4')
  .setType('image')  // Wrong type for video

// Good: Correct type
const correctItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/video.mp4')
  .setType('video')
```

### Overly Long Descriptions
```js
// Bad: Description too long
const longDescription = new MediaGalleryItemBuilder()
  .setTitle('Title')
  .setDescription('x'.repeat(501))  // Exceeds 500 character limit

// Good: Concise description
const conciseDescription = new MediaGalleryItemBuilder()
  .setTitle('Title')
  .setDescription('Brief, informative description within limits.')
```

## Integration with Other Builders

### With MediaGalleryBuilder
```js
const gallery = new MediaGalleryBuilder()
  .addItem(new MediaGalleryItemBuilder().build())
  .addItem(new MediaGalleryItemBuilder().build())
```

### With ThumbnailBuilder
```js
const item = new MediaGalleryItemBuilder()
  .setThumbnail(new ThumbnailBuilder().build())
```

## Performance Considerations

- Optimize images and videos before adding
- Use appropriate formats (WebP for images, MP4 for videos)
- Implement lazy loading for large galleries
- Cache thumbnails for better performance
- Limit the number of actions per item

## Next Steps

- [FileBuilder](/builders/file-builder) - Handle file attachments
- [ModalBuilder](/builders/modal-builder) - Create interactive forms
- [ContainerBuilder](/builders/container-builder) - Organize UI components