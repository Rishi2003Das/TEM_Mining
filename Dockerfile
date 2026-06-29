# Use a lightweight Node base image
FROM node:18-slim

# Install Python 3 and pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Install pymongo and numpy globally inside the container
RUN pip3 install --break-system-packages pymongo numpy

WORKDIR /app

# Copy the backend dependencies first to leverage Docker cache
COPY TEM_interface/server/package*.json ./TEM_interface/server/
RUN cd TEM_interface/server && npm install

# Copy the entire workspace into the container (needed because server.js runs calculate_tem.py in the parent directory)
COPY . .

# Set the working directory to the server directory
WORKDIR /app/TEM_interface/server

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Start the Express server
CMD ["node", "server.js"]
