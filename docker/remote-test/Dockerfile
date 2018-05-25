# specify the node base image with your desired version node:<version>
FROM node:alpine

COPY . /app
WORKDIR /app

ENV NODE_PATH=/usr/local/lib/node_modules
RUN apk add --no-cache bash git && cd /app && mkdir -p sources && npm i --global simple-git react-native-cli node-fetch

CMD ["node", "executor.js"]
