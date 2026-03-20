# Welcome to ShadowMix

A privacy-focused Bitcoin mixing service built with React, TypeScript, and Tailwind CSS.

## Project Overview

ShadowMix is a web application that provides Bitcoin transaction privacy services through a mixing mechanism that breaks the link between input and output addresses.

---

## Architecture Overview

### Backend oficial de produção

> **O backend de produção são as Supabase Edge Functions (Deno) em `supabase/functions/`.**
>
> Nenhum outro diretório executa HTTP em produção.

| Camada | Diretório | Runtime | Papel |
|--------|-----------|---------|-------|
| **HTTP (produção)** | `supabase/functions/` | Deno (Edge Functions) | ✅ Runtime oficial — serve todos os endpoints |
| **Domínio / Blueprint** | `backend/src/` | — (não é executável) | 📚 Biblioteca de domínio e referência arquitetural |
| **Frontend** | `src/` | Vite + React | ✅ Interface do usuário |

### Entrypoints de produção

```
supabase/functions/
├── mix-sessions/        → POST /functions/v1/mix-sessions
├── mix-session-status/  → POST /functions/v1/mix-session-status
├── contact/             → POST /functions/v1/contact
├── health/              → GET|POST /functions/v1/health
├── cleanup/             → POST /functions/v1/cleanup
└── _shared/             → Utilitários compartilhados (headers, logs, rate limit)
```

### O que NÃO é runtime de produção

- `backend/` — diretório de domínio compartilhado e blueprint arquitetural (Clean Architecture / DDD). **Não é executado em produção.** Ver [`backend/README.md`](./backend/README.md) e [`docs/adr/0001-backend-runtime-source-of-truth.md`](./docs/adr/0001-backend-runtime-source-of-truth.md).

---

## Estrutura de Pastas

```
.
├── src/                  # Frontend (React + TypeScript + Vite)
│   ├── components/       # Componentes React
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilitários e configuração (incluindo api.ts → chama Edge Functions)
│   └── pages/            # Páginas
├── supabase/
│   ├── functions/        # ✅ Backend oficial — Deno Edge Functions
│   │   ├── _shared/      # Utilitários compartilhados entre funções
│   │   └── */index.ts    # Cada função é um endpoint
│   └── migrations/       # SQL migrations do banco Supabase
├── backend/              # 📚 Biblioteca de domínio / Blueprint arquitetural (NÃO é runtime)
│   ├── src/              # Módulos de domínio, use cases, infra abstractions
│   └── docs/             # Documentação arquitetural detalhada
└── docs/                 # Documentação do projeto
    ├── adr/              # Architecture Decision Records
    ├── api-contract.md   # Contrato de API (Edge Functions)
    └── architecture.md   # Diagrama de arquitetura
```

---

## Como rodar localmente

### Frontend

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Executar testes
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Edge Functions (backend)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase localmente (requer Docker)
supabase start

# Servir Edge Functions localmente
supabase functions serve

# Deploy de uma função
supabase functions deploy mix-sessions
```

### Variáveis de Ambiente

```bash
# .env (frontend)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

As Edge Functions lêem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente do ambiente Supabase.

---

## Como publicar (deploy)

1. **Frontend**: Via Lovable (Share → Publish) ou qualquer host estático (Vercel, Netlify, etc.)
2. **Edge Functions**: `supabase functions deploy <function-name>` ou via CI/CD conectado ao Supabase.

---

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Validation**: Zod
- **Backend Runtime**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)

---

## Security Considerations

### Input Validation

All user inputs are validated using Zod schemas:
- Bitcoin addresses are validated against standard patterns (Legacy, P2SH, Bech32, Bech32m)
- Contact form inputs are sanitized and length-limited
- All validation occurs both client-side and server-side (Edge Functions)

### Best Practices Implemented

- ✅ No hardcoded secrets in codebase
- ✅ Input sanitization and validation
- ✅ XSS prevention through React's built-in escaping
- ✅ Secure random ID generation using `crypto.getRandomValues()`
- ✅ Proper TypeScript types for type safety
- ✅ Component-level separation of concerns
- ✅ Rate limiting enforced in Edge Functions

---

## Contributing

When contributing to this project:

1. Follow the existing code style and conventions
2. Add proper TypeScript types
3. Validate all user inputs
4. Use semantic design tokens from the design system
5. Write meaningful commit messages
6. Test your changes before submitting

---

## License

This project is proprietary. All rights reserved.

