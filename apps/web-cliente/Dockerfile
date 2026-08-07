FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web-cliente/package.json apps/web-cliente/package.json
RUN npm install

COPY packages/shared packages/shared
COPY apps/web-cliente apps/web-cliente

WORKDIR /repo/apps/web-cliente
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /repo/apps/web-cliente
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/web-cliente/package.json ./package.json
COPY --from=build /repo/apps/web-cliente/next.config.ts ./next.config.ts
COPY --from=build /repo/apps/web-cliente/.next ./.next

EXPOSE 3002
CMD ["npm", "run", "start"]
