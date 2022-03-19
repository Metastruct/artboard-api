FROM node:15

WORKDIR /usr/src/app

copy package.json .
RUN npm install

COPY . .
RUN npm run build:ts
RUN npm run build:web

ENV NODE_ENV=production

EXPOSE 10010

CMD ["node", "index.js"]