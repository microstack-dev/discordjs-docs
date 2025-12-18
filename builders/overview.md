# Builders Overview

Builders provide a type-safe, fluent interface for creating Discord API objects. They eliminate raw JSON construction and ensure API compliance.

## What Are Builders

Builders are classes that construct Discord objects through method chaining. They validate data types, enforce limits, and provide autocomplete support.

### Why Builders Exist

- **Type Safety**: Compile-time validation of data types
- **API Compliance**: Automatic enforcement of Discord's rules
- **Developer Experience**: Autocomplete and method documentation
- **Error Prevention**: Early detection of invalid configurations
- **Readability**: Self-documenting code structure

## Builder Categories

Discord.js v14.25.1 includes builders for:

### Application Commands
- `SlashCommandBuilder`: Create slash commands
- `ContextMenuCommandBuilder`: Create context menu commands

### UI Components
- `ActionRowBuilder`: Organize components
- `ButtonBuilder`: Create interactive buttons
- `StringSelectMenuBuilder`: Create dropdown menus
- `EmbedBuilder`: Create rich embeds

### Modals & Forms
- `ModalBuilder`: Create popup forms
- `TextInputBuilder`: Create form inputs

### Specialized Builders
- `ContainerBuilder`: Layout containers
- `SectionBuilder`: Content sections
- `TextDisplayBuilder`: Text presentation
- `LabelBuilder`: Label components
- `SeparatorBuilder`: Visual separators
- `ThumbnailBuilder`: Image thumbnails
- `MediaGalleryBuilder`: Media collections
- `MediaGalleryItemBuilder`: Individual media items
- `FileBuilder`: File attachments

## Basic Builder Pattern

All builders follow a similar pattern:
```js
import { SlashCommandBuilder } from 'discord.js'

const command = new SlashCommandBuilder()
  .setName('example')
  .setDescription('An example command')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('User input')
      .setRequired(true)
  )

console.log(command.toJSON())
```

## Builder Composition

Builders can be composed together:
```js
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder 
} from 'discord.js'

// Create embed
const embed = new EmbedBuilder()
  .setTitle('Interactive Message')
  .setDescription('Click the button below')

// Create button
const button = new ButtonBuilder()
  .setCustomId('click_me')
  .setLabel('Click Me')
  .setStyle(ButtonStyle.Primary)

// Create action row
const row = new ActionRowBuilder().addComponents(button)

// Send message
await interaction.reply({
  embeds: [embed],
  components: [row]
})
```

## Type Safety Benefits

Builders provide compile-time type checking:
```js
// TypeScript catches errors at compile time
const command = new SlashCommandBuilder()
  .setName('test')
  .setDescription('Test command')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('User input')
      // .setMaxLength(1000) // Error: Method doesn't exist
      .setMaxLength(100)     // Correct: Valid method
  )
```

## API Compliance

Builders enforce Discord's API limits:
```js
// Builder enforces limits automatically
const embed = new EmbedBuilder()
  .setTitle('Title') // Max 256 characters
  .setDescription('Description') // Max 4096 characters
  // .addField('Field', 'Value') // Error: Method doesn't exist in v14
  .addFields(
    { name: 'Field1', value: 'Value1' },
    { name: 'Field2', value: 'Value2' }
  ) // Max 25 fields
```

## Method Chaining

Builders use fluent interface for readability:
```js
// Clean, readable chain
const command = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Get user information')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('Target user')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('detailed')
      .setDescription('Show detailed info')
      .setRequired(false)
  )
```

## Validation and Error Handling

Builders validate data and provide helpful errors:
```js
try {
  const command = new SlashCommandBuilder()
    .setName('a'.repeat(33)) // Error: Name too long
    .setDescription('Valid description')
} catch (error) {
  console.error('Builder error:', error.message)
}
```

## Conversion to JSON

Builders convert to Discord API format:
```js
const builder = new SlashCommandBuilder()
  .setName('test')
  .setDescription('Test command')

// Convert to API-compatible JSON
const apiData = builder.toJSON()

// Convert to plain object
const plainObject = builder.toJSON()
```

## Advanced Usage

### Conditional Building
```js
function createCommand(adminOnly) {
  const builder = new SlashCommandBuilder()
    .setName('manage')
    .setDescription('Manage server settings')
  
  if (adminOnly) {
    builder.setDefaultMemberPermissions(0) // Admin only
  }
  
  return builder
}
```

### Dynamic Options
```js
function createCommandWithChoices(choices) {
  const builder = new SlashCommandBuilder()
    .setName('select')
    .setDescription('Select an option')
    .addStringOption(option =>
      option
        .setName('choice')
        .setDescription('Select from choices')
        .setRequired(true)
    )
  
  // Add choices dynamically
  choices.forEach(choice => {
    builder.options[0].addChoices(choice)
  })
  
  return builder
}
```

## Performance Considerations

- Builders are lightweight and fast
- No runtime overhead compared to raw JSON
- Memory usage is minimal
- Validation happens during construction

## Best Practices

1. **Always use builders** for new code
2. **Chain methods** for readability
3. **Validate early** using builder methods
4. **Reuse builders** for similar structures
5. **Handle errors** from builder validation

## Migration from Raw JSON

### Before (Raw JSON)
```js
const commandData = {
  name: 'example',
  description: 'An example command',
  options: [{
    name: 'input',
    description: 'User input',
    type: 3, // STRING
    required: true
  }]
}
```

### After (Builder)
```js
const commandData = new SlashCommandBuilder()
  .setName('example')
  .setDescription('An example command')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('User input')
      .setRequired(true)
  )
  .toJSON()
```

## Next Steps

Explore individual builders:
- [SlashCommandBuilder](/builders/slash-command-builder)
- [ContainerBuilder](/builders/container-builder)
- [ModalBuilder](/builders/modal-builder)
- And more...

Each builder has dedicated documentation with examples and best practices.