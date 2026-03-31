# Standalone build from feed-server/: cd feed-server && docker build -t devlens-feed .
FROM node:20
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY . ./

ENV PORT=2847
EXPOSE 2847

CMD ["node", "server-with-ai.js"]
