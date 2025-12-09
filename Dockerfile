# Dockerfile
FROM node:22-alpine

WORKDIR /app

# Instala dependencias
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el código
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
