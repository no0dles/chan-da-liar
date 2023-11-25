FROM node:18-alpine

WORKDIR /build
COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY angular.json .
COPY tailwind.config.js .
COPY tsconfig.json .
COPY tsconfig.app.json .
COPY src src
RUN npm run build

################
FROM nginx

COPY --from=0 /build/dist/chan-da-liar /usr/share/nginx/html

EXPOSE 80
