# ShadowMix Backend — Architectural Decision Record

## 1. Diagnóstico do Estado Atual

### 1.1 Sinais de Arquitetura Duplicada

O repositório apresentava três artefatos que criavam ambiguidade arquitetural severa:

| Artefato | Problema |
|----------|----------|
| `backend/src/app/application.ts` | Servidor HTTP Node.js concorrente (imports quebrados: `./types`, `./dependency-container`, `../shared/logging/secure-logger` — arquivos inexistentes) |
| `backend/src/infra/database/connection.ts` | Conexão TypeORM/MySQL — stack errado para um projeto Supabase/Postgres |
| `backend/src/infra/rate-limit/redis-rate-limit-store.ts` | Redis com callback-style API — incompatível com o ambiente Deno/Supabase |

### 1.2 Inconsistências Identificadas

- **Documentação** afirmava que Edge Functions importam lógica de `backend/src/` — mas o código real nunca fazia isso
- **`backend/src/api/`** continha middlewares (AuthMiddleware, RateLimitMiddleware, etc.) nunca chamados pelas Edge Functions
- **Edge Functions** implementavam utilitários próprios (`_shared/`) com lógica duplicada de rate limiting, logging e segurança
- **`application.ts`** só cobria `/health` e `/ready`, enquanto toda a API real vivia nas Edge Functions
- **`AppConfig`** no `backend/src/shared/config/app-config.ts` via `loadConfig()` suportava `Deno.env`, confirmando que o backend foi projetado para rodar em Deno — não em Node.js tradicional

### 1.3 Riscos da Ambiguidade

| Risco | Descrição |
|-------|-----------|
| **Deploy** | Dois runtimes diferentes (Node.js vs Deno/Supabase) com modelos de deploy incompatíveis |
| **Segurança** | Headers de segurança e validação duplicados — divergências silenciosas introduzem brechas |
| **Manutenção** | Correção de um bug exigiria atualização em dois lugares diferentes |
| **Escalabilidade** | Node.js stateful vs. Supabase Edge Functions stateless são incompatíveis operacionalmente |
| **Confiabilidade** | TypeORM/MySQL presente em projeto Supabase/Postgres causa erros runtime difíceis de rastrear |

---

## 2. Decisão Arquitetural

### DECISÃO: Supabase Edge Functions como único runtime HTTP

**Supabase Edge Functions (Deno) é o runtime oficial do backend HTTP.**

**`backend/src/` é a biblioteca de domínio pura — sem servidor, sem I/O direto.**

### 2.1 Justificativa Técnica

**Tipo de sistema (event-driven, financeiro, privacidade):**
- Edge Functions são stateless por design — ideal para operações financeiras onde isolamento por request é crítico
- Sem estado persistente entre requests elimina uma classe inteira de vazamentos de dados entre sessões de clientes distintos
- O modelo serverless força explicitação de todas as dependências externas (Supabase, KV, etc.)

**Controle de infraestrutura:**
- O sistema usa exclusivamente Supabase como camada de dados — Row-Level Security, pg_cron, migrations são gerenciadas via Supabase
- Não há justificativa para um servidor Node.js intermediário quando Supabase já fornece o plano de dados completo
- Edge Functions têm acesso direto ao `SUPABASE_SERVICE_ROLE_KEY` sem expor credenciais via rede interna

**Latência e previsibilidade:**
- Edge Functions rodam próximas ao banco Supabase — sem hop adicional de Node.js → Supabase
- Cold start de Edge Functions é aceitável dado o padrão de uso (sessões de mixing não são tempo-real)

**Complexidade operacional:**
- Elimina gerenciamento de servidor Node.js, processo daemon, health checks de liveness/readiness externos
- Deploy via `supabase functions deploy` é determinístico e versionado
- Zero infraestrutura para provisionar, escalar ou monitorar além do que Supabase já gerencia

**Segurança e isolamento:**
- Cada Edge Function executa em isolamento completo (V8 isolate)
- Sem compartilhamento de memória entre requests — impossível vazar estado entre sessões de mixing
- Security headers centralizados em `_shared/security-headers.ts` aplicados a todas as respostas
- Rate limiting baseado em IP hash (SHA-256) sem armazenar IPs brutos

---

## 3. Arquitetura Alvo

### 3.1 Diagrama

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Entry Layer                             │
│             Supabase Edge Functions (Deno runtime)             │
│                                                                 │
│  mix-sessions  mix-session-status  contact  health  cleanup    │
│         └─────────────┬──────────────────────┘                 │
│                        │                                        │
│              supabase/functions/_shared/                       │
│          security-headers  error-response  rate-limiter        │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │ (imports domínio puro via path explícito)
┌────────────────────────▼────────────────────────────────────────┐
│                   Domain / Application Library                  │
│                       backend/src/                              │
│                                                                 │
│  modules/                    shared/                           │
│    address-generator           events/ (EventBus, DomainEvent) │
│    blockchain-monitor          policies/ (base classes)        │
│    liquidity-pool              ports/ (Repository, Clock, etc) │
│    payment-scheduler           http/ (ApiResponse, HttpStatus) │
│    log-minimizer               logging/ (Logger, redaction)    │
│                                config/ (AppConfig, loadConfig) │
│  infra/                                                        │
│    persistence/ (in-memory stores)                             │
│    saga/ (SagaOrchestrator)                                    │
│    scheduler/ (SecureJobScheduler)                             │
│    observability/ (StructuredLogger)                           │
│    security/ (SecurityHeaders)                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     Data Layer                                  │
│                  Supabase / PostgreSQL                          │
│                                                                 │
│  mix_sessions  contact_tickets  rate_limits                    │
│  RLS policies  pg_cron cleanup  migrations                     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Papel de Cada Camada

| Camada | Localização | Responsabilidade |
|--------|-------------|------------------|
| **HTTP Entry** | `supabase/functions/` | Receber requests, validar, autenticar, retornar responses HTTP. Nenhuma lógica de negócio. |
| **Shared HTTP Utilities** | `supabase/functions/_shared/` | Security headers, error format, rate limiting, structured logging. Reutilizado por todas as Edge Functions. |
| **Application** | `backend/src/modules/*/application/` | Use cases orquestram domínio. Sem I/O direto — dependem de ports. |
| **Domain** | `backend/src/modules/*/domain/` | Entidades, value objects, políticas, eventos de domínio. Zero dependências externas. |
| **Shared Kernel** | `backend/src/shared/` | EventBus, DomainEvent, ports abstratos, tipos base. Compartilhado entre módulos sem criar acoplamento. |
| **Infra** | `backend/src/infra/` | Implementações concretas dos ports: in-memory stores, saga, scheduler, logger. |
| **Dados** | `supabase/migrations/`, `supabase/config.toml` | Schema SQL, RLS, pg_cron. Gerenciado exclusivamente via Supabase CLI. |

### 3.3 Como Edge Functions Usam o Domínio

Edge Functions importam business logic de `backend/src/` usando paths Deno-compatíveis:

```typescript
// Correto — import explícito, sem barrel files com require/commonjs
import { CreateMixSessionUseCase } from "../../backend/src/modules/mix-sessions/application/use-cases/create-mix-session.usecase.ts";
import { loadConfig } from "../../backend/src/shared/config/load-config.ts";
```

**O que NÃO deve acontecer:**
```typescript
// PROIBIDO — importar de um servidor Node.js intermediário
import { app } from "../../backend/src/app/server.ts";

// PROIBIDO — duplicar lógica que já existe em backend/src
const rateLimitLogic = (ip) => { /* cópia de InMemoryRateLimitStore */ };
```

---

## 4. Plano de Migração (Concluído)

### ETAPA 1 — Remoção de Artefatos Conflitantes ✅

**Removidos:**
- `backend/src/app/application.ts` — Servidor HTTP Node.js concorrente (código quebrado com 3 imports inexistentes)
- `backend/src/infra/database/connection.ts` — Conexão TypeORM/MySQL (stack errado)
- `backend/src/infra/rate-limit/redis-rate-limit-store.ts` — Redis callback-style (incompatível com Deno)

**Justificativa:** Estes arquivos nunca faziam parte do fluxo real de execução, criavam confusão arquitetural e o `application.ts` tinha imports quebrados apontando para arquivos inexistentes.

### ETAPA 2 — Consolidação da Documentação ✅

**Atualizado:**
- `backend/ARCHITECTURE.md` (este documento) — Decisão arquitetural definitiva
- `docs/architecture.md` — Arquitetura de sistema atualizada com decisão Supabase-only

### ETAPA 3 — Conectar Edge Functions ao Domínio (Próximo Passo)

**O que fazer:**
1. Identificar use cases em `backend/src/modules/` que correspondem a cada Edge Function
2. Para cada Edge Function, substituir lógica inline por chamada ao use case correspondente
3. Criar adapters Deno-compatíveis para os ports que precisam de implementação real (ex: `SupabaseSessionRepository` implementando `SessionRepository`)
4. Mover a lógica de `supabase/functions/_shared/rate-limiter.ts` para `backend/src/api/middlewares/rate-limit.middleware.ts` com adapter Supabase

**Exemplo — mix-sessions antes:**
```typescript
// Lógica inline na Edge Function
const { data, error } = await supabase
  .from("mix_sessions")
  .insert({ deposit_address: depositAddress, ... })
```

**Exemplo — mix-sessions depois:**
```typescript
// Chama use case do domínio
import { CreateMixSessionUseCase } from "../../../backend/src/modules/address-generator/application/use-cases/create-session.usecase.ts";
const uc = new CreateMixSessionUseCase(new SupabaseSessionRepository(supabase));
const result = await uc.execute({ clientFingerprintHash: ipHash, ttlMinutes: 30 });
```

### ETAPA 4 — Validação de Testes

**Critérios de sucesso:**
- Todos os testes unitários de domínio (`backend/src/modules/**/__tests__/`) passando
- Todos os testes de integração de Edge Functions (`supabase/functions/tests/`) passando
- Zero importações de `backend/src/app/` ou `backend/src/infra/database/` ou `backend/src/infra/rate-limit/`

---

## 5. Regras Arquiteturais Obrigatórias

### 5.1 Separação de Responsabilidades

| Regra | Descrição |
|-------|-----------|
| **R1** | Edge Functions são o **único** ponto de entrada HTTP. Nenhum servidor Node.js, Express, Fastify ou similar. |
| **R2** | Domain layer (`backend/src/modules/*/domain/`) tem **zero dependências externas** — nem Supabase, nem Deno APIs, nem Node.js APIs. |
| **R3** | Application layer (`backend/src/modules/*/application/`) depende apenas de domain + shared ports. Nunca de infra diretamente. |
| **R4** | Módulos nunca importam diretamente de outros módulos. Comunicação via EventBus exclusivamente. |
| **R5** | Edge Functions não contêm lógica de negócio. Apenas: parse request → call use case → serialize response. |

### 5.2 Dependências Proibidas

```
PROIBIDO:
  domain/ → infra/
  domain/ → supabase/functions/
  module-A/domain → module-B/domain  (acoplamento direto entre módulos)
  application/ → createClient() do Supabase
  Edge Function → lógica inline de negócio

PERMITIDO:
  Edge Function → application/use-cases/
  application/ → domain/
  infra/ → application/ (implementa ports)
  shared/ → (nada — é folha do grafo de dependências)
```

### 5.3 Dados e Persistência

| Regra | Descrição |
|-------|-----------|
| **D1** | Banco de dados é **Supabase/PostgreSQL exclusivamente**. Nenhuma conexão MySQL, SQLite, ou Redis direta. |
| **D2** | Todas as operações de banco passam por Edge Functions usando `SUPABASE_SERVICE_ROLE_KEY`. |
| **D3** | RLS (Row-Level Security) é habilitado em todas as tabelas com política `USING (false)` por padrão. |
| **D4** | Schema gerenciado exclusivamente via migrations em `supabase/migrations/`. Zero DDL ad-hoc. |

### 5.4 Segurança

| Regra | Descrição |
|-------|-----------|
| **S1** | Security headers centralizados em `supabase/functions/_shared/security-headers.ts`. Nenhuma Edge Function define seus próprios headers individualmente. |
| **S2** | Rate limiting baseado em IP hash (SHA-256). IPs brutos nunca armazenados. |
| **S3** | Segredos (`SUPABASE_SERVICE_ROLE_KEY`, etc.) acessados via `Deno.env.get()`. Nunca em código, nunca em logs. |
| **S4** | Logs nunca contêm: endereços Bitcoin, IPs, e-mails ou qualquer dado que permita reidentificação. |

---

## 6. Validação da Arquitetura

### 6.1 Sinais de Sucesso

- [ ] `find backend/src/app -type f` retorna vazio (diretório não existe)
- [ ] `find backend/src/infra/database -type f` retorna vazio (diretório não existe)
- [ ] `find backend/src/infra/rate-limit -type f` retorna vazio (diretório não existe)
- [ ] `grep -r "createServer\|from 'express'\|from 'fastify'" backend/src` retorna vazio
- [ ] `grep -r "typeorm\|mysql\|ioredis" backend/src` retorna vazio
- [ ] Todos os testes de domínio passam: `cd backend && npx vitest run`
- [ ] Todos os testes de Edge Functions passam: `deno test supabase/functions/tests/`
- [ ] Nenhuma Edge Function tem mais de 100 linhas de lógica de negócio inline

### 6.2 Sinais de Regressão

- Aparecimento de novos arquivos em `backend/src/app/`
- Import de `mysql`, `typeorm`, `ioredis`, ou `redis` em qualquer arquivo de `backend/src/`
- Edge Function com mais de uma camada de abstração interna (lógica de negócio embutida)
- Módulo do domínio importando diretamente de outro módulo do domínio
- Log contendo endereço Bitcoin ou IP real
