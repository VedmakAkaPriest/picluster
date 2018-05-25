# specify the node base image with your desired version node:<version>
FROM node:alpine

ENV PICLUSTER_CONFIG='/app/config.json'

COPY . /app
WORKDIR /app

RUN apk add --no-cache bash git && cd /app && yarn

CMD ["node", "index.js"]
