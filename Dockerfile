FROM node:15

RUN apt-get update && apt-get install -y imagemagick

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build:ts
RUN npm run build:web

ENV NODE_ENV=production

EXPOSE 10010

CMD ["node", "index.js"]
