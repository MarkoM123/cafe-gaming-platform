FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy only dependency files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prisma schema is needed for postinstall generate
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source AFTER install
COPY . .

# Build TypeScript
RUN pnpm build

EXPOSE 3001

# Runtime: migrate + start
CMD sh -c "pnpm prisma migrate deploy && node dist/main.js"
