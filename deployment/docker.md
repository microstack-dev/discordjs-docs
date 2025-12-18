# Docker Deployment

Discord.js v14.25.1 Docker containerization for production bots. This section covers container setup, multi-stage builds, orchestration, and production Docker deployments.

## Docker Fundamentals

Creating efficient Docker containers for Discord bots.

### Multi-Stage Dockerfile

```dockerfile
# Multi-stage Dockerfile for production Discord bot

# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build application (if using TypeScript or build step)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discordbot -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=discordbot:nodejs /app/dist ./dist
COPY --from=builder --chown=discordbot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=discordbot:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R discordbot:nodejs /app/logs /app/data

# Switch to non-root user
USER discordbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Start application
CMD ["npm", "start"]
```

### Development Dockerfile

```dockerfile
# Development Dockerfile with hot reloading

FROM node:18-alpine

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/cache/apk/*

# Install Dockerize for container orchestration
ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discordbot -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Change ownership of working directory
RUN chown -R discordbot:nodejs /app

# Switch to app user
USER discordbot

# Install dependencies
RUN npm ci

# Copy source code
COPY --chown=discordbot:nodejs . .

# Expose ports
EXPOSE 3000 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["npm", "run", "dev"]
```

### Docker Compose Configuration

```yaml
# docker-compose.yml for production deployment

version: '3.8'

services:
  discord-bot:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: discord-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - discord-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.discord-bot.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.discord-bot.tls.certresolver=letsencrypt"
      - "traefik.http.services.discord-bot.loadbalancer.server.port=3000"

  postgres:
    image: postgres:14-alpine
    container_name: discord-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=discord_bot
      - POSTGRES_USER=discord
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - discord-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U discord -d discord_bot"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"  # Remove in production

  redis:
    image: redis:7-alpine
    container_name: discord-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - discord-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "6379:6379"  # Remove in production

  nginx:
    image: nginx:alpine
    container_name: discord-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    networks:
      - discord-network
    depends_on:
      - discord-bot
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus
    container_name: discord-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - discord-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    container_name: discord-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - discord-network
    ports:
      - "3000:3000"

  traefik:
    image: traefik:v2.9
    container_name: discord-traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_data:/letsencrypt
    networks:
      - discord-network

networks:
  discord-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  nginx_logs:
  traefik_data:
```

### Docker Ignore File

```dockerignore
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist
build

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github
.gitlab-ci.yml
.travis.yml

# Documentation
README.md
docs/
*.md

# Tests
test/
tests/
__tests__/
*.test.js
*.spec.js

# Temporary files
tmp/
temp/
```

## Container Orchestration

Managing multi-container deployments with Docker Compose and Kubernetes.

### Advanced Docker Compose

```yaml
# docker-compose.prod.yml - Production overrides

version: '3.8'

services:
  discord-bot:
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 10s
        max_failure_ratio: 0.3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    environment:
      - NODE_ENV=production
      - SHARD_COUNT=auto
      - LOG_LEVEL=warn
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  prometheus:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M

  grafana:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Kubernetes Deployment

```yaml
# Kubernetes manifests for Discord bot deployment

# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: discord-bot
  labels:
    name: discord-bot

---
# ConfigMap for application configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: discord-bot-config
  namespace: discord-bot
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  SHARD_COUNT: "auto"

---
# Secret for sensitive configuration
apiVersion: v1
kind: Secret
metadata:
  name: discord-bot-secrets
  namespace: discord-bot
type: Opaque
data:
  # Base64 encoded values
  DISCORD_TOKEN: <base64-encoded-token>
  DATABASE_URL: <base64-encoded-url>
  REDIS_URL: <base64-encoded-url>

---
# Persistent Volume Claim for data
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: discord-bot-data
  namespace: discord-bot
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard

---
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discord-bot
  namespace: discord-bot
  labels:
    app: discord-bot
spec:
  replicas: 2
  selector:
    matchLabels:
      app: discord-bot
  template:
    metadata:
      labels:
        app: discord-bot
    spec:
      containers:
      - name: discord-bot
        image: your-registry/discord-bot:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: discord-bot-config
              key: NODE_ENV
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: discord-bot-config
              key: LOG_LEVEL
        - name: DISCORD_TOKEN
          valueFrom:
            secretKeyRef:
              name: discord-bot-secrets
              key: DISCORD_TOKEN
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: discord-bot-secrets
              key: DATABASE_URL
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: discord-bot-data

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: discord-bot-service
  namespace: discord-bot
spec:
  selector:
    app: discord-bot
  ports:
  - name: http
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: discord-bot-ingress
  namespace: discord-bot
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: discord-bot-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: discord-bot-service
            port:
              number: 80

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: discord-bot-hpa
  namespace: discord-bot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: discord-bot
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# Pod Disruption Budget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: discord-bot-pdb
  namespace: discord-bot
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: discord-bot
```

### Docker Registry Setup

```bash
#!/bin/bash

# Docker Registry Setup Script

REGISTRY_URL="registry.yourdomain.com"
REGISTRY_USER="discord-bot"
REGISTRY_PASSWORD="your-registry-password"

# Login to registry
echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_URL" -u "$REGISTRY_USER" --password-stdin

# Build and tag images
docker build -t "$REGISTRY_URL/discord-bot:latest" .
docker build -t "$REGISTRY_URL/discord-bot:$(git rev-parse --short HEAD)" .

# Push images
docker push "$REGISTRY_URL/discord-bot:latest"
docker push "$REGISTRY_URL/discord-bot:$(git rev-parse --short HEAD)"

# Clean up local images (optional)
docker image prune -f

echo "Images pushed to registry successfully"
```

## Container Security

Implementing security best practices for Docker containers.

### Security-Enhanced Dockerfile

```dockerfile
# Security-enhanced production Dockerfile

# Use specific base image with known vulnerabilities patched
FROM node:18-alpine3.17

# Add security labels
LABEL maintainer="your-team@yourdomain.com"
LABEL version="1.0.0"
LABEL description="Discord Bot Production Image"

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        ffmpeg \
        curl \
        ca-certificates \
        && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/*

# Create non-root user with specific UID/GID for consistency
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory with proper permissions
WORKDIR /app

# Copy package files first for better caching
COPY --chown=appuser:appgroup package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production && \
    npm audit --audit-level=moderate && \
    npm cache clean --force

# Copy application code with proper ownership
COPY --chown=appuser:appgroup dist/ ./dist/
COPY --chown=appuser:appgroup src/ ./src/

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R appuser:appgroup /app/logs /app/data && \
    chmod 755 /app/logs /app/data

# Switch to non-root user
USER appuser

# Environment variables for security
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps=false"

# Health check with security considerations
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f --max-time 10 http://localhost:3000/health || exit 1

# Expose only necessary port
EXPOSE 3000

# Read-only filesystem where possible
VOLUME ["/app/logs", "/app/data"]

# Drop capabilities and use seccomp
# Note: This requires Docker 1.40+ and specific configuration

# Start application with exec form
CMD ["node", "dist/index.js"]
```

### Security Scanning

```bash
#!/bin/bash

# Container Security Scanning Script

IMAGE_NAME="your-registry/discord-bot:latest"

# Function to check for vulnerabilities
scan_vulnerabilities() {
    echo "Scanning for vulnerabilities..."

    # Trivy scan
    if command -v trivy &> /dev/null; then
        echo "Running Trivy vulnerability scan..."
        trivy image --exit-code 1 --no-progress "$IMAGE_NAME"
    else
        echo "Trivy not found, skipping vulnerability scan"
    fi
}

# Function to check for secrets
scan_secrets() {
    echo "Scanning for secrets..."

    # TruffleHog scan
    if command -v trufflehog &> /dev/null; then
        echo "Running TruffleHog secret scan..."
        trufflehog --regex --entropy=False docker://"$IMAGE_NAME"
    else
        echo "TruffleHog not found, skipping secret scan"
    fi
}

# Function to check image configuration
check_configuration() {
    echo "Checking image configuration..."

    # Check if running as root
    root_user=$(docker run --rm "$IMAGE_NAME" whoami)
    if [[ "$root_user" == "root" ]]; then
        echo "WARNING: Container running as root user"
        exit 1
    fi

    # Check exposed ports
    exposed_ports=$(docker inspect "$IMAGE_NAME" | jq -r '.[].Config.ExposedPorts | keys[]')
    if [[ -z "$exposed_ports" ]]; then
        echo "WARNING: No ports exposed"
    fi

    # Check health check
    healthcheck=$(docker inspect "$IMAGE_NAME" | jq -r '.[].Config.Healthcheck')
    if [[ "$healthcheck" == "null" ]]; then
        echo "WARNING: No health check configured"
    fi
}

# Function to check dependencies
check_dependencies() {
    echo "Checking dependencies..."

    # Run npm audit
    docker run --rm -it "$IMAGE_NAME" npm audit --audit-level=high
}

# Function to benchmark performance
benchmark_performance() {
    echo "Running performance benchmark..."

    # Start container
    container_id=$(docker run -d --rm -p 3000:3000 "$IMAGE_NAME")

    # Wait for health check
    sleep 10

    # Run simple load test
    if command -v ab &> /dev/null; then
        ab -n 100 -c 10 http://localhost:3000/health
    fi

    # Stop container
    docker stop "$container_id"
}

# Function to generate report
generate_report() {
    echo "Generating security report..."

    cat > security_report.md << EOF
# Container Security Report

Generated: $(date)

## Image: $IMAGE_NAME

## Vulnerability Scan Results
$(trivy image --format json "$IMAGE_NAME" 2>/dev/null || echo "Trivy scan failed")

## Secret Scan Results
$(trufflehog --regex --entropy=False docker://"$IMAGE_NAME" 2>/dev/null || echo "TruffleHog scan failed")

## Configuration Check
- Running as root: $(docker run --rm "$IMAGE_NAME" whoami)
- Exposed ports: $(docker inspect "$IMAGE_NAME" | jq -r '.[].Config.ExposedPorts | keys[]' | tr '\n' ' ')
- Health check: $(docker inspect "$IMAGE_NAME" | jq -r '.[].Config.Healthcheck.Test | join(" ")' 2>/dev/null || echo "None")

## Recommendations
1. Ensure container does not run as root
2. Minimize exposed attack surface
3. Keep base images updated
4. Regularly scan for vulnerabilities
5. Use multi-stage builds to reduce image size
EOF

    echo "Security report generated: security_report.md"
}

# Main function
main() {
    echo "Starting container security scan for $IMAGE_NAME"

    # Pull latest image
    docker pull "$IMAGE_NAME"

    # Run scans
    scan_vulnerabilities
    scan_secrets
    check_configuration
    check_dependencies
    benchmark_performance

    # Generate report
    generate_report

    echo "Security scan completed"
}

# Run main function
main "$@"
```

## Best Practices

### Implementation Guidelines

1. **Use multi-stage Dockerfiles** to minimize production image size
2. **Run containers as non-root users** for security
3. **Implement proper health checks** for container orchestration
4. **Use Docker Compose** for local development and testing
5. **Configure resource limits** to prevent resource exhaustion
6. **Implement proper logging** with structured JSON output
7. **Use Docker secrets** for sensitive configuration
8. **Regularly scan images** for vulnerabilities
9. **Implement graceful shutdown** handling in containers
10. **Use container orchestration** for production deployments

### Production Considerations

```yaml
# Production docker-compose.yml with advanced features

version: '3.8'

services:
  discord-bot:
    build:
      context: .
      dockerfile: Dockerfile.prod
    image: your-registry/discord-bot:${TAG:-latest}
    container_name: discord-bot-${TAG:-latest}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DISCORD_TOKEN_FILE=/run/secrets/discord_token
      - DATABASE_URL_FILE=/run/secrets/database_url
      - REDIS_URL_FILE=/run/secrets/redis_url
    env_file:
      - .env.production
    secrets:
      - discord_token
      - database_url
      - redis_url
    volumes:
      - ./logs:/app/logs:rw
      - ./data:/app/data:rw
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    networks:
      - discord-network
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
        monitor: 60s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        labels: "app,environment"

secrets:
  discord_token:
    file: ./secrets/discord_token.txt
  database_url:
    file: ./secrets/database_url.txt
  redis_url:
    file: ./secrets/redis_url.txt

networks:
  discord-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

This comprehensive Docker deployment guide provides production-ready containerization, orchestration, security hardening, and operational practices for Discord bots.