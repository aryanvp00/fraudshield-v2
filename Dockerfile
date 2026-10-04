FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY ml/requirements.txt ml/requirements.txt
RUN pip install --no-cache-dir -r ml/requirements.txt
COPY server/package*.json server/
RUN cd server && npm install --omit=dev
COPY ml ml
COPY server server
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
