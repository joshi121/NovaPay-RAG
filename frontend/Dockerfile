# === STAGE 1: Build the React Application ===
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# === STAGE 2: Serve the static files with Nginx ===
FROM nginx:alpine

# Copy the custom nginx configuration file to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled build files from Stage 1 into Nginx's default server root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose Port 80 (Standard port for web servers)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]