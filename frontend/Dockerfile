# Use Node.js LTS version
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Expose Next.js port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev"]
