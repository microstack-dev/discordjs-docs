# CI/CD Deployment

Discord.js v14.25.1 CI/CD pipelines for automated testing, building, and deployment of production bots. This section covers GitHub Actions, testing automation, deployment pipelines, and release management.

## GitHub Actions Setup

Configuring comprehensive CI/CD pipelines for Discord bot development.

### Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit
      env:
        CI: true

    - name: Run integration tests
      run: npm run test:integration
      env:
        CI: true
        DISCORD_TOKEN: ${{ secrets.TEST_DISCORD_TOKEN }}
        TEST_GUILD_ID: ${{ secrets.TEST_GUILD_ID }}

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
        fail_ci_if_error: true

  security:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run npm audit
      run: npm audit --audit-level=moderate

    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      continue-on-error: true
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --file=package.json

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: |
          dist/
          package.json
          package-lock.json
```

### Advanced CI Pipeline

```yaml
# .github/workflows/ci-advanced.yml
name: Advanced CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run ESLint
      run: npm run lint
      continue-on-error: true

    - name: Run Prettier check
      run: npm run format:check

    - name: Run TypeScript check
      run: npm run type-check

    - name: Run commit message linting
      uses: wagoid/commitlint-github-action@v5
      with:
        configFile: .commitlintrc.json

  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
        database: [postgresql, mysql, sqlite]
        exclude:
          # Exclude old Node versions with newer databases
          - node-version: 16.x
            database: mysql
          - node-version: 16.x
            database: postgresql

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: mysql
        options: >-
          --health-cmd mysqladmin ping
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup test database
      run: |
        if [ "${{ matrix.database }}" = "postgresql" ]; then
          echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test" >> $GITHUB_ENV
        elif [ "${{ matrix.database }}" = "mysql" ]; then
          echo "DATABASE_URL=mysql://root:mysql@localhost:3306/test" >> $GITHUB_ENV
        else
          echo "DATABASE_URL=file:./test.db" >> $GITHUB_ENV
        fi

    - name: Run database tests
      run: npm run test:db
      env:
        CI: true
        DATABASE_URL: ${{ env.DATABASE_URL }}

  performance:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Run performance tests
      run: npm run test:performance
      env:
        CI: true

    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: performance-results.json

  e2e:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        CI: true
        DISCORD_TOKEN: ${{ secrets.E2E_DISCORD_TOKEN }}
        TEST_GUILD_ID: ${{ secrets.E2E_GUILD_ID }}
        TEST_CHANNEL_ID: ${{ secrets.E2E_CHANNEL_ID }}

  container-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Build container
      run: docker build -t discord-bot:test .

    - name: Scan container for vulnerabilities
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'image'
        scan-ref: 'discord-bot:test'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'

  publish-test-results:
    runs-on: ubuntu-latest
    if: always()
    needs: [quality, test-matrix, performance, e2e]
    steps:
    - name: Publish test results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: |
          test-results/**/*.xml
          test-results/**/*.json
```

## Automated Testing

Comprehensive testing strategies for Discord bot CI/CD.

### Unit Testing Setup

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
}
```

### Integration Testing

```javascript
// tests/integration/bot.integration.test.js
const { Client, GatewayIntentBits } = require('discord.js')
const { createTestServer, destroyTestServer } = require('../helpers/test-server')

describe('Discord Bot Integration Tests', () => {
  let client
  let testGuild
  let testChannel

  beforeAll(async () => {
    // Create test Discord server and bot
    const testSetup = await createTestServer()
    testGuild = testSetup.guild
    testChannel = testSetup.channel

    // Create bot client
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    })

    await client.login(process.env.TEST_DISCORD_TOKEN)

    // Wait for bot to be ready
    await new Promise(resolve => {
      client.once('ready', resolve)
    })
  }, 30000)

  afterAll(async () => {
    // Clean up
    if (client) {
      await client.destroy()
    }

    await destroyTestServer(testGuild)
  }, 30000)

  describe('Message Commands', () => {
    test('should respond to ping command', async () => {
      const message = await testChannel.send('!ping')

      // Wait for response
      const response = await waitForMessage(testChannel, m =>
        m.author.id === client.user.id && m.content.includes('Pong')
      )

      expect(response.content).toContain('Pong')
    }, 10000)

    test('should handle unknown commands gracefully', async () => {
      const message = await testChannel.send('!unknowncommand')

      // Wait for response or timeout
      const response = await Promise.race([
        waitForMessage(testChannel, m => m.author.id === client.user.id),
        new Promise(resolve => setTimeout(resolve, 5000))
      ])

      // Should either not respond or respond with help
      if (response) {
        expect(response.content).toMatch(/help|unknown|invalid/i)
      }
    }, 10000)
  })

  describe('Guild Management', () => {
    test('should join guild successfully', async () => {
      expect(client.guilds.cache.has(testGuild.id)).toBe(true)
    })

    test('should have proper permissions', async () => {
      const botMember = testGuild.members.cache.get(client.user.id)
      expect(botMember).toBeDefined()
      expect(botMember.permissions.has('SEND_MESSAGES')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle rate limits gracefully', async () => {
      // Send multiple messages quickly
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(testChannel.send(`Test message ${i}`))
      }

      // Should not throw errors
      await expect(Promise.all(promises)).resolves.not.toThrow()
    }, 30000)
  })
})

// Test helpers
async function waitForMessage(channel, filter, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const collector = channel.createMessageCollector({
      filter,
      max: 1,
      time: timeout
    })

    collector.on('collect', message => {
      resolve(message)
    })

    collector.on('end', collected => {
      if (collected.size === 0) {
        reject(new Error('Message not received within timeout'))
      }
    })
  })
}
```

### E2E Testing

```javascript
// tests/e2e/bot.e2e.test.js
const puppeteer = require('puppeteer')
const { Client, GatewayIntentBits } = require('discord.js')

describe('Discord Bot E2E Tests', () => {
  let browser
  let page
  let client
  let testGuild
  let testChannel

  beforeAll(async () => {
    // Launch browser for Discord web client testing
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    // Create Discord bot client
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    })

    await client.login(process.env.E2E_DISCORD_TOKEN)

    // Set up test environment
    testGuild = client.guilds.cache.get(process.env.TEST_GUILD_ID)
    testChannel = testGuild.channels.cache.get(process.env.TEST_CHANNEL_ID)

    // Clear test channel
    const messages = await testChannel.messages.fetch({ limit: 100 })
    await testChannel.bulkDelete(messages)

    // Wait for bot to be ready
    await new Promise(resolve => {
      client.once('ready', resolve)
    })
  }, 60000)

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }

    if (client) {
      await client.destroy()
    }
  }, 30000)

  describe('Full User Journey', () => {
    test('complete command interaction flow', async () => {
      // User sends help command
      const helpMessage = await testChannel.send('!help')

      // Bot responds with help
      const helpResponse = await waitForBotResponse(testChannel)
      expect(helpResponse.content).toContain('help')
      expect(helpResponse.content).toContain('command')

      // User sends info command
      await testChannel.send('!info')

      // Bot responds with server info
      const infoResponse = await waitForBotResponse(testChannel)
      expect(infoResponse.content).toContain('Server')
      expect(infoResponse.embeds).toHaveLength(1)

      // User sends invalid command
      await testChannel.send('!invalidcommand123')

      // Bot handles gracefully
      const errorResponse = await waitForBotResponse(testChannel, 3000)
      if (errorResponse) {
        expect(errorResponse.content).toMatch(/unknown|invalid|help/i)
      }
    }, 30000)

    test('voice channel interaction', async () => {
      // Join voice channel
      const voiceChannel = testGuild.channels.cache.find(ch =>
        ch.type === 'GUILD_VOICE' && ch.name.includes('test')
      )

      if (voiceChannel) {
        await voiceChannel.join()

        // Wait for voice connection
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Bot should be in voice channel
        const botMember = testGuild.members.cache.get(client.user.id)
        expect(botMember.voice.channel).toBe(voiceChannel)

        // Leave voice channel
        await voiceChannel.leave()

        // Bot should not be in voice channel
        await new Promise(resolve => setTimeout(resolve, 1000))
        expect(botMember.voice.channel).toBe(null)
      }
    }, 30000)
  })

  describe('Performance Under Load', () => {
    test('handles multiple concurrent commands', async () => {
      const commandCount = 20
      const promises = []

      // Send multiple commands concurrently
      for (let i = 0; i < commandCount; i++) {
        promises.push(testChannel.send(`!ping ${i}`))
      }

      // Wait for all messages to be sent
      await Promise.all(promises)

      // Wait for responses
      const responses = []
      for (let i = 0; i < commandCount; i++) {
        try {
          const response = await waitForBotResponse(testChannel, 1000)
          responses.push(response)
        } catch (error) {
          // Some responses might be missed due to timing
        }
      }

      // Should have received at least some responses
      expect(responses.length).toBeGreaterThan(0)

      // All responses should be pong replies
      responses.forEach(response => {
        expect(response.content).toContain('Pong')
      })
    }, 60000)
  })

  describe('Error Recovery', () => {
    test('recovers from connection issues', async () => {
      // Force disconnect (simulate network issue)
      await client.destroy()

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Bot should reconnect
      expect(client.ws.status).not.toBe(3) // Not CLOSED

      // Test functionality after reconnection
      await testChannel.send('!ping')
      const response = await waitForBotResponse(testChannel)
      expect(response.content).toContain('Pong')
    }, 30000)
  })
})

// Helper functions
async function waitForBotResponse(channel, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const collector = channel.createMessageCollector({
      filter: m => m.author.id === channel.guild.members.cache.get(process.env.TEST_DISCORD_BOT_ID)?.id,
      max: 1,
      time: timeout
    })

    collector.on('collect', message => {
      resolve(message)
    })

    collector.on('end', collected => {
      if (collected.size === 0) {
        reject(new Error('Bot response not received within timeout'))
      }
    })
  })
}
```

## Deployment Pipelines

Automated deployment workflows for different environments.

### Staging Deployment

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test
      env:
        CI: true

    - name: Build application
      run: npm run build

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: discord-bot
        IMAGE_TAG: staging-${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

    - name: Deploy to ECS
      uses: aws-actions/aws-ecs-deploy-task-definition@v1
      with:
        task-definition: task-definition-staging.json
        service: discord-bot-staging
        cluster: discord-bot-cluster
        wait-for-service-stability: true
        container-name: discord-bot
        image: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}

    - name: Run smoke tests
      run: |
        # Wait for deployment to be ready
        sleep 60

        # Run basic health checks
        curl -f http://staging-api.yourdomain.com/health

        # Run simple bot command test
        # (Implementation depends on your testing setup)

    - name: Notify deployment success
      if: success()
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "Staging deployment successful"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

    - name: Notify deployment failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: "Staging deployment failed"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Production Deployment

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        ref: ${{ github.event.inputs.tag || github.event.release.tag_name }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run full test suite
      run: npm run test:ci
      env:
        CI: true

    - name: Build application
      run: npm run build

    - name: Run security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push Docker image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: discord-bot
        IMAGE_TAG: ${{ github.event.inputs.tag || github.event.release.tag_name }}
      run: |
        # Build multi-architecture image
        docker buildx create --use
        docker buildx build \
          --platform linux/amd64,linux/arm64 \
          --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
          --push .

    - name: Run database migrations
      run: |
        # Run migrations against staging first
        # (Implementation depends on your migration strategy)

    - name: Deploy to production (blue-green)
      id: deploy
      uses: aws-actions/aws-ecs-deploy-task-definition@v1
      with:
        task-definition: task-definition-production.json
        service: discord-bot-production
        cluster: discord-bot-cluster
        wait-for-service-stability: true
        container-name: discord-bot
        image: ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}

    - name: Run production smoke tests
      run: |
        # Comprehensive health checks
        curl -f https://api.yourdomain.com/health
        curl -f https://api.yourdomain.com/status

        # Test bot functionality
        # (Implementation depends on your testing setup)

    - name: Update production status
      if: success()
      run: |
        # Update monitoring dashboards
        # Send notifications to stakeholders

    - name: Rollback on failure
      if: failure()
      run: |
        # Automatic rollback to previous version
        aws ecs update-service \
          --cluster discord-bot-cluster \
          --service discord-bot-production \
          --task-definition discord-bot-previous \
          --force-new-deployment

    - name: Notify stakeholders
      uses: 8398a7/action-slack@v3
      if: always()
      with:
        status: ${{ job.status }}
        text: "Production deployment ${{ job.status }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_PRODUCTION_WEBHOOK }}
```

## Release Management

Automated versioning and release processes.

### Semantic Versioning

```javascript
// scripts/version.js
const fs = require('fs')
const { execSync } = require('child_process')

class VersionManager {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  }

  getCurrentVersion() {
    return this.packageJson.version
  }

  bumpVersion(type) {
    const current = this.getCurrentVersion().split('.').map(Number)
    let [major, minor, patch] = current

    switch (type) {
      case 'major':
        major++
        minor = 0
        patch = 0
        break
      case 'minor':
        minor++
        patch = 0
        break
      case 'patch':
        patch++
        break
      default:
        throw new Error(`Invalid version type: ${type}`)
    }

    const newVersion = `${major}.${minor}.${patch}`
    this.updateVersion(newVersion)
    return newVersion
  }

  updateVersion(version) {
    this.packageJson.version = version
    fs.writeFileSync('package.json', JSON.stringify(this.packageJson, null, 2) + '\n')

    // Update other version files
    this.updateLockfile()
    this.updateChangelog(version)
  }

  updateLockfile() {
    try {
      execSync('npm install', { stdio: 'inherit' })
    } catch (error) {
      console.error('Failed to update lockfile:', error)
    }
  }

  updateChangelog(version) {
    const changelogPath = 'CHANGELOG.md'
    const date = new Date().toISOString().split('T')[0]

    let changelog = ''
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8')
    }

    const newEntry = `## [${version}] - ${date}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n`
    changelog = newEntry + changelog

    fs.writeFileSync(changelogPath, changelog)
  }

  createGitTag(version, message = '') {
    const tagMessage = message || `Release version ${version}`
    execSync(`git add .`, { stdio: 'inherit' })
    execSync(`git commit -m "chore: release ${version}"`, { stdio: 'inherit' })
    execSync(`git tag -a v${version} -m "${tagMessage}"`, { stdio: 'inherit' })
    execSync(`git push origin main --tags`, { stdio: 'inherit' })
  }

  createGitHubRelease(version, notes = '') {
    const { Octokit } = require('@octokit/rest')
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

    return octokit.repos.createRelease({
      owner: process.env.GITHUB_REPOSITORY.split('/')[0],
      repo: process.env.GITHUB_REPOSITORY.split('/')[1],
      tag_name: `v${version}`,
      name: `Release v${version}`,
      body: notes || `Release version ${version}`,
      draft: false,
      prerelease: version.includes('beta') || version.includes('alpha')
    })
  }
}

// CLI usage
if (require.main === module) {
  const [,, type] = process.argv

  if (!type) {
    console.error('Usage: node scripts/version.js <major|minor|patch>')
    process.exit(1)
  }

  const versionManager = new VersionManager()
  const newVersion = versionManager.bumpVersion(type)

  console.log(`Version bumped to ${newVersion}`)
}
```

### Automated Release Workflow

```yaml
# .github/workflows/release.yml
name: Create Release

on:
  push:
    branches: [ main ]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        token: ${{ secrets.GITHUB_TOKEN }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test:ci

    - name: Determine release type
      id: release-type
      run: |
        # Analyze commits since last release to determine version bump
        LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
        COMMITS=$(git log --oneline ${LAST_TAG}..HEAD)

        if echo "$COMMITS" | grep -q "BREAKING CHANGE"; then
          echo "type=major" >> $GITHUB_OUTPUT
        elif echo "$COMMITS" | grep -q "feat:"; then
          echo "type=minor" >> $GITHUB_OUTPUT
        else
          echo "type=patch" >> $GITHUB_OUTPUT
        fi

    - name: Bump version
      run: node scripts/version.js ${{ steps.release-type.outputs.type }}

    - name: Build application
      run: npm run build

    - name: Generate changelog
      run: |
        # Generate changelog from commits
        echo "# Release Notes" > release-notes.md
        echo "" >> release-notes.md
        git log --pretty=format:"* %s (%h)" $(git describe --tags --abbrev=0)..HEAD >> release-notes.md

    - name: Create GitHub release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: v${{ steps.version.outputs.version }}
        release_name: Release v${{ steps.version.outputs.version }}
        body_path: release-notes.md
        draft: false
        prerelease: false

    - name: Publish to npm
      run: npm publish
      env:
        NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

    - name: Deploy to production
      uses: ./.github/workflows/deploy-production.yml
      with:
        tag: v${{ steps.version.outputs.version }}

    - name: Notify release
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "New release v${{ steps.version.outputs.version }} deployed to production"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_RELEASE_WEBHOOK }}
```

## Best Practices

### Implementation Guidelines

1. **Use matrix builds** to test across multiple Node.js versions and databases
2. **Implement comprehensive testing** including unit, integration, and E2E tests
3. **Use semantic versioning** for automated releases
4. **Implement blue-green deployments** for zero-downtime releases
5. **Set up automated rollbacks** for failed deployments
6. **Use feature flags** for gradual rollouts
7. **Monitor deployment metrics** and set up alerts
8. **Implement canary deployments** for high-risk changes
9. **Use infrastructure as code** for reproducible deployments
10. **Document deployment procedures** and maintain runbooks

### Production Considerations

```javascript
// Complete CI/CD management system
class ProductionCICDManager {
  constructor(config) {
    this.config = config

    // Core components
    this.testRunner = new TestRunner(config.tests)
    this.deployer = new Deployer(config.deployment)
    this.monitor = new DeploymentMonitor(config.monitoring)
    this.rollback = new RollbackManager(config.rollback)

    // State tracking
    this.currentDeployment = null
    this.deploymentHistory = []
  }

  async runFullPipeline(commitSha, environment = 'staging') {
    console.log(`Starting CI/CD pipeline for ${commitSha} in ${environment}`)

    try {
      // 1. Run comprehensive tests
      await this.runTests(commitSha)

      // 2. Build artifacts
      const artifacts = await this.buildArtifacts(commitSha)

      // 3. Run security scans
      await this.runSecurityScans(artifacts)

      // 4. Deploy to environment
      const deployment = await this.deployToEnvironment(artifacts, environment)

      // 5. Run post-deployment tests
      await this.runPostDeploymentTests(deployment)

      // 6. Monitor deployment
      await this.monitorDeployment(deployment)

      console.log(`Pipeline completed successfully for ${commitSha}`)
      return deployment

    } catch (error) {
      console.error('Pipeline failed:', error)

      // Attempt rollback if in production
      if (environment === 'production') {
        await this.rollbackDeployment(commitSha, error)
      }

      throw error
    }
  }

  async runTests(commitSha) {
    console.log('Running test suite...')

    const results = await this.testRunner.runAllTests()

    if (!results.passed) {
      throw new Error(`Tests failed: ${results.failures} failures out of ${results.total} tests`)
    }

    console.log(`Tests passed: ${results.passed}/${results.total}`)
    return results
  }

  async buildArtifacts(commitSha) {
    console.log('Building artifacts...')

    const artifacts = await this.deployer.buildArtifacts(commitSha)

    // Validate artifacts
    if (!artifacts.dockerImage || !artifacts.version) {
      throw new Error('Invalid build artifacts')
    }

    console.log(`Artifacts built: ${artifacts.dockerImage}`)
    return artifacts
  }

  async runSecurityScans(artifacts) {
    console.log('Running security scans...')

    const scanResults = await this.testRunner.runSecurityScans(artifacts)

    if (scanResults.vulnerabilities.critical > 0) {
      throw new Error(`Critical security vulnerabilities found: ${scanResults.vulnerabilities.critical}`)
    }

    console.log('Security scans passed')
    return scanResults
  }

  async deployToEnvironment(artifacts, environment) {
    console.log(`Deploying to ${environment}...`)

    const deployment = await this.deployer.deploy(artifacts, environment)
    this.currentDeployment = deployment
    this.deploymentHistory.push(deployment)

    console.log(`Deployment completed: ${deployment.id}`)
    return deployment
  }

  async runPostDeploymentTests(deployment) {
    console.log('Running post-deployment tests...')

    const testResults = await this.testRunner.runPostDeploymentTests(deployment)

    if (!testResults.smokeTestsPassed) {
      throw new Error('Smoke tests failed after deployment')
    }

    console.log('Post-deployment tests passed')
    return testResults
  }

  async monitorDeployment(deployment) {
    console.log('Monitoring deployment...')

    const monitoringResults = await this.monitor.monitorDeployment(deployment, 300000) // 5 minutes

    if (!monitoringResults.healthy) {
      throw new Error(`Deployment monitoring failed: ${monitoringResults.issues.join(', ')}`)
    }

    console.log('Deployment monitoring passed')
    return monitoringResults
  }

  async rollbackDeployment(commitSha, error) {
    console.log('Rolling back deployment...')

    if (!this.currentDeployment) {
      console.warn('No current deployment to rollback')
      return
    }

    try {
      await this.rollback.rollback(this.currentDeployment)
      console.log('Rollback completed successfully')
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
      throw new Error(`Deployment failed and rollback unsuccessful: ${error.message}`)
    }
  }

  getPipelineStats() {
    const recentDeployments = this.deploymentHistory.slice(-10)

    return {
      totalDeployments: this.deploymentHistory.length,
      successfulDeployments: recentDeployments.filter(d => d.status === 'success').length,
      failedDeployments: recentDeployments.filter(d => d.status === 'failed').length,
      averageDeploymentTime: this.calculateAverageDeploymentTime(recentDeployments),
      currentDeployment: this.currentDeployment
    }
  }

  calculateAverageDeploymentTime(deployments) {
    const completedDeployments = deployments.filter(d => d.completedAt)

    if (completedDeployments.length === 0) return 0

    const totalTime = completedDeployments.reduce((sum, d) => {
      return sum + (d.completedAt - d.startedAt)
    }, 0)

    return totalTime / completedDeployments.length
  }

  async gracefulShutdown() {
    console.log('CI/CD manager shutting down...')

    // Cancel any ongoing deployments
    if (this.currentDeployment && this.currentDeployment.status === 'in_progress') {
      await this.rollback.rollback(this.currentDeployment)
    }

    // Clean up resources
    await this.monitor.stopMonitoring()
    await this.deployer.cleanup()

    console.log('CI/CD manager shutdown complete')
  }
}
```

This comprehensive CI/CD setup provides automated testing, building, deployment, and monitoring for production Discord bot releases with rollback capabilities and comprehensive error handling.