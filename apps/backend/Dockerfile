# Backend image for Cloud Run. Build context is the repo root:
#   docker build -f apps/backend/Dockerfile -t collections-backend .
# Verify with `pnpm image:verify`.

# deps: download every package in the lockfile. This layer only changes when the
# lockfile does, so source edits don't re-download dependencies.
FROM node:24.22.2-slim AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile

# build: install the backend and its workspace dependencies offline, compile, then
# copy the backend with production dependencies only into /out.
FROM deps AS build
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter backend...
# TODO(task 5): run `prisma generate` here, before the build, once the schema exists.
RUN pnpm --filter backend build
# pnpm 10+ refuses `deploy` unless inject-workspace-packages is on. The backend
# has no workspace dependencies, so --legacy gives the same result without
# changing how the whole workspace links packages.
RUN pnpm --filter backend deploy --prod --legacy /out

# runtime: compiled app and production node_modules only. Files stay owned by
# root, so the `node` user can read them but cannot change them.
FROM node:24.22.2-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
USER node
# Cloud Run sets PORT; the app reads it through its env schema.
CMD ["node", "dist/main.js"]
