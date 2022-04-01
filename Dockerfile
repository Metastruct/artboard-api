FROM node:15

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y graphicsmagick && apt install -y graphicsmagick-imagemagick-compat

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build:ts
RUN npm run build:web

ENV NODE_ENV=production

EXPOSE 10010

CMD ["node", "index.js"]
