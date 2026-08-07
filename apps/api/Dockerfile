FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json

RUN npm install

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /repo/apps/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl
WORKDIR /repo/apps/api
ENV NODE_ENV=production

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/package.json /repo/package.json
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist

# node_modules/@delivery/shared é um symlink de workspace pra packages/shared
# (código-fonte TS, que não existe/não roda nessa imagem) — troca por um
# pacote real apontando pro JS já compilado em dist/packages/shared.
RUN rm -f /repo/node_modules/@delivery/shared \
    && mkdir -p /repo/node_modules/@delivery/shared \
    && cp -r ./dist/packages/shared/src /repo/node_modules/@delivery/shared/src \
    && printf '{"name":"@delivery/shared","type":"module","main":"src/index.js"}' > /repo/node_modules/@delivery/shared/package.json

EXPOSE 3333
CMD ["node", "dist/apps/api/src/server.js"]
