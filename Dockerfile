# -------- Base image ----------
FROM node:18-alpine

# -------- Working directory ----------
WORKDIR /app

# -------- Copy package files ----------
COPY package*.json ./
RUN npm install

# -------- Copy entire project ----------
COPY . .

# -------- Build frontend ----------
WORKDIR /app/client
RUN npm install
RUN npm run build

# -------- Run backend ----------
WORKDIR /app
EXPOSE 3000
CMD ["node", "server/index.js"]
