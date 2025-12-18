# AttachmentBuilder

Handle file attachments for messages with proper metadata and validation.

## Overview

`AttachmentBuilder` constructs file attachments with appropriate metadata, validation, and formatting. It ensures files are properly handled and attached to messages with correct content types and sizes.

## Basic Example

```js
import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'
import fs from 'fs'

export const data = new SlashCommandBuilder()
  .setName('send-file')
  .setDescription('Send a file attachment')

export async function execute(interaction) {
  const file = new AttachmentBuilder('./files/document.pdf')
    .setName('important_document.pdf')
    .setDescription('Important document for review')

  await interaction.reply({
    content: 'Here is the requested document:',
    files: [file]
  })
}
```

## Advanced Usage

### Dynamic File Generation and Attachment
```js
import { createCanvas } from 'canvas'

export async function generateChartAttachment(data, format = 'png') {
  // Generate chart using canvas or similar library
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext('2d')

  // Draw chart content
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 800, 600)

  // Add chart title
  ctx.fillStyle = '#000000'
  ctx.font = '24px Arial'
  ctx.fillText('Server Statistics', 20, 40)

  // Generate buffer
  const buffer = canvas.toBuffer(`image/${format}`)

  // Create attachment with metadata
  const attachment = new AttachmentBuilder(buffer)
    .setName(`chart_${Date.now()}.${format}`)
    .setDescription(`Generated chart - ${new Date().toISOString()}`)
    .setSpoiler(false)

  return attachment
}

export async function execute(interaction) {
  const chartData = await gatherServerStats(interaction.guild)
  const chartAttachment = await generateChartAttachment(chartData)

  const embed = new EmbedBuilder()
    .setTitle('Server Statistics Chart')
    .setImage(`attachment://${chartAttachment.name}`)
    .setColor('Blue')

  await interaction.reply({
    embeds: [embed],
    files: [chartAttachment]
  })
}
```

### File Upload with Validation and Progress
```js
export class FileUploader {
  constructor(maxSize = 25 * 1024 * 1024) { // 25MB default
    this.maxSize = maxSize
    this.allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
      'application/zip', 'video/mp4', 'audio/mpeg'
    ]
  }

  async validateFile(filePath) {
    const stats = await fs.promises.stat(filePath)

    if (stats.size > this.maxSize) {
      throw new Error(`File size (${stats.size} bytes) exceeds maximum (${this.maxSize} bytes)`)
    }

    const mimeType = await this.getMimeType(filePath)
    if (!this.allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    return { size: stats.size, type: mimeType, path: filePath }
  }

  async createAttachment(filePath, options = {}) {
    const validation = await this.validateFile(filePath)

    const attachment = new AttachmentBuilder(filePath)
      .setName(options.name || path.basename(filePath))
      .setDescription(options.description || 'File attachment')

    // Add spoiler if requested
    if (options.spoiler) {
      attachment.setSpoiler(true)
    }

    // Add metadata
    attachment.metadata = {
      originalName: path.basename(filePath),
      size: validation.size,
      type: validation.type,
      uploadedAt: new Date().toISOString(),
      uploader: options.uploader
    }

    return attachment
  }

  async getMimeType(filePath) {
    // Use file-type library or similar for proper MIME detection
    const { fileTypeFromFile } = await import('file-type')
    const result = await fileTypeFromFile(filePath)
    return result?.mime || 'application/octet-stream'
  }
}

export async function execute(interaction) {
  const uploader = new FileUploader()
  const filePath = './uploads/user_document.pdf'

  try {
    const attachment = await uploader.createAttachment(filePath, {
      name: 'processed_document.pdf',
      description: 'User uploaded document',
      spoiler: false,
      uploader: interaction.user.id
    })

    await interaction.reply({
      content: 'File processed successfully:',
      files: [attachment]
    })
  } catch (error) {
    await interaction.reply({
      content: `Upload failed: ${error.message}`,
      ephemeral: true
    })
  }
}
```

### Batch File Processing and Attachment
```js
export async function createBatchAttachments(filePaths, options = {}) {
  const uploader = new FileUploader(options.maxSize)
  const attachments = []
  const errors = []

  for (const [index, filePath] of filePaths.entries()) {
    try {
      const attachment = await uploader.createAttachment(filePath, {
        name: options.names?.[index] || `file_${index + 1}${path.extname(filePath)}`,
        description: options.descriptions?.[index] || `Batch file ${index + 1}`,
        spoiler: options.spoiler || false,
        uploader: options.uploader
      })

      attachments.push(attachment)
    } catch (error) {
      errors.push(`File ${index + 1}: ${error.message}`)
    }
  }

  return { attachments, errors }
}

export async function execute(interaction) {
  const filePaths = [
    './files/report1.pdf',
    './files/report2.pdf',
    './files/chart.png'
  ]

  const { attachments, errors } = await createBatchAttachments(filePaths, {
    maxSize: 10 * 1024 * 1024, // 10MB per file
    names: ['Q1_Report.pdf', 'Q2_Report.pdf', 'Summary_Chart.png'],
    descriptions: ['First quarter report', 'Second quarter report', 'Summary visualization'],
    uploader: interaction.user.id
  })

  let content = `Successfully processed ${attachments.length} files:`
  
  if (errors.length > 0) {
    content += `\n\nErrors (${errors.length}):\n${errors.join('\n')}`
  }

  await interaction.reply({
    content,
    files: attachments
  })
}
```

## Limits & Constraints

### File Size Limits
- **Maximum File Size**: 25MB per file
- **Total Message Size**: 100MB across all attachments
- **Premium Users**: Up to 50MB per file

### Supported File Types
- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, TXT, DOC, DOCX
- **Archives**: ZIP, RAR
- **Videos**: MP4, WebM, MOV (25MB limit)
- **Audio**: MP3, WAV, OGG (25MB limit)

### Filename Constraints
- **Maximum Length**: 255 characters
- **Allowed Characters**: Alphanumeric, hyphens, underscores, periods
- **Reserved Names**: Certain filenames may be blocked

### Validation Examples
```js
// Valid attachment
const validAttachment = new AttachmentBuilder('./files/document.pdf')
  .setName('report.pdf')
  .setDescription('Monthly report')

// Error: File too large
const oversizedAttachment = new AttachmentBuilder('./files/huge_file.zip')
  // File size exceeds 25MB limit

// Error: Invalid filename
const invalidName = new AttachmentBuilder('./files/document.pdf')
  .setName('invalid@name!.pdf') // Invalid characters
```

## Best Practices

### Proper File Validation
```js
// Good: Validate files before attachment
const uploader = new FileUploader()

try {
  const attachment = await uploader.createAttachment('./uploads/file.pdf', {
    name: 'validated_file.pdf',
    description: 'Validated file attachment'
  })

  await interaction.reply({
    content: 'File uploaded successfully',
    files: [attachment]
  })
} catch (error) {
  await interaction.reply({
    content: `Upload failed: ${error.message}`,
    ephemeral: true
  })
}
```

### Descriptive Naming and Descriptions
```js
// Good: Clear, descriptive attachments
const descriptiveAttachment = new AttachmentBuilder('./files/report.pdf')
  .setName('monthly_sales_report_december_2024.pdf')
  .setDescription('December 2024 sales report with charts and analysis')

// Avoid: Generic names
const genericAttachment = new AttachmentBuilder('./files/report.pdf')
  .setName('file.pdf')
  .setDescription('A file')
```

### Appropriate Spoiler Usage
```js
// Good: Use spoilers for sensitive content
const sensitiveAttachment = new AttachmentBuilder('./files/confidential.pdf')
  .setName('confidential_report.pdf')
  .setDescription('Confidential business report')
  .setSpoiler(true)

// Avoid: Unnecessary spoilers
const publicAttachment = new AttachmentBuilder('./files/public_info.pdf')
  .setName('public_info.pdf')
  // Don't mark public files as spoilers
```

## Common Mistakes

### Missing File Validation
```js
// Bad: No validation before attachment
const unsafeAttachment = new AttachmentBuilder(userProvidedPath)
  .setName('user_file.pdf')

// Could be malicious or oversized
await interaction.reply({ files: [unsafeAttachment] })

// Good: Validate before use
const uploader = new FileUploader()
const safeAttachment = await uploader.createAttachment(userProvidedPath)
await interaction.reply({ files: [safeAttachment] })
```

### Incorrect MIME Types
```js
// Bad: Wrong file extension
const misnamedAttachment = new AttachmentBuilder('./files/data.json')
  .setName('data.txt') // JSON file with TXT extension

// Good: Correct extension and type
const correctAttachment = new AttachmentBuilder('./files/data.json')
  .setName('data.json') // Proper JSON extension
```

### Memory Issues with Large Files
```js
// Bad: Loading entire file into memory
const memoryIntensive = new AttachmentBuilder(
  fs.readFileSync('./files/huge_video.mp4') // Loads entire file
)

// Good: Use file path for large files
const memoryEfficient = new AttachmentBuilder('./files/huge_video.mp4')
  // Discord.js streams the file automatically
```

## Next Steps

- [MessagePayload](/builders/message-payload) - Construct complete message payloads
- [MessageCreateOptions](/builders/message-create-options) - Configure message creation options