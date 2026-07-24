# 1. Use the official lightweight Node.js 22 Alpine image
FROM node:22-alpine

# 2. Set the working directory inside the container to /app
WORKDIR /app

# 3. Copy package files first to cache dependencies
COPY package*.json ./

# 4. Install dependencies inside the container
RUN npm install --production

# 5. Copy the rest of the application files
COPY . .

# 6. Expose the port your Express AI server runs on
EXPOSE 5000

# 7. Start the server
CMD ["node", "server.js"]