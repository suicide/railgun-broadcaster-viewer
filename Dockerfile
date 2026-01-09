# Build stage
FROM docker.io/node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy configuration files
COPY package*.json tsconfig.json ./

# Install dependencies and build
RUN npm install
COPY src ./src
RUN npm run build

# Production stage
FROM docker.io/node:22-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create a user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Default command
CMD ["node", "dist/index.js"]
