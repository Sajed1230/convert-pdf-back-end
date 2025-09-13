# Use Node.js slim image
FROM node:22-slim

# Install LibreOffice for office-to-pdf
RUN apt-get update && apt-get install -y libreoffice && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "app.js"]
