# MediaGalleryBuilder

Create organized media galleries with multiple images, videos, and other media content.

## Overview

`MediaGalleryBuilder` constructs comprehensive media galleries that can display multiple media items in an organized, interactive format. Perfect for portfolios, showcases, and content collections.

## Basic Example

```js
import { MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('gallery')
  .setDescription('Display a media gallery')

export async function execute(interaction) {
  const gallery = new MediaGalleryBuilder()
    .setTitle('Project Showcase')
    .setDescription('Browse through our latest projects')
    .setLayout('grid')
    .setColumns(3)

  // Add media items
  gallery.addItem(
    new MediaGalleryItemBuilder()
      .setUrl('https://example.com/project1.jpg')
      .setTitle('Project Alpha')
      .setDescription('A revolutionary web application')
      .setType('image')
  )

  gallery.addItem(
    new MediaGalleryItemBuilder()
      .setUrl('https://example.com/project2.jpg')
      .setTitle('Project Beta')
      .setDescription('Mobile-first design solution')
      .setType('image')
  )

  await interaction.reply({
    content: gallery.build()
  })
}
```

## Advanced Usage

### Dynamic Gallery Creation
```js
export async function createProjectGallery(projects) {
  const gallery = new MediaGalleryBuilder()
    .setTitle('Project Portfolio')
    .setDescription(`Showing ${projects.length} projects`)
    .setLayout('masonry')
    .setColumns(2)
    .setSpacing(10)
    .setTheme('dark')

  // Add projects to gallery
  projects.forEach((project, index) => {
    const item = new MediaGalleryItemBuilder()
      .setUrl(project.thumbnailUrl)
      .setTitle(project.name)
      .setDescription(project.shortDescription)
      .setType('image')
      .setMetadata({
        id: project.id,
        category: project.category,
        technologies: project.technologies,
        createdAt: project.createdAt
      })

    // Add interactive elements
    if (project.demoUrl) {
      item.addAction({
        type: 'button',
        label: 'View Demo',
        url: project.demoUrl,
        style: 'primary'
      })
    }

    if (project.githubUrl) {
      item.addAction({
        type: 'button',
        label: 'View Code',
        url: project.githubUrl,
        style: 'secondary'
      })
    }

    gallery.addItem(item)
  })

  // Add gallery controls
  gallery.addControls({
    navigation: true,
    zoom: true,
    fullscreen: true,
    download: false
  })

  return gallery
}

export async function execute(interaction) {
  const projects = await fetchProjects()
  const gallery = await createProjectGallery(projects)

  await interaction.reply({
    content: gallery.build()
  })
}
```

### Themed Galleries
```js
export function createThemedGallery(theme, items) {
  const gallery = new MediaGalleryBuilder()
    .setTitle(getThemeTitle(theme))
    .setLayout(getThemeLayout(theme))
    .setTheme(theme)

  // Apply theme-specific styling
  switch (theme) {
    case 'minimal':
      return gallery
        .setColumns(4)
        .setSpacing(5)
        .setBorder(false)
        .setShadow(false)

    case 'modern':
      return gallery
        .setColumns(3)
        .setSpacing(15)
        .setBorder(true)
        .setBorderRadius(12)
        .setShadow(true)

    case 'classic':
      return gallery
        .setColumns(2)
        .setSpacing(20)
        .setBorder(true)
        .setBorderStyle('solid')
        .setBorderColor('#CCCCCC')

    case 'portfolio':
      return gallery
        .setColumns(2)
        .setSpacing(25)
        .setTheme('light')
        .setHoverEffect('lift')

    default:
      return gallery
        .setColumns(3)
        .setSpacing(10)
  }

  // Add items with theme-specific formatting
  items.forEach(item => {
    const galleryItem = new MediaGalleryItemBuilder()
      .setUrl(item.url)
      .setTitle(item.title)
      .setDescription(item.description)
      .setType(item.type)

    // Apply theme styling
    applyThemeStyling(galleryItem, theme)
    gallery.addItem(galleryItem)
  })

  return gallery
}

function getThemeTitle(theme) {
  const titles = {
    minimal: 'Minimal Gallery',
    modern: 'Modern Collection',
    classic: 'Classic Gallery',
    portfolio: 'Portfolio Showcase'
  }
  return titles[theme] || 'Media Gallery'
}

function getThemeLayout(theme) {
  const layouts = {
    minimal: 'grid',
    modern: 'masonry',
    classic: 'list',
    portfolio: 'carousel'
  }
  return layouts[theme] || 'grid'
}
```

### Interactive Gallery
```js
export async function createInteractiveGallery(interaction) {
  const gallery = new MediaGalleryBuilder()
    .setTitle('Interactive Gallery')
    .setDescription('Click items to view details')
    .setLayout('carousel')
    .setAutoPlay(false)
    .setLoop(true)

  // Add categories
  gallery.addCategory('All', 'all')
  gallery.addCategory('Images', 'image')
  gallery.addCategory('Videos', 'video')
  gallery.addCategory('Documents', 'document')

  // Add filter controls
  gallery.addFilter({
    type: 'category',
    label: 'Filter by type',
    options: ['all', 'image', 'video', 'document']
  })

  // Add search functionality
  gallery.addSearch({
    placeholder: 'Search gallery...',
    fields: ['title', 'description', 'tags']
  })

  // Add sorting options
  gallery.addSort({
    options: [
      { label: 'Newest', value: 'created_desc' },
      { label: 'Oldest', value: 'created_asc' },
      { label: 'Name A-Z', value: 'name_asc' },
      { label: 'Name Z-A', value: 'name_desc' }
    ],
    default: 'created_desc'
  })

  // Add pagination
  gallery.setPagination({
    itemsPerPage: 6,
    showControls: true,
    scrollBehavior: 'smooth'
  })

  return gallery
}
```

### Mixed Media Gallery
```js
export async function createMixedMediaGallery(content) {
  const gallery = new MediaGalleryBuilder()
    .setTitle('Mixed Media Collection')
    .setDescription('Images, videos, and documents')
    .setLayout('masonry')
    .setColumns(3)

  // Process different content types
  content.forEach(item => {
    let galleryItem

    switch (item.type) {
      case 'image':
        galleryItem = createImageItem(item)
        break
      case 'video':
        galleryItem = createVideoItem(item)
        break
      case 'document':
        galleryItem = createDocumentItem(item)
        break
      default:
        galleryItem = createGenericItem(item)
    }

    gallery.addItem(galleryItem)
  })

  return gallery
}

function createImageItem(item) {
  return new MediaGalleryItemBuilder()
    .setUrl(item.url)
    .setTitle(item.title)
    .setDescription(item.description)
    .setType('image')
    .setThumbnail(item.thumbnailUrl)
    .setMetadata({
      dimensions: item.dimensions,
      fileSize: item.fileSize,
      format: item.format
    })
    .addAction({
      type: 'button',
      label: 'View Full Size',
      action: 'fullscreen',
      style: 'primary'
    })
}

function createVideoItem(item) {
  return new MediaGalleryItemBuilder()
    .setUrl(item.url)
    .setTitle(item.title)
    .setDescription(item.description)
    .setType('video')
    .setThumbnail(item.thumbnailUrl)
    .setMetadata({
      duration: item.duration,
      resolution: item.resolution,
      fileSize: item.fileSize
    })
    .addAction({
      type: 'button',
      label: 'Play Video',
      action: 'play',
      style: 'primary'
    })
}

function createDocumentItem(item) {
  return new MediaGalleryItemBuilder()
    .setUrl(item.url)
    .setTitle(item.title)
    .setDescription(item.description)
    .setType('document')
    .setThumbnail(item.iconUrl)
    .setMetadata({
      pages: item.pages,
      fileSize: item.fileSize,
      format: item.format
    })
    .addAction({
      type: 'button',
      label: 'Download',
      action: 'download',
      style: 'secondary'
    })
}
```

## Gallery Layouts

### Grid Layout
```js
const gridGallery = new MediaGalleryBuilder()
  .setLayout('grid')
  .setColumns(3)
  .setSpacing(10)
  .setAspectRatio('1:1')
```

### Masonry Layout
```js
const masonryGallery = new MediaGalleryBuilder()
  .setLayout('masonry')
  .setColumns(2)
  .setSpacing(15)
  .setMinItemHeight(200)
```

### Carousel Layout
```js
const carouselGallery = new MediaGalleryBuilder()
  .setLayout('carousel')
  .setItemsPerView(1)
  .setAutoPlay(true)
  .setAutoPlayInterval(3000)
  .setShowIndicators(true)
```

### List Layout
```js
const listGallery = new MediaGalleryBuilder()
  .setLayout('list')
  .setItemHeight(120)
  .setShowThumbnails(true)
  .setThumbnailSize('80x80')
```

## Gallery Controls

### Navigation Controls
```js
const gallery = new MediaGalleryBuilder()
  .addControls({
    navigation: true,
    pagination: true,
    itemsPerPage: 6,
    showPageNumbers: true
  })
```

### View Controls
```js
const gallery = new MediaGalleryBuilder()
  .addControls({
    zoom: true,
    fullscreen: true,
    download: false,
    share: true
  })
```

### Filter Controls
```js
const gallery = new MediaGalleryBuilder()
  .addFilter({
    type: 'tags',
    label: 'Filter by tags',
    multiSelect: true
  })
  .addFilter({
    type: 'date',
    label: 'Filter by date',
    options: ['today', 'week', 'month', 'year']
  })
```

## Limits and Constraints

### Gallery Limits
- **Maximum Items**: 100 items per gallery
- **Maximum Columns**: 6 columns
- **Maximum File Size**: 25MB per item
- **Supported Formats**: Images (JPG, PNG, WebP, GIF), Videos (MP4, WebM), Documents (PDF)

### Item Limits
- **Title Length**: Maximum 100 characters
- **Description Length**: Maximum 500 characters
- **Tags**: Maximum 10 tags per item

### Validation Examples
```js
// Valid gallery
const validGallery = new MediaGalleryBuilder()
  .setTitle('Valid Gallery')
  .setLayout('grid')
  .setColumns(3)

// Error: Too many columns
const invalidGallery = new MediaGalleryBuilder()
  .setTitle('Invalid Gallery')
  .setLayout('grid')
  .setColumns(10) // Exceeds 6 column limit
```

## Best Practices

### Appropriate Layout Selection
```js
// Good: Choose layout based on content type
const imageGallery = new MediaGalleryBuilder()
  .setLayout('grid')  // Good for uniform images

const mixedGallery = new MediaGalleryBuilder()
  .setLayout('masonry')  // Good for varied content sizes

const featureGallery = new MediaGalleryBuilder()
  .setLayout('carousel')  // Good for highlighting items
```

### Proper Column Configuration
```js
// Good: Responsive column setup
const responsiveGallery = new MediaGalleryBuilder()
  .setColumns(3)  // Desktop
  // Mobile would automatically adjust to 1-2 columns
```

### Descriptive Metadata
```js
// Good: Rich metadata for better searchability
const detailedItem = new MediaGalleryItemBuilder()
  .setTitle('Project Screenshot')
  .setDescription('Dashboard showing user analytics')
  .setMetadata({
    category: 'dashboard',
    technologies: ['React', 'Chart.js'],
    date: '2024-01-15',
    author: 'John Doe'
  })
```

## Common Mistakes

### Inconsistent Content Types
```js
// Bad: Mixing incompatible content in same gallery
const mixedGallery = new MediaGalleryBuilder()
  .setLayout('grid')  // Not ideal for mixed content types
  .addItems([imageItem, videoItem, documentItem])

// Good: Use appropriate layout for mixed content
const betterGallery = new MediaGalleryBuilder()
  .setLayout('masonry')  // Better for varied content
  .addItems([imageItem, videoItem, documentItem])
```

### Overcrowded Layouts
```js
// Bad: Too many columns for content
const crowdedGallery = new MediaGalleryBuilder()
  .setLayout('grid')
  .setColumns(6)  // Too many for most content
  .setSpacing(2)  // Too tight

// Good: Balanced layout
const balancedGallery = new MediaGalleryBuilder()
  .setLayout('grid')
  .setColumns(3)  // Reasonable number
  .setSpacing(15)  // Adequate spacing
```

### Missing Descriptions
```js
// Bad: Items without context
const contextlessItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/image.jpg')
  .setTitle('Image')  // Not descriptive

// Good: Items with proper context
const contextualItem = new MediaGalleryItemBuilder()
  .setUrl('https://example.com/image.jpg')
  .setTitle('User Dashboard Analytics')
  .setDescription('Monthly user engagement metrics and trends')
```

## Integration with Other Builders

### With MediaGalleryItemBuilder
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

- Use lazy loading for large galleries
- Implement pagination for better performance
- Optimize images and videos before adding
- Use appropriate formats (WebP for images, MP4 for videos)
- Limit the number of items per gallery

## Next Steps

- [MediaGalleryItemBuilder](/builders/media-gallery-item-builder) - Individual media items
- [FileBuilder](/builders/file-builder) - Handle file attachments
- [ModalBuilder](/builders/modal-builder) - Create interactive forms