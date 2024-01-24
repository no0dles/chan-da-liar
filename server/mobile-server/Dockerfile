FROM node:18-alpine

WORKDIR /build
COPY package.json .
COPY package-lock.json .
RUN npm install --production

COPY index.js .

EXPOSE 8080

CMD ["node", "index.js"]
