# ---- Base image ----
FROM node:20-alpine

# ---- Set working directory ----
WORKDIR /app

# ---- Copy package files ----
COPY package*.json ./

# ---- Install dependencies ----
RUN npm install
