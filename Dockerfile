FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY . .

# Garante permissões da pasta de dados persistente
RUN mkdir -p data && chmod -R 755 data

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
