# GoalFlow Backend - Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Set DATABASE_URL for Prisma client generation
# Use postgresql:// scheme which is required by Prisma
ENV DATABASE_URL="postgresql://goalflow:goalflow_secret@127.0.0.1:5432/goalflow"

# Generate Prisma client with explicit schema path
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
