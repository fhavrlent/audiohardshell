FROM node:lts-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY . .
RUN npm run build

USER root
RUN mkdir -p /app/logs \
    && chown node:node /app/logs \
    && chmod 750 /app/logs

VOLUME ["/app/logs"]

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]
