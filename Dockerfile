# Usa imagem oficial do Node
FROM node:20-alpine

# Cria diretório da aplicação
WORKDIR /

# Copia os arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do projeto
COPY . .

# Build da aplicação Next.js
RUN npm run build

# Define variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expõe a porta
EXPOSE 3000

# Start em produção
CMD ["npm", "start"]
