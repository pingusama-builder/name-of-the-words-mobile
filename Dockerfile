FROM node:22-slim

WORKDIR /app

# Copy all source files (including patches for pnpm)
COPY . .

# Install corepack and pnpm with proper PATH setup
RUN npm install -g corepack@latest && \
    corepack pnpm install && \
    corepack pnpm run build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
