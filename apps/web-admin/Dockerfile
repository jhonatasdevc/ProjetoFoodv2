FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web-admin/package.json apps/web-admin/package.json
RUN npm install

COPY packages/shared packages/shared
COPY apps/web-admin apps/web-admin

WORKDIR /repo/apps/web-admin
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /repo/apps/web-admin
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/web-admin/package.json ./package.json
COPY --from=build /repo/apps/web-admin/next.config.ts ./next.config.ts
COPY --from=build /repo/apps/web-admin/.next ./.next

EXPOSE 3003
CMD ["npm", "run", "start"]
