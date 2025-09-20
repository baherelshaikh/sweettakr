FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --production  # Added --legacy-peer-deps for consistency
COPY . .
EXPOSE 5000
CMD ["npm", "start"]