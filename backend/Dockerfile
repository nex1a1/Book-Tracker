FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies สำหรับ better-sqlite3 (ต้องการ python และ build tool)
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm install

COPY src ./src
RUN mkdir -p data

EXPOSE 3001

CMD ["npm", "run", "dev"]