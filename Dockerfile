FROM node:20-alpine

MAINTAINER United Nations of Earth

RUN apk update && \
    apk add --no-cache \
    alpine-sdk \
    glew-dev \
    libxi-dev \
    pkgconf \
    python3

WORKDIR /one

COPY package*.json ./

RUN npm install

COPY src ./src

RUN chown -R node /one && chmod -R 740 /one

USER node

ENV NODE_ENV=production

CMD ["node", "src/resistor.js"]
