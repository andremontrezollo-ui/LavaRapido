# Auditoria Arquitetural — ShadowMix

> **Data:** Março 2026  
> **Versão analisada:** branch `copilot/auditoria-arquitetural-web-full-stack`  
> **Escopo:** Full-stack — frontend (React/Vite), backend (Deno Edge Functions + domain library), infra (Supabase)

---

## 1. Resumo Executivo

**Maturidade arquitetural:** Razoável → tendendo a Boa após as correções aplicadas.

O projeto demonstra clareza de intenção: Clean Architecture com DDD no backend, separação entre camada de domínio e camada HTTP, e um frontend React organizado por contexto de feature. A base de módulos de domínio (`backend/src/modules/`) é bem estruturada e segue princípios sólidos de bounded contexts, eventos de domínio e política objects.

O principal problema encontrado — e que reduzia a maturidade para **Razoável** — era a coexistência de uma camada HTTP Node.js morta (`backend/src/api/`, `backend/src/app/`) com a camada HTTP real (Supabase Edge Functions). Essa dualidade criava ambiguidade arquitetural severa: era impossível saber, olhando apenas para `backend/src/`, qual camada realmente rodava em produção.

Problemas secundários incluíam mistura de responsabilidades entre code de produção e utilitários de teste, e dependências Node.js (Express, ioredis, pg) declaradas num `package.json` cujo runtime real é Deno.

As correções aplicadas nesta iteração elevam a classificação para **Boa**, com pontos de melhoria contínua mapeados abaixo.

---

## 2. Pontos Fortes

| # | Ponto forte | Onde |
|---|-------------|------|
| 1 | **DDD bem aplicado** — 5 módulos com bounded contexts claros, domain/application/infra por módulo | `backend/src/modules/` |
| 2 | **Shared Kernel mínimo** — apenas abstrações verdadeiramente transversais (EventBus, ports, policies) | `backend/src/shared/` |
| 3 | **Eventos de domínio desacoplam módulos** — nenhum módulo importa diretamente de outro | `shared/events/EventBus.ts` |
| 4 | **Padrões de resiliência implementados** — Outbox, Inbox, Saga, Idempotency Guards | `backend/src/infra/` |
| 5 | **Frontend bem organizado por contexto** — `home/`, `mixing/`, `layout/` como feature folders | `src/components/` |
| 6 | **Camada de API unificada no frontend** — todas as chamadas passam por `src/lib/api.ts` | `src/lib/api.ts` |
| 7 | **Segurança nas Edge Functions** — headers, rate limiting, redaction de logs, constant-time comparison | `supabase/functions/_shared/` |
| 8 | **Política de privacidade na arquitetura** — log redaction, mínima coleta de dados | `backend/src/shared/logging/` |
| 9 | **Testes de domínio isolados** — use cases testados sem I/O real (in-memory repositories) | `backend/src/modules/*/__tests__/` |
| 10 | **Migrations versionadas** | `supabase/migrations/` |

---

## 3. Problemas Encontrados

### P-01: Camada HTTP Node.js morta coexistindo com Edge Functions

| Atributo | Valor |
|----------|-------|
| **Severidade** | Alta |
| **Onde ocorria** | `backend/src/api/`, `backend/src/app/application.ts` |
| **Status** | ✅ **Corrigido** nesta iteração |

**Por que era um problema:**  
`backend/src/api/` continha controllers, middlewares (auth, authorization, rate limit, correlation ID, request logging), schemas e security utils escritos para Node.js/Express. `backend/src/app/application.ts` criava um `http.createServer()` — nenhum desses arquivos era executado em lugar nenhum. A camada HTTP real é Supabase Edge Functions (Deno).

Isso gerava quatro consequências negativas:
1. Qualquer desenvolvedor novo leria `backend/src/index.ts` e assumiria que havia um servidor Node rodando.
2. A documentação referenciava `api/` como cross-cutting concern válido.
3. `backend/package.json` declarava `express`, `ioredis`, `pg`, `jsonwebtoken` — deps que nunca rodariam no runtime Deno.
4. A lógica de segurança em `api/middlewares/` estava duplicada com a de `supabase/functions/_shared/`, criando dois "centros de verdade".

**Impacto:** Confusão arquitetural, risco de manutenção na fonte errada, dep hell, onboarding prejudicado.

**Correção aplicada:**
- Removidos `backend/src/api/` e `backend/src/app/` integralmente.
- `backend/src/index.ts` atualizado para não mais exportar `api`.
- `backend/package.json` limpo: removidos `express`, `ioredis`, `pg`, `jsonwebtoken`, `dotenv`, `ts-node`, `uuid`.

---

### P-02: Utilitários de mock no diretório de produção `lib/`

| Atributo | Valor |
|----------|-------|
| **Severidade** | Média |
| **Onde ocorria** | `src/lib/mock-session.ts` |
| **Status** | ✅ **Corrigido** nesta iteração |

**Por que era um problema:**  
`src/lib/mock-session.ts` continha:
- A interface `MixSession` (tipo de domínio legítimo, usado em componentes de produção).
- Funções geradoras de dados falsos (`generateMockTestnetAddress`, `createMockSession`) — código de simulação, não de produção.

Misturar tipos de domínio com geradores de mock no mesmo arquivo de `lib/` violava a separação produção/teste e confundia o papel do arquivo.

**Impacto:** Desenvolvedores não sabiam se podiam usar `mock-session.ts` em produção; risco de dados mock escaparem para produção inadvertidamente.

**Correção aplicada:**
- Tipo `MixSession` extraído para `src/lib/session.types.ts` (código de produção limpo).
- Geradores mock movidos para `src/test/mock-session.ts` (escopo de teste).
- `src/lib/mock-session.ts` convertido em re-exportação com `@deprecated` para compatibilidade.
- Imports em `src/pages/MixingPage.tsx` e `src/components/mixing/DepositInfo.tsx` atualizados para `@/lib/session.types`.
- Import no teste atualizado para `@/test/mock-session`.

---

### P-03: Ausência de diretório `infra/` para configurações de deploy/CI

| Atributo | Valor |
|----------|-------|
| **Severidade** | Baixa |
| **Onde ocorre** | Raiz do repositório |
| **Status** | ⚠️ Pendente |

**Por que é um problema:**  
Não existe um diretório dedicado para artefatos de infraestrutura (Docker, CI/CD pipelines, scripts de ambiente, configurações de deploy). Esses artefatos existem de forma implícita ou dispersa (`.env`, `supabase/config.toml`), mas sem uma pasta `infra/` ou `.github/workflows/` explícita.

**Impacto:** À medida que o projeto crescer (múltiplos ambientes, pipelines, IaC), os arquivos de infraestrutura vão se dispersar pelo repositório.

**Recomendação:** Criar `infra/` com subpastas `docker/`, `scripts/`, `ci/` quando necessário.

---

### P-04: Dois lockfiles de pacotes comprometidos (`bun.lock` e `package-lock.json`)

| Atributo | Valor |
|----------|-------|
| **Severidade** | Baixa |
| **Onde ocorre** | Raiz: `bun.lock`, `bun.lockb`, `package-lock.json` |
| **Status** | ⚠️ Pendente |

**Por que é um problema:**  
O `README.md` documenta `npm install` como o comando canônico, mas dois lockfiles do Bun também estão commitados. Isso cria ambiguidade: qual gerenciador é o oficial? Em CIs diferentes, versões de deps podem divergir dependendo de qual lockfile é resolvido.

**Recomendação:** Escolher um gerenciador (npm ou bun), remover o lockfile do outro, documentar a escolha explicitamente.

---

### P-05: `backend/src/infra/` tem implementações Node.js/Redis que não rodam em Deno

| Atributo | Valor |
|----------|-------|
| **Severidade** | Média |
| **Onde ocorre** | `backend/src/infra/database/`, `backend/src/infra/rate-limit/`, `backend/src/infra/locks/` |
| **Status** | ⚠️ Documentado — requer decisão de produto |

**Por que é um problema:**  
`backend/src/infra/` contém implementações que dependem de `pg` (PostgreSQL driver Node.js), `ioredis` (Redis client Node.js) e outras APIs Node.js nativas. O runtime real das Edge Functions é Deno — essas implementações nunca podem ser importadas diretamente pelas Edge Functions.

Isso significa que toda a infraestrutura de persistência (`IdempotencyStore`, `InboxStore`, `OutboxStore`), locks distribuídos, e outbox processor são hoje **stubs em memória** no contexto Edge Functions.

**Impacto:** As garantias documentadas (idempotência persistida, saga compensation, outbox pattern) ainda não estão conectadas à persistência real.

**Recomendação:** Para cada adaptador de infraestrutura que precise ser usado pelas Edge Functions, criar versões compatíveis com Deno (usando `@supabase/supabase-js` como client de persistência, e Supabase advisory locks para distributed locking).

---

### P-06: `supabase/functions/mix-sessions/` duplica lógica de geração de endereço

| Atributo | Valor |
|----------|-------|
| **Severidade** | Baixa |
| **Onde ocorre** | `supabase/functions/mix-sessions/index.ts` (linha `generateMockTestnetAddress`) |
| **Status** | ⚠️ Pendente |

**Por que é um problema:**  
A função `generateMockTestnetAddress` está implementada inline na Edge Function `mix-sessions/index.ts`, sendo uma duplicata da mesma função em `src/test/mock-session.ts`. Quando a geração de endereços reais for implementada via `address-generator` module, haverá dois pontos para corrigir.

**Recomendação:** A Edge Function deve delegar a geração de endereços para o módulo `address-generator` do backend domain library, não implementar inline.

---

## 4. Recomendações Práticas

### 4.1 Estrutura ideal de pastas

```
shadowmix/
├── src/                          # Frontend (React + Vite)
│   ├── components/
│   │   ├── home/
│   │   ├── layout/
│   │   ├── mixing/
│   │   └── ui/                   # shadcn/ui primitives
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts                # HTTP client (Edge Functions)
│   │   ├── constants.ts
│   │   ├── session.types.ts      # ✅ Domain types
│   │   ├── utils.ts
│   │   └── validation.ts
│   ├── pages/
│   ├── integrations/supabase/    # Supabase client + generated types
│   └── test/                     # Test utilities and fixtures
│       ├── setup.ts
│       ├── mock-session.ts       # ✅ Mock generators (test-only)
│       ├── mock-session.test.ts
│       ├── fees-calculator.test.ts
│       └── validation.test.ts
│
├── backend/                      # Domain library (shared kernel + DDD modules)
│   ├── src/
│   │   ├── shared/               # Shared kernel
│   │   ├── infra/                # Infrastructure adapters
│   │   └── modules/              # Bounded contexts
│   │       ├── address-generator/
│   │       ├── blockchain-monitor/
│   │       ├── deposit-saga/
│   │       ├── liquidity-pool/
│   │       ├── log-minimizer/
│   │       └── payment-scheduler/
│   └── docs/
│
├── supabase/                     # Supabase project (HTTP runtime + database)
│   ├── functions/                # Edge Functions (Deno — interface layer)
│   │   ├── _shared/              # HTTP utilities (security headers, rate limiter, logger)
│   │   ├── mix-sessions/
│   │   ├── mix-session-status/
│   │   ├── contact/
│   │   ├── health/
│   │   └── cleanup/
│   ├── migrations/               # SQL migrations
│   └── config.toml
│
├── docs/                         # Project-level documentation
│   ├── architecture.md
│   ├── api-contract.md
│   ├── SECURITY.md
│   └── ARCHITECTURE_AUDIT.md    # ← Este documento
│
└── infra/                        # (Recomendado — criar quando necessário)
    ├── docker/
    ├── scripts/
    └── ci/
```

### 4.2 Módulos que devem ser desacoplados

| Módulo/arquivo | Situação atual | Ação recomendada |
|---------------|----------------|-----------------|
| `backend/src/infra/database/` | Usa `pg` (Node.js) — incompatível com Deno | Criar adaptador Deno usando `@supabase/supabase-js` |
| `backend/src/infra/rate-limit/` | Usa `ioredis` — incompatível com Deno | Migrar para Supabase KV ou tabela de rate limit |
| `backend/src/infra/locks/` | Locks em memória — não distribuídos | Migrar para Supabase advisory locks |
| `supabase/functions/mix-sessions/` | Gera endereço inline | Delegar para `address-generator` domain module |

### 4.3 O que vai em cada camada

| Artefato | Camada correta |
|---------|----------------|
| Regras de negócio (validação de endereços, políticas de expiração) | `backend/src/modules/*/domain/` |
| Orquestração de use cases | `backend/src/modules/*/application/use-cases/` |
| HTTP handlers, autenticação, rate limiting | `supabase/functions/` |
| Persistência e integrações externas (DB, blockchain) | `backend/src/modules/*/infra/` |
| Tipos compartilhados frontend/backend | `src/lib/session.types.ts` (ou um pacote `shared/types/`) |
| Utilitários de teste e mocks | `src/test/` |
| Configuração de deploy, Docker, CI | `infra/` |
| Documentação técnica | `docs/` |

---

## 5. Prioridade de Correção

| Prioridade | Problema | Impacto | Status |
|-----------|----------|---------|--------|
| 1 | P-01: Camada HTTP Node.js morta em `backend/src/api/` e `app/` | Alto — ambiguidade arquitetural crítica | ✅ Corrigido |
| 2 | P-02: Mock generators misturados com tipos de produção em `lib/` | Médio — confusão de responsabilidades | ✅ Corrigido |
| 3 | P-05: Infraestrutura Node.js em `backend/src/infra/` incompatível com Deno | Médio — stubs não conectam à persistência real | ⚠️ Mapeado |
| 4 | P-06: Lógica de endereço inline na Edge Function | Baixo — duplicação, divergência futura | ⚠️ Mapeado |
| 5 | P-04: Dois lockfiles concorrentes (`npm` + `bun`) | Baixo — ambiguidade de tooling | ⚠️ Mapeado |
| 6 | P-03: Ausência de `infra/` para configs de deploy | Baixo — sem impacto imediato | ⚠️ Futuro |

---

## 6. Plano de Refatoração Arquitetural

> Sequência segura para reorganizar o projeto sem quebrar funcionalidades em produção.

### Fase 1 — Limpeza da camada morta (✅ Concluída)

1. ✅ Remover `backend/src/api/` (controllers, middlewares, schemas, security — Node.js artifacts).
2. ✅ Remover `backend/src/app/application.ts` (Node.js http.createServer — nunca executado).
3. ✅ Atualizar `backend/src/index.ts`: remover export de `api`, manter `shared`, `infra`, `modules`.
4. ✅ Limpar `backend/package.json`: remover `express`, `ioredis`, `pg`, `jsonwebtoken`, `dotenv`, `uuid`, `ts-node`.
5. ✅ Atualizar `backend/README.md` e `backend/docs/hardening-architecture.md` para refletir a arquitetura real.

### Fase 2 — Separação de responsabilidades frontend (✅ Concluída)

6. ✅ Criar `src/lib/session.types.ts` com interface `MixSession` (tipo de domínio limpo).
7. ✅ Mover geradores mock para `src/test/mock-session.ts` (escopo de teste).
8. ✅ Converter `src/lib/mock-session.ts` em bridge com `@deprecated` para compatibilidade.
9. ✅ Atualizar imports de produção (`MixingPage.tsx`, `DepositInfo.tsx`) para `@/lib/session.types`.
10. ✅ Atualizar import do teste para `@/test/mock-session`.

### Fase 3 — Conectar domínio à persistência real (Próxima fase)

11. Para cada `InMemory*Repository` em `backend/src/modules/*/infra/repositories/`, criar uma versão Deno-compatible que usa `@supabase/supabase-js` como cliente.
12. Migrar `IdempotencyStore`, `InboxStore`, `OutboxStore` para tabelas Supabase (adicionar migrations correspondentes).
13. Substituir locks em memória por Supabase advisory locks (`pg_advisory_lock`).
14. Remover a função `generateMockTestnetAddress` inline de `supabase/functions/mix-sessions/index.ts` e substituir por importação do módulo `address-generator`.

### Fase 4 — Padronização de tooling (Baixa prioridade)

15. Escolher entre `npm` e `bun` como gerenciador oficial. Remover lockfile do outro. Documentar no `README.md`.
16. Criar `infra/` na raiz com estrutura inicial para scripts e CI quando pipeline for necessário.

### Fase 5 — Eliminação do bridge deprecado (Após migração completa)

17. Após confirmar que nenhum arquivo importa de `@/lib/mock-session` em produção, remover o arquivo bridge.
18. Manter `src/lib/mock-session.ts` somente se requerido pelo shadcn/ui ou outras ferramentas externas.
