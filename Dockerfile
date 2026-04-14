FROM node:20-alpine

# better-sqlite3 requires build tools for native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy lockfile first — layer cache means npm ci only re-runs when deps change
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source (changes frequently — separate layer from deps)
COPY . .

# data/ is on Render's persistent disk at /data — never baked into the image
ENV DATA_DIR=/data

EXPOSE 4001

CMD ["node", "web-server.js"]
