# FileBuilder

Handle file attachments, uploads, and downloads in Discord interactions.

## Overview

`FileBuilder` constructs file attachments with proper metadata, validation, and optimization for Discord's file handling system. Perfect for sharing documents, images, and other files.

## Basic Example

```js
import { FileBuilder, AttachmentBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('upload')
  .setDescription('Upload a file')

export async function execute(interaction) {
  const file = new FileBuilder()
    .setName('document.pdf')
    .setPath('./files/document.pdf')
    .setDescription('Important document')
    .setType('application/pdf')

  const attachment = new AttachmentBuilder(file.build())
  
  await interaction.reply({
    content: 'Here is your file:',
    files: [attachment]
  })
}
```

## Advanced Usage

### Dynamic File Upload
```js
export async function createFileUpload(filePath, options = {}) {
  const file = new FileBuilder()
    .setName(options.name || path.basename(filePath))
    .setPath(filePath)
    .setDescription(options.description || 'File attachment')

  // Auto-detect file type
  const fileStats = await fs.promises.stat(filePath)
  const mimeType = getMimeType(filePath)
  
  file.setType(mimeType)
  .setSize(fileStats.size)
  .setLastModified(fileStats.mtime)

  // Add metadata
  if (options.metadata) {
    file.setMetadata(options.metadata)
  }

  // Add preview for images
  if (mimeType.startsWith('image/')) {
    file.setPreview(await generateImagePreview(filePath))
  }

  // Add thumbnail for documents
  if (mimeType === 'application/pdf') {
    file.setThumbnail(await generatePDFThumbnail(filePath))
  }

  return file
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
```

### Multi-File Upload
```js
export async function createMultiFileUpload(filePaths, options = {}) {
  const files = []
  
  for (const [index, filePath] of filePaths.entries()) {
    const file = await createFileUpload(filePath, {
      name: options.names?.[index] || `file_${index + 1}${path.extname(filePath)}`,
      description: options.descriptions?.[index] || `File ${index + 1}`,
      metadata: {
        batch: options.batchId || Date.now().toString(),
        index: index,
        total: filePaths.length
      }
    })
    
    files.push(new AttachmentBuilder(file.build()))
  }

  return files
}

export async function execute(interaction) {
  const filePaths = [
    './files/document1.pdf',
    './files/document2.pdf',
    './files/image.jpg'
  ]

  const attachments = await createMultiFileUpload(filePaths, {
    batchId: 'batch_123',
    names: ['Contract.pdf', 'Invoice.pdf', 'Signature.jpg'],
    descriptions: ['Legal contract', 'Payment invoice', 'Digital signature']
  })

  await interaction.reply({
    content: `Uploading ${attachments.length} files...`,
    files: attachments
  })
}
```

### File Processing and Optimization
```js
export async function processFileForUpload(filePath, options = {}) {
  const file = new FileBuilder()
    .setName(path.basename(filePath))
    .setPath(filePath)

  // Image optimization
  if (options.optimizeImages && isImageFile(filePath)) {
    const optimizedPath = await optimizeImage(filePath, {
      quality: options.imageQuality || 80,
      format: options.imageFormat || 'webp',
      maxWidth: options.maxWidth || 1920,
      maxHeight: options.maxHeight || 1080
    })
    
    file.setPath(optimizedPath)
    file.setType('image/webp')
  }

  // PDF compression
  if (options.compressPDFs && filePath.endsWith('.pdf')) {
    const compressedPath = await compressPDF(filePath, {
      quality: options.pdfQuality || 80
    })
    
    file.setPath(compressedPath)
  }

  // Add watermark
  if (options.watermark && isImageFile(filePath)) {
    const watermarkedPath = await addWatermark(
      file.getPath(),
      options.watermark.text,
      options.watermark.position || 'bottom-right'
    )
    
    file.setPath(watermarkedPath)
  }

  // Generate preview
  if (options.generatePreview) {
    file.setPreview(await generateFilePreview(file.getPath()))
  }

  return file
}

async function optimizeImage(inputPath, options) {
  // Use sharp or similar library for image optimization
  const outputPath = inputPath.replace(/\.[^.]+$/, '_optimized.' + options.format)
  
  // Implementation would go here
  return outputPath
}
```

### File Validation and Security
```js
export async function validateFile(filePath, options = {}) {
  const file = new FileBuilder()
    .setPath(filePath)

  // Check file existence
  try {
    await fs.promises.access(filePath)
  } catch (error) {
    throw new Error('File does not exist')
  }

  // Get file stats
  const stats = await fs.promises.stat(filePath)
  file.setSize(stats.size)
  file.setLastModified(stats.mtime)

  // Validate file size
  const maxSize = options.maxSize || 25 * 1024 * 1024 // 25MB default
  if (stats.size > maxSize) {
    throw new Error(`File size (${stats.size} bytes) exceeds maximum (${maxSize} bytes)`)
  }

  // Validate file type
  const mimeType = getMimeType(filePath)
  const allowedTypes = options.allowedTypes || ['image/*', 'application/pdf', 'text/*']
  
  if (!isAllowedType(mimeType, allowedTypes)) {
    throw new Error(`File type (${mimeType}) is not allowed`)
  }

  // Scan for malware (if security library available)
  if (options.scanForMalware) {
    const isClean = await scanForMalware(filePath)
    if (!isClean) {
      throw new Error('File failed security scan')
    }
  }

  // Validate file signature
  if (options.validateSignature) {
    const isValidSignature = await validateFileSignature(filePath, mimeType)
    if (!isValidSignature) {
      throw new Error('File signature does not match file type')
    }
  }

  file.setType(mimeType)
  file.setValidated(true)

  return file
}

function isAllowedType(mimeType, allowedTypes) {
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      return mimeType.startsWith(allowed.slice(0, -1))
    }
    return mimeType === allowed
  })
}
```

### File Download and Caching
```js
export async function createDownloadableFile(url, options = {}) {
  const file = new FileBuilder()
    .setUrl(url)
    .setName(options.name || getFilenameFromUrl(url))

  // Download file if needed
  if (options.download) {
    const localPath = await downloadFile(url, {
      destination: options.destination || './downloads',
      timeout: options.timeout || 30000
    })
    
    file.setPath(localPath)
    file.setDownloaded(true)
  }

  // Add caching headers
  if (options.cache) {
    file.setCache({
      maxAge: options.cache.maxAge || 86400,
      mustRevalidate: options.cache.mustRevalidate || false,
      etag: options.cache.etag
    })
  }

  // Add download tracking
  if (options.trackDownloads) {
    file.setTracking({
      downloadId: generateDownloadId(),
      userId: options.userId,
      timestamp: new Date().toISOString()
    })
  }

  return file
}

async function downloadFile(url, options) {
  // Implementation for downloading files
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  
  const filename = getFilenameFromUrl(url) || 'download'
  const localPath = path.join(options.destination, filename)
  
  await fs.promises.writeFile(localPath, Buffer.from(buffer))
  
  return localPath
}
```

## File Types

### Image Files
```js
const imageFile = new FileBuilder()
  .setName('photo.jpg')
  .setPath('./images/photo.jpg')
  .setType('image/jpeg')
  .setSize(2048576) // 2MB
  .setDimensions({ width: 1920, height: 1080 })
  .setColorSpace('RGB')
```

### Document Files
```js
const documentFile = new FileBuilder()
  .setName('report.pdf')
  .setPath('./documents/report.pdf')
  .setType('application/pdf')
  .setSize(1048576) // 1MB
  .setPages(25)
  .setAuthor('John Doe')
```

### Video Files
```js
const videoFile = new FileBuilder()
  .setName('presentation.mp4')
  .setPath('./videos/presentation.mp4')
  .setType('video/mp4')
  .setSize(52428800) // 50MB
  .setDuration('5:23')
  .setResolution({ width: 1920, height: 1080 })
```

### Audio Files
```js
const audioFile = new FileBuilder()
  .setName('song.mp3')
  .setPath('./audio/song.mp3')
  .setType('audio/mpeg')
  .setSize(5242880) // 5MB
  .setDuration('3:45')
  .setBitrate('320kbps')
```

## File Properties

### Basic Properties
```js
const file = new FileBuilder()
  .setName('document.pdf')
  .setPath('./files/document.pdf')
  .setType('application/pdf')
  .setSize(1048576)
```

### Metadata Properties
```js
const fileWithMetadata = new FileBuilder()
  .setName('image.jpg')
  .setPath('./images/image.jpg')
  .setMetadata({
    author: 'Photographer Name',
    camera: 'Canon EOS R5',
    lens: 'RF 24-70mm f/2.8L',
    iso: 400,
    aperture: 'f/8',
    shutterSpeed: '1/250s',
    gps: { latitude: 40.7128, longitude: -74.0060 }
  })
```

### Security Properties
```js
const secureFile = new FileBuilder()
  .setName('sensitive.pdf')
  .setPath('./files/sensitive.pdf')
  .setEncryption('AES-256')
  .setPasswordRequired(true)
  .setAccessControl(['admin', 'moderator'])
  .setExpirationDate(new Date('2024-12-31'))
```

## Limits and Constraints

### File Size Limits
- **Maximum File Size**: 25MB per file
- **Total Upload Size**: 100MB per message
- **Premium Users**: Up to 50MB per file (with boost)

### Supported Formats
- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, TXT, DOC, DOCX
- **Videos**: MP4, WebM (max 25MB)
- **Audio**: MP3, WAV, OGG (max 25MB)

### Validation Examples
```js
// Valid file
const validFile = new FileBuilder()
  .setName('image.jpg')
  .setPath('./files/image.jpg')
  .setSize(2048576) // 2MB, within limit

// Error: File too large
const invalidFile = new FileBuilder()
  .setName('huge.pdf')
  .setPath('./files/huge.pdf')
  .setSize(30 * 1024 * 1024) // 30MB, exceeds 25MB limit
```

## Best Practices

### File Size Optimization
```js
// Good: Optimize files before upload
const optimizedFile = new FileBuilder()
  .setName('optimized_image.webp')
  .setPath('./images/optimized_image.webp')
  .setSize(512000) // 500KB, well optimized

// Bad: Upload large files without optimization
const largeFile = new FileBuilder()
  .setName('huge_image.png')
  .setPath('./images/huge_image.png')
  .setSize(10485760) // 10MB, not optimized
```

### Proper File Naming
```js
// Good: Descriptive, safe filenames
const goodNames = [
  'user_profile_2024.jpg',
  'project_documentation.pdf',
  'meeting_recording_jan15.mp4'
]

// Bad: Problematic filenames
const badNames = [
  'file with spaces.jpg',
  'file@with#special$chars.pdf',
  'very_long_filename_that_exceeds_limits_and_causes_issues.txt'
]
```

### Security Considerations
```js
// Good: Validate and scan files
const secureFile = new FileBuilder()
  .setName('validated_file.pdf')
  .setPath('./files/validated_file.pdf')
  .setValidated(true)
  .setScanned(true)

// Bad: Upload files without validation
const unsafeFile = new FileBuilder()
  .setName('unknown_file.exe')
  .setPath('./uploads/unknown_file.exe')
  // No validation or scanning
```

## Common Mistakes

### Exceeding File Size Limits
```js
// Bad: File too large for Discord
const oversizedFile = new FileBuilder()
  .setName('large_video.mp4')
  .setPath('./videos/large_video.mp4')
  .setSize(50 * 1024 * 1024) // 50MB, exceeds 25MB limit

// Good: Compress or split large files
const compressedFile = new FileBuilder()
  .setName('compressed_video.mp4')
  .setPath('./videos/compressed_video.mp4')
  .setSize(20 * 1024 * 1024) // 20MB, within limit
```

### Unsupported File Formats
```js
// Bad: Unsupported format
const unsupportedFile = new FileBuilder()
  .setName('file.psd') // Photoshop file not supported
  .setPath('./files/file.psd')

// Good: Convert to supported format
const supportedFile = new FileBuilder()
  .setName('file.png') // Converted to PNG
  .setPath('./files/file.png')
```

### Missing File Validation
```js
// Bad: No validation
const unsafeFile = new FileBuilder()
  .setName('user_upload.exe')
  .setPath('./uploads/user_upload.exe')
  // No type checking or scanning

// Good: Proper validation
const safeFile = new FileBuilder()
  .setName('user_document.pdf')
  .setPath('./uploads/user_document.pdf')
  .setType('application/pdf')
  .setValidated(true)
  .setScanned(true)
```

## Integration with Other Builders

### With AttachmentBuilder
```js
const file = new FileBuilder()
  .setName('document.pdf')
  .setPath('./files/document.pdf')

const attachment = new AttachmentBuilder(file.build())
```

### With EmbedBuilder
```js
const file = new FileBuilder()
  .setName('image.jpg')
  .setPath('./images/image.jpg')

const embed = new EmbedBuilder()
  .setTitle('Image Attachment')
  .setImage(`attachment://${file.getName()}`)
```

## Performance Considerations

- Compress files before upload
- Use appropriate file formats (WebP for images, MP4 for videos)
- Implement file caching for repeated uploads
- Use streaming for large file uploads
- Validate files early to prevent wasted bandwidth

## Next Steps

- [ContainerBuilder](/builders/container-builder) - Organize UI components
- [ModalBuilder](/builders/modal-builder) - Create interactive forms
- [ThumbnailBuilder](/builders/thumbnail-builder) - Add image thumbnails