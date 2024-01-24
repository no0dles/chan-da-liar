FROM node:20-alpine

WORKDIR /build
COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY angular.json .
COPY tsconfig.json .
COPY projects/mobile/tailwind.config.js projects/mobile/tailwind.config.js
COPY projects/mobile/tsconfig.app.json projects/mobile/tsconfig.app.json
COPY projects/mobile/src projects/mobile/src
RUN npx ng build mobile -c production

################
FROM nginx

COPY --from=0 /build/dist/chan-da-liar /usr/share/nginx/html

EXPOSE 80
