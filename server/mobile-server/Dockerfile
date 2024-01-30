FROM node:20-alpine

WORKDIR /build
COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY tsconfig.json .
COPY src src
RUN npx tsc -b

################
FROM node:20-alpine

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci --omit=dev
COPY --from=0 /build/dist .
USER node
EXPOSE 8080

CMD ["node", "index.js"]
