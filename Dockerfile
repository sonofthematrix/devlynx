# Feed server image — single source: feed-server/ (same entry as `npm start` in feed-server).
# Build from repo root: docker build -t devlens-feed .
# Or: double-click docker-run.bat
FROM node:20
WORKDIR /app

COPY feed-server/package.json feed-server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY feed-server/ ./

# Match extension manifest host_permissions (localhost:2847) and docker-run.bat -p 2847:2847
ENV PORT=2847
EXPOSE 2847

CMD ["node", "server-with-ai.js"]
