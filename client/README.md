# SaaS Client - Interface Gráfica

Interface gráfica em Next.js para o SaaS, onde os clientes poderão fazer login e acompanhar as funcionalidades.

## 📋 Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (opcional)
- PostgreSQL 16 (compartilhado com a API)

## 🚀 Início Rápido

### Desenvolvimento Local

```bash
cd client

# Instalar dependências
npm install

# Criar .env local
cp .env.example .env.local

# Gerar Prisma Client
npx prisma generate

# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3001`

### Com Docker Compose

```bash
# Da raiz do projeto
npm run up
```

O cliente estará disponível em `http://localhost:3001`

## 📁 Estrutura do Projeto

```
client/
├── pages/               # Páginas Next.js
│   ├── _app.tsx        # App wrapper
│   └── index.tsx       # Página inicial
├── prisma/
│   └── schema.prisma   # Schema compartilhado com a API
├── package.json        # Dependências
├── tsconfig.json       # Configuração TypeScript
├── next.config.js      # Configuração Next.js
└── .env.example        # Variáveis de ambiente exemplo
```

## 🔧 Variáveis de Ambiente

```env
DATABASE_URL=postgresql://chatbot:chatbot@postgres:5432/chatbot?schema=public
NEXT_PUBLIC_API_URL=http://api:3000
```

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa linter

## 🗄️ Banco de Dados

O cliente usa o mesmo banco de dados PostgreSQL da API. O schema Prisma em `prisma/schema.prisma` deve ser mantido em sincronia com o da API em `../prisma/schema.prisma`.

### Sync com Migrations

Para sincronizar com mudanças no banco de dados da API:

```bash
npx prisma generate  # Regenerar Prisma Client
npx prisma db pull   # Sincronizar schema com banco (se necessário)
```

## 🔐 Autenticação

Atualmente há um placeholder de login. Para implementar autenticação real:

1. Criar modelo `User` no Prisma schema
2. Implementar API de autenticação na rota `/api/auth`
3. Integrar com a API principal (`http://api:3000`)

## 🎯 Próximos Passos

- [ ] Implementar autenticação com JWT
- [ ] Criar modelo de usuário no Prisma
- [ ] Implementar painel de controle (dashboard)
- [ ] Integração com a API principal
- [ ] Sistema de roles/permissões
- [ ] Interface de gerenciamento de dados

## 📖 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
