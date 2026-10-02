FROM node:20-alpine

WORKDIR /usr/src/app

# Copy lockfiles first for optimal caching
COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "index.js"]
