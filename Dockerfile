FROM node:21

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 10010

CMD ["node", "index.js"]
