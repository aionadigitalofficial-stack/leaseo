# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Build the project (IMPORTANT)
RUN npm run build

# Expose the port your app runs on
EXPOSE 5000

# Start the app
CMD ["node", "dist/index.cjs"]
