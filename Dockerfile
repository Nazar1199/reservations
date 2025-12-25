FROM node:22-alpine

WORKDIR /usr/src/app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Сборка приложения
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]