FROM node:20-alpine AS base

# Install build dependencies if needed
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose server port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
