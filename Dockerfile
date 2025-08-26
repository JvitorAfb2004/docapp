FROM node:20-alpine

WORKDIR /app

# Copia manifestos e instala (inclui devDependencies p/ Tailwind/PostCSS no build)
COPY package*.json ./
RUN npm install

# Copia o restante do projeto
COPY . .

# Build
RUN npm run build

# Runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
