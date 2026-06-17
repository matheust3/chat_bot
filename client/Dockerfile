FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY client/package.json client/package-lock.json* ./

# Instalar dependências
RUN npm install --no-audit --no-fund

# Copiar código-fonte do client
COPY client/prisma ./prisma
COPY client/pages ./pages
COPY client/next.config.js ./
COPY client/tsconfig.json ./
COPY client/.eslintrc.json ./

# Gerar Prisma Client
RUN ./node_modules/.bin/prisma generate

# Expor porta
EXPOSE 3001

# Iniciar aplicação em modo de desenvolvimento
CMD ["npm", "run", "dev"]
