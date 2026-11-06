FROM node:24-alpine

WORKDIR /usr/src/app

# Copy lockfiles first for optimal caching
COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY . .

CMD ["node", "index.js"]
