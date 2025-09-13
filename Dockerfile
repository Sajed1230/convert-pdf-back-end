# ================= Base image =================
FROM node:22-slim

# ================= Set working directory =================
WORKDIR /app

# ================= Install system dependencies =================
RUN apt-get update && \
    apt-get install -y \
    libreoffice \
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# ================= Copy package.json and package-lock.json =================
COPY package*.json ./

# ================= Install Node.js dependencies =================
RUN npm install

# ================= Copy backend code =================
COPY . .

# ================= Expose port =================
EXPOSE 3001

# ================= Start the app =================
CMD ["npm", "start"]
