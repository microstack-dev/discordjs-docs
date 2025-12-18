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

Discord.js v14.25.1 includes **26 builders** organized into categories:

### 🎯 Component Builders (v0.2.0)
Interactive UI components for messages and modals:
- `ActionRowBuilder`: Organize components in horizontal rows
- `ButtonBuilder`: Create clickable buttons with custom actions
- `StringSelectMenuBuilder`: Dropdown menus for string selections
- `UserSelectMenuBuilder`: User selection dropdowns
- `RoleSelectMenuBuilder`: Role selection dropdowns
- `ChannelSelectMenuBuilder`: Channel selection dropdowns
- `MentionableSelectMenuBuilder`: Combined user/role selection

### 📄 Embed & Message Builders (v0.2.0)
Rich content and message construction:
- `EmbedBuilder`: Create formatted embed messages
- `AttachmentBuilder`: Handle file attachments with validation
- `MessagePayload`: Construct complete message payloads
- `MessageCreateOptions`: Configure advanced message options

### ⚡ Command Tree Builders (v0.2.0)
Complex command structures and hierarchies:
- `ContextMenuCommandBuilder`: User/message context menu commands
- `SlashCommandSubcommandBuilder`: Individual subcommands
- `SlashCommandSubcommandGroupBuilder`: Organize subcommands into groups

### 📝 Modal & Input Builders (v0.2.0)
Interactive forms and user input collection:
- `ModalBuilder`: Create popup modal dialogs
- `TextInputBuilder`: Form input fields with validation

### 🏗️ Specialized Builders (v0.1.0)
Content organization and presentation:
- `SlashCommandBuilder`: Basic slash command construction
- `ContainerBuilder`: UI component containers
- `SectionBuilder`: Structured content sections
- `TextDisplayBuilder`: Formatted text displays
- `LabelBuilder`: Descriptive labels and badges
- `SeparatorBuilder`: Visual content dividers
- `ThumbnailBuilder`: Image thumbnails
- `MediaGalleryBuilder`: Media collections
- `MediaGalleryItemBuilder`: Individual media items
- `FileBuilder`: File attachment handling

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

## Version History

### v0.2.0 - Builder Completion Release ✅
- **Component Builders**: 7 new builders for interactive UI components
- **Embed & Message Builders**: 4 new builders for rich content creation
- **Command Tree Builders**: 3 new builders for complex command hierarchies
- **Modal & Input Builders**: 2 new builders for form interactions
- **Total**: 26 builders fully documented

### v0.1.0 - Foundation Release
- **Specialized Builders**: 10 foundational builders for content and organization
- **Core Infrastructure**: Builder patterns and best practices

## Next Steps

Explore builders by category:

### Component Builders
- [ActionRowBuilder](/builders/action-row-builder) - Organize interactive components
- [ButtonBuilder](/builders/button-builder) - Create interactive buttons
- [StringSelectMenuBuilder](/builders/string-select-menu-builder) - Dropdown selections

### Embed & Message Builders
- [EmbedBuilder](/builders/embed-builder) - Rich embed messages
- [AttachmentBuilder](/builders/attachment-builder) - File attachments
- [MessagePayload](/builders/message-payload) - Complete message construction

### Command Builders
- [ContextMenuCommandBuilder](/builders/context-menu-command-builder) - Context menus
- [SlashCommandSubcommandBuilder](/builders/slash-command-subcommand-builder) - Subcommands
- [SlashCommandSubcommandGroupBuilder](/builders/slash-command-subcommand-group-builder) - Command groups

### Modal Builders
- [ModalBuilder](/builders/modal-builder) - Interactive forms
- [TextInputBuilder](/builders/text-input-builder) - Form input fields

Each builder includes comprehensive documentation with examples, limits, and best practices.