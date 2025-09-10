# Базовый образ Node.js
FROM node:18

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --production

# Копируем весь проект
COPY . .

# Открываем порт (твой API слушает на 4000)
EXPOSE 3001

# Команда запуска
CMD ["node", "server.js"]
