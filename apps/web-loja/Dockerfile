FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web-loja/package.json apps/web-loja/package.json
RUN npm install

COPY packages/shared packages/shared
COPY apps/web-loja apps/web-loja

WORKDIR /repo/apps/web-loja
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_CLIENTE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_CLIENTE_URL=$NEXT_PUBLIC_WEB_CLIENTE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /repo/apps/web-loja
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/web-loja/package.json ./package.json
COPY --from=build /repo/apps/web-loja/next.config.ts ./next.config.ts
COPY --from=build /repo/apps/web-loja/.next ./.next
COPY --from=build /repo/apps/web-loja/public ./public

EXPOSE 3001
CMD ["npm", "run", "start"]
