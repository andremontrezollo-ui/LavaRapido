# Arquitetura — Decisão Definitiva de Runtime do Backend

> Documento gerado em processo de revisão arquitetural (Senior Software Architect Review).
> Status: **DECISÃO TOMADA — OBRIGATÓRIA**

---

## 1. Diagnóstico do Estado Atual

### 1.1 Sinais de Arquitetura Duplicada

O repositório contém **dois runtimes concorrentes** operando como "backend":

| Camada | Localização | Runtime | Linguagem |
|---|---|---|---|
| Node.js / Express | `backend/src/` | Node.js (long-running process) | TypeScript (tsc) |
| Edge Functions | `supabase/functions/` | Deno (serverless, efêmero) | TypeScript (Deno) |

Ambos lidam com operações de negócio sem integração entre si:

- `supabase/functions/mix-sessions/index.ts` gera endereços Bitcoin via `crypto.getRandomValues` diretamente, ignorando completamente o `GenerateAddressUseCase` do módulo `address-generator`.
- `supabase/functions/contact/index.ts` valida e persiste tickets de contato diretamente no banco, sem passar por nenhum módulo de domínio.
- `backend/src/app/application.ts` expõe apenas `/health` e `/ready` via HTTP puro — **nenhuma rota de domínio está conectada ao layer HTTP**.

### 1.2 Inconsistências Críticas

| Problema | Evidência |
|---|---|
| `application.ts` importa `./dependency-container` e `./types` que **não existiam** | `application.ts` linha 3-4 |
| `application.ts` referencia `config.http.port` e `config.app.version` que **não existem** no `AppConfig` | `app-config.ts` não tem campo `http` |
| `GenerateAddressUseCase` importa `EventPublisher` de `shared/ports` que **não estava exportado** | `shared/ports/index.ts` |
| Edge Functions geram endereço mock (`tb1q` + chars aleatórios) em vez de usar o use case correto | `mix-sessions/index.ts` linha 8-13 |
| 238 arquivos TypeScript no backend, mas zero rotas HTTP expostas para domínio | `application.ts` — apenas `/health` e `/ready` |

### 1.3 Riscos da Ambiguidade

| Risco | Severidade | Descrição |
|---|---|---|
| **Segurança** | CRÍTICO | Edge Functions bypassing domain validation — endereços gerados sem política de expiração, namespace, ou política de geração |
| **Consistência** | ALTO | Dois sistemas de criação de sessão sem sync; um usa banco Supabase diretamente, outro usa repositórios in-memory |
| **Deploy** | ALTO | Ambiguidade sobre o que deployar — `npm run build`? `supabase functions deploy`? ambos? |
| **Manutenção** | ALTO | Bug fixes precisam ser aplicados em dois lugares com linguagens/runtimes diferentes |
| **Escalabilidade** | MÉDIO | Edge Functions não suportam: sagas, event bus, distributed locks, blockchain monitoring contínuo |
| **Observabilidade** | MÉDIO | Logs em dois sistemas sem correlação (Supabase logs vs SecureLogger do backend) |

---

## 2. Decisão Arquitetural — OBRIGATÓRIA

### ✅ DECISÃO: Express / Node.js como runtime principal

As Edge Functions Supabase são **rebaixadas a camada de dados** (migrations + schema apenas).

### Justificativa Técnica

O sistema é um **serviço financeiro de privacidade Bitcoin com eventos distribuídos**. Os requisitos funcionais tornam serverless Edge Functions fundamentalmente inadequadas:

| Requisito | Edge Functions (Deno) | Express / Node.js |
|---|---|---|
| Blockchain monitoring contínuo | ❌ Impossível (efêmero, sem state) | ✅ Long-running process |
| Saga orchestration (multi-step tx) | ❌ Sem estado entre requests | ✅ SagaOrchestrator com store |
| EventBus com retry/DLQ | ❌ Sem shared memory entre invocações | ✅ ResilientEventBus em memória |
| Distributed locks (race conditions) | ❌ Cada invocação é isolada | ✅ Shared lock store |
| Payment scheduler (delay + jitter) | ❌ Não pode esperar 1-24h | ✅ JobScheduler com timers |
| Log minimizer (purge agendada) | ❌ Apenas on-demand | ✅ Background process |
| Privacy-by-design (política de endereço) | ❌ Bypassa completamente | ✅ AddressExpirationPolicy, GenerationPolicy |
| Inbox/Outbox pattern (durabilidade) | ❌ Sem estado persistente entre calls | ✅ OutboxProcessor |

**Conclusão**: O sistema requer um processo persistente e stateful. Node.js/Express é o único runtime viável dado o design atual.

---

## 3. Arquitetura Alvo (Estado Futuro)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│                     src/ — SPA estática                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (REST)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND — Node.js / Express (Long-Running)         │
│                    backend/src/                                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Layer  (backend/src/api/)                            │  │
│  │  Router → Routes → Controllers                            │  │
│  │  Middlewares: Auth, RateLimit, CorrelationId, Logging     │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │ calls use cases                         │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  Domain Modules  (backend/src/modules/)                   │  │
│  │                                                           │  │
│  │  address-generator ──→ EventBus ──→ blockchain-monitor    │  │
│  │  liquidity-pool    ←── EventBus ←── deposit-saga          │  │
│  │  payment-scheduler ──→ EventBus ──→ log-minimizer         │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │ ports/adapters                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  Infrastructure  (backend/src/infra/)                     │  │
│  │  Repositories, Saga Store, Job Store, Outbox, Locks       │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │ SQL                                     │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE (Camada de Dados Apenas)                  │
│                                                                 │
│  PostgreSQL — schema gerenciado via supabase/migrations/        │
│  Tabelas: mix_sessions, contact_tickets, rate_limits, etc.      │
│                                                                 │
│  ❌ Edge Functions: DESATIVADAS (lógica movida para Express)     │
└─────────────────────────────────────────────────────────────────┘
```

### Papel de Cada Camada

| Camada | Responsabilidade | O que NÃO deve conter |
|---|---|---|
| **API Layer** (`api/`) | HTTP input/output: validação de request, routing, autenticação, rate limiting, serialização de response | Regra de negócio, acesso direto a banco |
| **Domain Modules** (`modules/`) | Entidades, Value Objects, Políticas, Casos de Uso, Eventos | I/O, HTTP, banco de dados, frameworks |
| **Infrastructure** (`infra/`) | Implementações concretas de repositórios, scheduler, outbox, locks | Regra de negócio, lógica de domínio |
| **Supabase/Postgres** | Persistência de dados via SQL migrations | Lógica de aplicação, Edge Functions ativas |

---

## 4. Plano de Migração Passo a Passo

### ETAPA 1 — Resolver Dependências Ausentes ✅ CONCLUÍDO

- [x] Criar `backend/src/shared/ports/EventPublisher.ts` — porta ausente que quebrava `GenerateAddressUseCase`
- [x] Criar `backend/src/app/types.ts` — interface `Application` ausente
- [x] Criar `backend/src/app/dependency-container.ts` — composition root ausente

### ETAPA 2 — Migrar HTTP Layer para Express ✅ CONCLUÍDO

- [x] Reescrever `backend/src/app/application.ts` para usar Express em vez de Node HTTP raw
- [x] Adicionar `port` e `host` ao `AppConfig` e ao schema de variáveis de ambiente
- [x] Criar `backend/src/api/router.ts` com todas as rotas do domínio
- [x] Criar `backend/src/api/routes/sessions.route.ts` — substitui `supabase/functions/mix-sessions` e `mix-session-status`
- [x] Criar `backend/src/api/routes/contact.route.ts` — substitui `supabase/functions/contact`

### ETAPA 3 — Deprecar Edge Functions ✅ CONCLUÍDO

- [x] Adicionar aviso de deprecação em `supabase/functions/mix-sessions/index.ts`
- [x] Adicionar aviso de deprecação em `supabase/functions/mix-session-status/index.ts`
- [x] Adicionar aviso de deprecação em `supabase/functions/contact/index.ts`

### ETAPA 4 — Conectar Repositórios Reais (Próximo Sprint)

- [ ] Implementar `PostgresAddressRepository` que substitui `InMemoryAddressRepository`
- [ ] Implementar `PostgresTokenRepository`
- [ ] Criar migration SQL para tabela `addresses` e `tokens`
- [ ] Conectar `DependencyContainer` ao pool de conexão PostgreSQL

### ETAPA 5 — Ativar Módulos Restantes (Próximo Sprint)

- [ ] Wiring `blockchain-monitor` no `DependencyContainer` com `SimulatedBlockchainDataSource`
- [ ] Wiring `liquidity-pool` com handler para evento `DEPOSIT_CONFIRMED`
- [ ] Wiring `payment-scheduler` com handler para evento `LIQUIDITY_ALLOCATED`
- [ ] Wiring `log-minimizer` com handler para evento `PAYMENT_EXECUTED`
- [ ] Registrar `DepositProcessingSaga` no container

### ETAPA 6 — Remover Edge Functions Completamente

- [ ] Confirmar que todas as rotas estão funcionando via Express
- [ ] Excluir `supabase/functions/mix-sessions/`
- [ ] Excluir `supabase/functions/mix-session-status/`
- [ ] Excluir `supabase/functions/contact/`
- [ ] Excluir `supabase/functions/cleanup/` (ou mover lógica para um background job no backend)
- [ ] Remover dependência do `@supabase/supabase-js` das Edge Functions
- [ ] Manter apenas `supabase/migrations/` e `supabase/config.toml`

---

## 5. Regras Arquiteturais Obrigatórias

### 5.1 Isolamento de Módulos

```
✅ PERMITIDO:
  modules/address-generator/application/ importa de shared/ports
  modules/address-generator/domain/ importa de shared/events
  modules/address-generator/infra/ implementa ports de application/

❌ PROIBIDO:
  modules/address-generator/ importa de modules/liquidity-pool/
  modules/payment-scheduler/ chama diretamente use case de modules/blockchain-monitor/
  Qualquer módulo importa de outro módulo que não seja via EventBus
```

### 5.2 Comunicação Entre Módulos

```
✅ PERMITIDO:
  EventBus.publish(DEPOSIT_CONFIRMED)
  EventBus.subscribe('DEPOSIT_CONFIRMED', liquidityHandler)

❌ PROIBIDO:
  const liquidityUseCase = new AllocateLiquidityUseCase(...)
  await liquidityUseCase.execute() // dentro do módulo blockchain-monitor
```

### 5.3 Infraestrutura Livre de Regras de Negócio

```
✅ PERMITIDO:
  infra/repositories/address.repository.ts implementa AddressRepository port

❌ PROIBIDO:
  infra/repositories/address.repository.ts verifica AddressExpirationPolicy
  infra/database/connection.ts aplica validação de domínio
```

### 5.4 Domain Modules Sem I/O Direto

```
✅ PERMITIDO:
  domain/use-cases/ usa porta AddressRepository (interface)
  application/ recebe dependências via constructor injection

❌ PROIBIDO:
  domain/entities/ faz require('pg') ou fetch()
  application/use-cases/ importa de infra/ diretamente
```

### 5.5 API Layer Sem Lógica de Domínio

```
✅ PERMITIDO:
  api/routes/sessions.route.ts chama generateAddressUseCase.execute(request)
  api/middlewares/rate-limit.middleware.ts verifica contagem por IP

❌ PROIBIDO:
  api/routes/ instancia Address, AddressToken, BitcoinAddress diretamente
  api/controllers/ acessa repositório diretamente sem use case
```

### 5.6 Edge Functions (Durante Período de Transição)

```
❌ PROIBIDO:
  Adicionar nova lógica de negócio em supabase/functions/
  Criar nova Edge Function para funcionalidade já coberta pelo Express

✅ APENAS PERMITIDO ATÉ ETAPA 6:
  Edge Functions com aviso de deprecação como fallback temporário
```

---

## 6. Validação da Arquitetura Correta

### 6.1 Sinais de Sucesso

| Indicador | Como Verificar |
|---|---|
| Único ponto de entrada HTTP | `curl http://localhost:3000/api/v1/sessions` retorna `201` |
| Domain use cases sendo exercitados | Logs mostram `GenerateAddressUseCase.execute` na criação de sessão |
| EventBus emitindo eventos | Log mostra `ADDRESS_TOKEN_EMITTED` após criação de endereço |
| Policies sendo aplicadas | Criar mais de 20 sessões testnet retorna erro de política |
| Zero lógica de negócio em Edge Functions | `grep -r "generateMockTestnetAddress" supabase/` → sem resultado |
| TypeScript compila sem erros | `cd backend && tsc --noEmit` → 0 erros |

### 6.2 Sinais de Regressão

| Sinal | Problema |
|---|---|
| Edge Function sendo modificada com nova lógica | Retrocesso para arquitetura híbrida |
| Use case instanciado diretamente numa rota sem injeção | Violação de Clean Architecture |
| Módulo importando diretamente de outro módulo | Acoplamento proibido |
| Repositório contendo `if (address.isExpired())` | Regra de negócio em camada errada |
| `application.ts` com lógica de request/response inline | HTTP routing fora da API layer |

### 6.3 Checklist de Validação Pós-Migração

```
□ GET  /health                          → 200 { status: "ok" }
□ GET  /ready                           → 200 { status: "healthy" }
□ POST /api/v1/sessions (payload válido) → 201 com depositAddress tb1q...
□ POST /api/v1/sessions (payload inválido) → 400 com detalhes de erro
□ POST /api/v1/sessions/status { sessionId: "<id>" } → 200 com status
□ POST /api/v1/sessions/status { sessionId: "invalid" } → 400 VALIDATION_ERROR
□ POST /api/v1/contact (válido)          → 201 com ticketId
□ POST /api/v1/contact (sem subject)     → 400 VALIDATION_ERROR
□ tsc --noEmit → 0 erros
□ supabase/functions/* contêm apenas aviso de deprecação (sem nova lógica)
```

---

## 7. Referências

- `backend/src/modules/` — 5 módulos de domínio com Clean Architecture
- `backend/src/shared/events/InMemoryEventBus.ts` — ResilientEventBus com retry e DLQ
- `backend/src/infra/saga/saga-orchestrator.ts` — SagaOrchestrator para flows multi-step
- `backend/src/api/` — middlewares, validators, schemas, error handler
- `supabase/migrations/` — schema SQL — **manter como única responsabilidade do Supabase**
