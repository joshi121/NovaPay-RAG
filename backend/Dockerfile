# 1. Use the official lightweight Node.js 22 Alpine image as the base
FROM node:22-alpine

# 2. Set the working directory inside the container to /app
WORKDIR /app

# 3. Copy only package files first to leverage Docker's build cache
COPY package*.json ./

# 4. Install production dependencies inside the container
RUN npm install --production --legacy-peer-deps

# 5. Copy the rest of the application files
COPY . .

# 6. Expose the port your Express backend runs on
EXPOSE 3000

# 7. Define the startup command to launch your server
CMD ["node", "server.js"]