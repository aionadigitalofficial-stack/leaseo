FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy full project
COPY . .

# Build project (Replit build)
RUN npm run build

# Expose app port
EXPOSE 3000

# Start production server
CMD ["node", "dist/index.cjs"]
