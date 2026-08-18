FROM node:24-bookworm

ENV CI=true
WORKDIR /app

RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile || pnpm approve-builds --all

COPY . .
RUN pnpm approve-builds --all || true
RUN pnpm run build

EXPOSE 8788

CMD ["sh", "-c", "npx wrangler d1 execute cloudmeet --local --file=./schema.sql && npx wrangler pages dev .svelte-kit/cloudflare --ip 0.0.0.0 --port 8788"]
