# Deferring and Updating

Master the timing and methods for responding to Discord interactions. Proper deferring ensures your bot remains responsive during complex operations.

## Response Timing Fundamentals

### The 3-Second Rule

Discord requires bots to respond to interactions within 3 seconds. Violating this causes the interaction to fail with a "This interaction failed" error.

### When to Defer

Defer responses when operations take longer than 500ms:

- Database queries
- API calls
- File processing
- Complex computations
- Multi-step operations

## Deferring Methods

### deferReply()

Defers the initial response, showing a loading state:

```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === 'slow-command') {
    await interaction.deferReply()
    await new Promise(resolve => setTimeout(resolve, 2000))
    await interaction.editReply('Operation completed!')
  }
})
```

### deferReply() with Ephemeral

Create private loading states:

```js
await interaction.deferReply({ ephemeral: true })
// Only the user sees the loading state
await interaction.editReply('Processing your private request...')
```

### deferUpdate()

For component interactions, defers the update:

```js
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return

  if (interaction.customId === 'process-data') {
    await interaction.deferUpdate()
    const result = await processUserData(interaction.user.id)
    await interaction.editReply(`Data processed: ${result}`)
  }
})
```

## Response Methods After Deferring

### editReply()

Modify the deferred response:

```js
await interaction.deferReply()
const data = await fetchData()
await interaction.editReply(`Result: ${data}`)
```

### followUp()

Send additional messages after the initial response:

```js
await interaction.deferReply()
await interaction.editReply('Starting process...')
await interaction.followUp('Step 1 complete')
await interaction.followUp('Process finished!')
```

## Non-Deferred Responses

### reply()

Immediate response for fast operations:

```js
if (interaction.commandName === 'ping') {
  await interaction.reply('Pong!')
}
```

### update()

For component interactions, update the message:

```js
if (interaction.isButton() && interaction.customId === 'toggle') {
  const newState = toggleUserSetting(interaction.user.id)
  await interaction.update(`Setting ${newState ? 'enabled' : 'disabled'}`)
}
```

## Best Practices

### Timing Strategy Selection
- **< 500ms**: Use `reply()` - immediate response
- **500ms - 3s**: Use `deferReply()` - show loading state
- **> 3s**: Use `deferReply()` + progress updates

### User Experience
- Always show loading states for operations > 1 second
- Use appropriate loading messages
- Provide progress updates for long operations

### Error Handling
- Handle errors after deferring with `editReply()`
- Provide user-friendly error messages
- Offer retry options when appropriate

## Common Mistakes

### Double Response Error
```js
await interaction.deferReply()
await interaction.reply('Response') // Error: Already deferred
await interaction.editReply('Fixed') // This works
```

### Missing deferReply()
```js
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'slow') {
    await new Promise(resolve => setTimeout(resolve, 4000)) // Over 3 seconds
    await interaction.reply('Done') // Error: Interaction failed
  }
})
// Fix: Add deferReply()
```

### Incorrect Update Usage
```js
if (interaction.isChatInputCommand()) {
  await interaction.update('Response') // Error: Not a component interaction
}
// Use reply() for slash commands, update() only for components
```

## Next Steps

- [Ephemeral Interactions](/interactions/ephemeral-interactions) - Private responses
- [Error Handling](/interactions/error-handling) - Robust error management