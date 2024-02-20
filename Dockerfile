FROM node:20-alpine as frontend

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
FROM node:20-alpine as server

WORKDIR /build/server/mobile-server
COPY server/mobile-server/package.json package.json
COPY server/mobile-server/package-lock.json package-lock.json
RUN npm ci

COPY server/mobile-server/tsconfig.json tsconfig.json
COPY server/mobile-server/src src
RUN npx tsc -b

################
FROM node:20-alpine
LABEL org.opencontainers.image.source https://github.com/no0dles/chan-da-liar
ARG CONFIG_ENV=default

WORKDIR /app
COPY server/mobile-server/package.json package.json
COPY server/mobile-server/package-lock.json package-lock.json
RUN npm ci --omit=dev

COPY server/mobile-server/config /app/config
RUN cp /app/config/${CONFIG_ENV}.json /app/config/default.json
COPY --from=server /build/server/mobile-server/dist /app
COPY --from=frontend /build/dist/mobile/browser /app/public

EXPOSE 8080

CMD ["node", "index.js"]
