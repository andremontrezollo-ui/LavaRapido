# ARCHITECTURE AUDIT — ShadowMix

**Date:** 2026-03-21  
**Auditor:** Senior Software Architect  
**Scope:** Full repository — `src/`, `backend/`, `supabase/`, `docs/`, `public/`

---

## BLOCO 1 — RAIO-X DA ESTRUTURA

### Árvore Principal

```
roundtwo/
├── src/                        # Frontend React SPA
│   ├── components/             # UI components (layout/, home/, mixing/, ui/)
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/supabase/  # Auto-generated Supabase client + types
│   ├── lib/                    # api.ts, constants.ts, validation.ts, utils.ts, mock-session.ts
│   ├── pages/                  # Route-level components
│   └── test/                   # Vitest unit tests
├── backend/
│   ├── src/
│   │   ├── api/                # Domain library: controllers, middlewares, schemas, security
│   │   ├── infra/              # Domain library: persistence, saga, scheduler, observability
│   │   ├── modules/            # Domain modules (DDD bounded contexts)
│   │   │   ├── address-generator/
│   │   │   ├── blockchain-monitor/
│   │   │   ├── liquidity-pool/
│   │   │   ├── log-minimizer/
│   │   │   ├── payment-scheduler/
│   │   │   └── deposit-saga/
│   │   └── shared/             # Shared kernel: events, http, ports, policies, config, logging
│   └── docs/                   # Backend architecture docs
├── supabase/
│   ├── functions/              # Deno Edge Functions (SOLE HTTP RUNTIME)
│   │   ├── _shared/            # Shared Deno utilities
│   │   ├── mix-sessions/       # POST: create session
│   │   ├── mix-session-status/ # POST: query session status
│   │   ├── contact/            # POST: submit ticket
│   │   ├── health/             # GET/POST: health check
│   │   └── cleanup/            # POST: maintenance job
│   └── migrations/             # PostgreSQL schema migrations
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── architecture.md         # System architecture overview
│   ├── api-contract.md         # API contract specification
│   ├── SECURITY.md             # Security practices
│   └── backend/                # Backend design principles (PT-BR)
└── public/                     # Static assets
```

### Papel Esperado vs. Papel Real

| Pasta | Papel Esperado | Papel Real | Conflito? |
|-------|---------------|------------|-----------|
| `src/` | Frontend SPA | Frontend SPA ✓ | Nenhum |
| `src/integrations/supabase/` | Integração Supabase | Cliente criado, nunca usado (API calls via `src/lib/api.ts`) | Baixo — código morto |
| `src/lib/api.ts` | Cliente HTTP | Chama Edge Functions via fetch ✓ | Nenhum |
| `src/lib/mock-session.ts` | Mock de sessão para UI | Funções usadas em testes, address gerado localmente para fallback | Baixo |
| `backend/src/` | Biblioteca de domínio | Biblioteca de domínio ✓ (não é servidor HTTP) | Nenhum após remoção dos artefatos mortos |
| `backend/src/api/` | Camada de API (library) | Controladores, middlewares e schemas como TypeScript puro | Nenhum |
| `supabase/functions/` | Runtime HTTP | Runtime HTTP ✓ | Nenhum |
| `supabase/migrations/` | Esquema do banco | Esquema do banco ✓ | Nenhum |
| `docs/` | Documentação | Parcialmente atualizada — README tinha afirmação incorreta sobre env vars | Baixo (corrigido) |

---

## BLOCO 2 — PROBLEMAS ARQUITETURAIS ENCONTRADOS

---

### [P1] SERVIDOR HTTP NODE.JS MORTO EM `backend/src/app/application.ts`

- **Severidade:** Crítica
- **Local:** `backend/src/app/application.ts` (REMOVIDO ✅)
- **Evidência:** Importava `./types`, `./dependency-container`, `../shared/logging/secure-logger` — nenhum desses arquivos existia. Criava servidor HTTP via `createServer` do Node.js com rotas `/health` e `/ready`. O `backend/package.json` declarava `express`, `pg`, `typeorm`, `ioredis` como dependências — nenhuma usada.
- **Por que estava errado:** Código completamente não compilável (imports ausentes). Runtime Node.js é incompatível com o Supabase Edge Function (Deno). Servia apenas para confundir sobre qual era o backend real.
- **Impacto:** Confusão arquitetural severa. Qualquer desenvolvedor novo leria o código e assumiria erroneamente que havia um servidor Node.js separado para implantar.
- **Correção aplicada:** Arquivo e diretório `backend/src/app/` removidos integralmente.
- **Estrutura ideal:** ✅ Já implementada — `supabase/functions/` é o único runtime HTTP.

---

### [P2] ADAPTADOR DE BANCO DE DADOS QUEBRADO EM `backend/src/infra/database/connection.ts`

- **Severidade:** Crítica
- **Local:** `backend/src/infra/database/connection.ts` (REMOVIDO ✅)
- **Evidência:**
  ```typescript
  import { createConnection } from 'typeorm'; // typeorm não está no package.json
  import { User } from '../entities/User';    // entidade não existia
  // credenciais hardcoded:
  host: 'localhost', username: 'your_username', password: 'your_password'
  ```
- **Por que estava errado:** `typeorm` não está no `package.json` do backend. A entidade `User` não existia. Credenciais placeholder hardcoded. Incompatível com Supabase (PostgreSQL via service_role_key, não TypeORM).
- **Impacto:** Se alguém tentasse executar o backend como servidor Node.js, falharia imediatamente na conexão com o banco. Segurança: credenciais placeholder podem levar a confusão em ambientes não-prod.
- **Correção aplicada:** Arquivo e diretório `backend/src/infra/database/` removidos.
- **Estrutura ideal:** Acesso ao banco exclusivamente via Supabase client com `service_role_key` nas Edge Functions.

---

### [P3] STORE DE RATE LIMIT REDIS MORTO EM `backend/src/infra/rate-limit/redis-rate-limit-store.ts`

- **Severidade:** Alta
- **Local:** `backend/src/infra/rate-limit/redis-rate-limit-store.ts` (REMOVIDO ✅)
- **Evidência:**
  ```typescript
  import { RedisClient } from 'redis'; // redis não está no package.json; API de callback obsoleta
  // Usa API de callback (redis v3) — incompatível com ioredis e redis v4+
  ```
- **Por que estava errado:** Pacote `redis` não declarado. API de callback deprecada. Não exportado por `backend/src/infra/index.ts`. Nunca referenciado em nenhum arquivo do projeto. Rate limiting real está implementado no `supabase/functions/_shared/rate-limiter.ts` via tabela PostgreSQL.
- **Impacto:** Código morto que polui o codebase e sugere uma dependência Redis inexistente.
- **Correção aplicada:** Arquivo e diretório `backend/src/infra/rate-limit/` removidos.
- **Estrutura ideal:** Rate limiting centralizado em `supabase/functions/_shared/rate-limiter.ts`.

---

### [P4] VALIDADORES DUPLICADOS — TRÊS IMPLEMENTAÇÕES DA MESMA REGRA

- **Severidade:** Alta
- **Local:** (CORRIGIDO PARCIALMENTE ✅)
  - `backend/src/api/validators/index.ts` — REMOVIDO
  - `backend/src/api/schemas/validation.schemas.ts` — mantido (implementação canônica)
  - `supabase/functions/contact/index.ts` — inline (necessário para Deno)
  - `src/lib/validation.ts` — frontend (Zod, necessário para UX)
- **Evidência:** `validateContactPayload` em `validators/index.ts` replicava exatamente `validateContact` em `validation.schemas.ts` com diferentes nomes e interface ligeiramente diferente. Os limites (`subject: 3-100`, `message: 10-2000`, `replyContact: max 500`) apareciam em três arquivos distintos sem fonte única de verdade.
- **Por que estava errado:** Três implementações da mesma regra de negócio sem DRY. Mudança em um limite exige atualização em três locais — qualquer esquecimento introduz divergência silenciosa.
- **Impacto:** Risco de inconsistência de validação entre frontend, backend library e Edge Functions.
- **Correção aplicada:** `backend/src/api/validators/index.ts` removido. `backend/src/api/index.ts` atualizado para remover re-export do módulo legado.
- **Estrutura ideal:** `backend/src/api/schemas/validation.schemas.ts` é a fonte canônica das regras de validação para a biblioteca de domínio. Edge Functions implementam subset equivalente inline (Deno não pode importar TypeScript de pacotes npm arbitrários). Frontend usa Zod por necessidade de UX. Este é o mínimo aceitável de triplicação por restrição de runtime.

---

### [P5] README.MD COM AFIRMAÇÃO INCORRETA SOBRE VARIÁVEIS DE AMBIENTE

- **Severidade:** Média
- **Local:** `README.md` (CORRIGIDO ✅)
- **Evidência:**
  ```markdown
  # README (versão anterior):
  This project does not require any environment variables for frontend operation.
  ```
  Mas `src/lib/api.ts` usa:
  ```typescript
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  ```
  Sem essas variáveis, todas as chamadas à API falham silenciosamente (`${undefined}/functions/v1/...`).
- **Impacto:** Desenvolvedor novo não configura `.env`, todas as chamadas à API falham, comportamento difícil de depurar.
- **Correção aplicada:** README atualizado com tabela de variáveis de ambiente obrigatórias, instruções de configuração, e seção de deployment refletindo a stack real (Supabase CLI, não Lovable).

---

### [P6] CLIENTE SUPABASE JS CRIADO MAS NUNCA USADO

- **Severidade:** Baixa
- **Local:** `src/integrations/supabase/client.ts`
- **Evidência:**
  ```typescript
  // src/integrations/supabase/client.ts
  export const supabase = createClient<Database>(...);
  // Comentário: "Import the supabase client like this: import { supabase } from..."
  // Mas nenhum arquivo no projeto importa de @/integrations/supabase/client
  ```
  Todas as chamadas ao backend passam por `src/lib/api.ts` (fetch direto para Edge Functions).
- **Por que está errado:** Código morto. Cria uma superfície de API — alguém poderia começar a usar `supabase.from(...)` diretamente nos componentes, bypassando a camada de Edge Functions (rate limiting, auth, logging).
- **Impacto:** Risco de acoplamento futuro: um desenvolvedor pode assumir que deve usar o cliente JS e fazer queries diretas ao banco, contornando as regras de negócio nas Edge Functions.
- **Correção recomendada:** Ou remover o arquivo, ou adicionar comentário explícito alertando que chamadas diretas ao banco bypassam as Edge Functions e não devem ser usadas para operações de negócio.
- **Estrutura ideal:** `src/integrations/supabase/types.ts` é necessário (tipos gerados). `client.ts` só deve existir se for usado.

---

### [P7] `generateMockTestnetAddress()` DUPLICADA EM DOIS RUNTIMES

- **Severidade:** Baixa
- **Local:**
  - `src/lib/mock-session.ts` (browser runtime)
  - `supabase/functions/mix-sessions/index.ts` (Deno runtime)
- **Evidência:** Função idêntica em ambos os arquivos:
  ```typescript
  const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";
  function generateMockTestnetAddress(): string {
    const body = new Uint8Array(38);
    crypto.getRandomValues(body);
    const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
    return `tb1q${encoded.slice(0, 38)}`;
  }
  ```
- **Por que está errado:** Duplicação literal de lógica de geração de endereço. Se o formato mudar (e.g., endereço mainnet), precisa ser atualizado em dois lugares.
- **Impacto:** Baixo — dado que é código de demonstração/mock, não lógica de negócio real.
- **Correção recomendada:** A função em `src/lib/mock-session.ts` é para o fallback de UI (quando o backend não está disponível). A função em `mix-sessions/index.ts` é para o servidor. Documentar explicitamente que são mocks de demonstração e não podem ser compartilhados entre runtimes sem uma solução de pacote compartilhado. Mantida como está por restrição de runtime (Deno não importa de `src/`).

---

### [P8] MÓDULOS DE DOMÍNIO SEM IMPLEMENTAÇÃO REAL DE INFRAESTRUTURA

- **Severidade:** Média
- **Local:** `backend/src/modules/` (todos os módulos)
- **Evidência:**
  - Módulos `address-generator`, `blockchain-monitor`, `liquidity-pool`, `log-minimizer` têm estrutura `domain/` + `application/` + `infra/` mas a camada `infra/` usa apenas adaptadores in-memory.
  - `backend/docs/hardening-architecture.md` afirma: *"Current persistence is in-memory (suitable for edge function lifecycle)"*
  - As Edge Functions (`supabase/functions/`) não importam de `backend/src/modules/` — implementam lógica diretamente (mix session, contact ticket, health check, cleanup).
- **Por que está errado:** Há um gap entre a biblioteca de domínio sofisticada em `backend/src/` e o que as Edge Functions realmente executam. As Edge Functions são operacionais e funcionais, mas não usam os módulos de domínio.
- **Impacto:** A biblioteca de domínio existe como blueprint arquitetural (código de referência/futuro), não como código de produção ativo. Isso é aceitável se documentado, mas confuso se não for.
- **Correção recomendada:** Documentar explicitamente que `backend/src/modules/` representa a arquitetura alvo para quando o sistema precisar de funcionalidade real de mixing (blockchain monitoring, liquidity management). As Edge Functions atuais são o MVP funcional.

---

### [P9] `backend/src/api/` — CAMADA "FALSAMENTE EXECUTÁVEL"

- **Severidade:** Média
- **Local:** `backend/src/api/` (controllers, middlewares, schemas, security)
- **Evidência:** `backend/src/api/index.ts` exporta `HealthController`, `AuthMiddleware`, `RateLimitMiddleware`, etc. — mas esses componentes não são usados por nenhuma Edge Function. As Edge Functions implementam auth e rate limiting inline usando `_shared/`.
- **Por que está errado:** A camada `api/` da biblioteca de domínio promete uma API HTTP que não existe. Um desenvolvedor poderia tentar "conectar" esses middlewares a um servidor Express — mas não há servidor.
- **Impacto:** Confusão sobre onde implementar novos endpoints. Risco de dois sistemas de auth/rate-limit divergindo se Edge Functions evoluírem sem atualizar `backend/src/api/`.
- **Correção recomendada:** Manter `backend/src/api/schemas/validation.schemas.ts` (útil para testes de unidade). Documentar que `HealthController` e middlewares são abstrações portáveis para uso futuro, não infraestrutura ativa. Adicionar README na pasta `api/` explicando seu papel.

---

## BLOCO 3 — MATRIZ DE ACOPLAMENTO

| Módulo de Origem | Módulo Acoplado | Tipo de Dependência | Nível de Risco | Ação Recomendada |
|-----------------|-----------------|--------------------|--------------|--------------------|
| `src/pages/MixingPage.tsx` | `src/lib/api.ts` | Import direto, coupling intencional | Baixo | OK — camada de serviço correta |
| `src/pages/MixingPage.tsx` | `src/lib/mock-session.ts` | Import do tipo `MixSession` | Baixo | OK — tipo de UI |
| `src/pages/Contact.tsx` | `src/lib/api.ts` | Import direto | Baixo | OK |
| `src/lib/api.ts` | Supabase Edge Functions | HTTP (fetch), via env vars | Baixo | OK — boundary correto |
| `src/integrations/supabase/client.ts` | Supabase JS SDK | Dependency criada mas não usada | Baixo | Remover ou documentar |
| `supabase/functions/*/index.ts` | `supabase/functions/_shared/` | Import Deno relativo | Baixo | OK — utilitários compartilhados |
| `supabase/functions/*/index.ts` | `backend/src/` | Nenhum import real | N/A | Boundary correto |
| `backend/src/api/` | `backend/src/shared/` | Import de tipos/interfaces | Baixo | OK — dependência correta |
| `backend/src/modules/*/infra/` | `backend/src/shared/` | Import de portas e eventos | Baixo | OK — padrão arquitetural correto |
| `backend/src/infra/` | `backend/src/shared/` | Import de tipos | Baixo | OK |

---

## BLOCO 4 — DUPLICAÇÕES E SOBREPOSIÇÕES

### [D1] Validação de Contato — Triplicação de Regra

- **Tipo:** Duplicação de regra
- **Arquivos afetados:**
  - `src/lib/validation.ts` (Zod, frontend)
  - `backend/src/api/schemas/validation.schemas.ts` (TypeScript puro, library)
  - `supabase/functions/contact/index.ts` (inline, Deno)
  - ~~`backend/src/api/validators/index.ts`~~ (REMOVIDO ✅)
- **Risco:** Divergência silenciosa de limites de validação entre camadas
- **Como consolidar:** Impossível consolidar completamente por restrição de runtime (Deno vs Node vs Browser). Mitigação: manter `VALIDATION` constants idênticos e adicionar testes de contrato que verificam que os três aplicam as mesmas regras.

### [D2] `generateMockTestnetAddress()` — Duplicação Literal

- **Tipo:** Duplicação literal
- **Arquivos afetados:**
  - `src/lib/mock-session.ts`
  - `supabase/functions/mix-sessions/index.ts`
- **Risco:** Divergência de formato de endereço mock entre frontend e backend
- **Como consolidar:** Documentar como intencional (diferentes runtimes). Em longo prazo, extrair para pacote compartilhado ou protocolo de geração documentado.

### [D3] `sanitize()` / `sanitizeInput()` — Duplicação de Função

- **Tipo:** Duplicação literal
- **Arquivos afetados:**
  - `src/lib/validation.ts` (`sanitizeInput`)
  - `backend/src/api/schemas/validation.schemas.ts` (`sanitize` — privada)
  - `supabase/functions/contact/index.ts` (`sanitizeInput` — inline)
- **Risco:** Implementações ligeiramente diferentes podem produzir saídas divergentes
- **Como consolidar:** Verificar que as três implementações são funcionalmente idênticas (são). Manter como está por restrição de runtime, com comentário de referência cruzada.

### [D4] Security Headers — Duplicação de Configuração

- **Tipo:** Duplicação de responsabilidade
- **Arquivos afetados:**
  - `supabase/functions/_shared/security-headers.ts` (Deno, produção)
  - `backend/src/api/security/security-utils.ts` (`SECURITY_HEADERS` — library, não usada em produção)
  - `backend/src/infra/security/SecurityHeaders.ts` (library, não usada em produção)
- **Risco:** Evolução das políticas de segurança em um arquivo sem atualizar os outros
- **Como consolidar:** `supabase/functions/_shared/security-headers.ts` é a fonte de verdade para produção. Os outros dois são library code. Documentar isso explicitamente.

### [D5] Logger — Duas Implementações

- **Tipo:** Duplicação de abstração
- **Arquivos afetados:**
  - `supabase/functions/_shared/structured-logger.ts` (Deno, produção — funções livres)
  - `backend/src/shared/logging/logger.ts` (TypeScript — classe `SecureLogger`)
  - `backend/src/infra/observability/StructuredLogger.ts` (adapter de outro `StructuredLogger`)
- **Risco:** Políticas de redação divergentes entre produção e testes
- **Como consolidar:** `supabase/functions/_shared/structured-logger.ts` para produção. `backend/src/shared/logging/` para uso em testes e biblioteca de domínio. Verificar que as políticas de redação são equivalentes (são similares mas não idênticas — Edge Function redact BTC addresses + IPs + emails; `SecureLogger` redact BTC + IPs + JWTs + hex hashes).

---

## BLOCO 5 — VEREDITO ARQUITETURAL

### A arquitetura faz sentido?

**Sim, mas com ressalvas.** A arquitetura declarada (Clean Architecture + DDD + Supabase Edge Functions) é coerente e adequada para o domínio. A separação entre frontend React, Edge Functions Deno, e biblioteca de domínio TypeScript é uma escolha defensável.

### O projeto está coerente ou fragmentado?

**Parcialmente fragmentado.** O problema não é a arquitetura em si, mas a presença de artefatos mortos que criavam ambiguidade sobre qual backend era real. Com as remoções aplicadas, a coerência melhora substancialmente.

### Onde estão as maiores fragilidades?

1. **Gap entre domínio e runtime**: A biblioteca de domínio em `backend/src/` é sofisticada (sagas, outbox, inbox, distributed locks) mas as Edge Functions atuais não usam nada disso — implementam lógica simples inline. Isso sugere uma transição arquitetural incompleta ou planejada.

2. **Duplicação de validação**: Inevitável por restrição de runtime, mas não controlada — limites de validação podem divergir silenciosamente.

3. **Cliente Supabase JS não utilizado**: `src/integrations/supabase/client.ts` existe mas nunca é importado. Risco de uso indevido futuro (queries diretas ao banco bypassando Edge Functions).

### O que impede esse repositório de escalar com segurança?

1. **As Edge Functions atuais não usam a biblioteca de domínio** — adicionar lógica de negócio real (confirmação de depósito, pool de liquidez, agendamento de pagamentos) exigirá uma decisão sobre como as Edge Functions invocarão os módulos de domínio.

2. **Persistência in-memory** nos módulos de domínio — aceitável para Edge Functions (stateless), mas os módulos precisarão de implementações de repositório Supabase reais para funcionar em produção.

3. **Sem testes de contrato** entre frontend e Edge Functions — a divergência de schemas pode passar despercebida.

---

## BLOCO 6 — PLANO DE AÇÃO PRIORIZADO

### 1. ✅ Remover artefatos Node.js mortos e quebrados
- **Objetivo:** Eliminar confusão sobre qual é o backend real
- **Arquivos afetados:** `backend/src/app/`, `backend/src/infra/database/`, `backend/src/infra/rate-limit/`
- **Esforço:** Baixo
- **Risco de não corrigir:** Desenvolvedor novo tenta executar servidor Node.js que não existe; confusão sobre arquitetura
- **Ganho:** ✅ APLICADO

### 2. ✅ Remover validador legado duplicado
- **Objetivo:** Eliminar terceira cópia de regras de validação com interface inconsistente
- **Arquivos afetados:** `backend/src/api/validators/index.ts`, `backend/src/api/index.ts`
- **Esforço:** Baixo
- **Risco de não corrigir:** Três implementações de validação com interfaces divergentes
- **Ganho:** ✅ APLICADO

### 3. ✅ Corrigir README.md — env vars e deployment
- **Objetivo:** Documentação deve refletir a realidade do projeto
- **Arquivos afetados:** `README.md`
- **Esforço:** Baixo
- **Risco de não corrigir:** Desenvolvedores não configuram `.env`, todas as API calls falham silenciosamente
- **Ganho:** ✅ APLICADO

### 4. ✅ Criar ADR documentando a arquitetura de runtime
- **Objetivo:** Formalizar a decisão de Supabase Edge Functions como único HTTP runtime
- **Arquivos afetados:** `docs/adr/0001-backend-runtime-source-of-truth.md`
- **Esforço:** Baixo
- **Risco de não corrigir:** Ambiguidade arquitetural renasce em cada novo desenvolvedor
- **Ganho:** ✅ APLICADO

### 5. Documentar `src/integrations/supabase/client.ts` como não-utilizável para operações de negócio
- **Objetivo:** Prevenir uso indevido do cliente Supabase JS direto em componentes
- **Arquivos afetados:** `src/integrations/supabase/client.ts`
- **Esforço:** Baixo
- **Risco de não corrigir:** Desenvolvedor faz queries diretas ao banco, bypassando Edge Functions
- **Ganho:** Prevenção de acoplamento futuro

### 6. Adicionar testes de contrato para limites de validação
- **Objetivo:** Garantir que frontend (Zod) e Edge Functions (inline) aplicam as mesmas regras
- **Arquivos afetados:** `src/test/` + novos arquivos de teste de contrato
- **Esforço:** Médio
- **Risco de não corrigir:** Divergência silenciosa de validação entre camadas
- **Ganho:** Confiança na consistência de validação

### 7. Implementar repositórios Supabase para módulos de domínio
- **Objetivo:** Tornar a biblioteca de domínio realmente utilizável pelas Edge Functions
- **Arquivos afetados:** `backend/src/modules/*/infra/repositories/`
- **Esforço:** Alto
- **Risco de não corrigir:** Biblioteca de domínio permanece como blueprint não executável
- **Ganho:** Capacidade de usar a lógica de domínio sofisticada (sagas, agendamento) em produção

### 8. Integrar Edge Functions com módulos de domínio
- **Objetivo:** Fazer Edge Functions usarem os use-cases da biblioteca de domínio
- **Arquivos afetados:** `supabase/functions/*/index.ts`, `backend/src/modules/`
- **Esforço:** Alto
- **Risco de não corrigir:** Lógica de negócio duplicada entre Edge Functions inline e biblioteca de domínio
- **Ganho:** Arquitetura coerente entre blueprint e runtime

### 9. Adicionar README em `backend/src/api/` explicando papel da camada
- **Objetivo:** Clarificar que controllers e middlewares são abstrações portáveis, não infraestrutura ativa
- **Arquivos afetados:** `backend/src/api/README.md`
- **Esforço:** Baixo
- **Risco de não corrigir:** Confusão sobre o que `HealthController` e `AuthMiddleware` fazem na prática
- **Ganho:** Clareza para novos contribuidores

### 10. Remover ou documentar `src/integrations/supabase/client.ts`
- **Objetivo:** Eliminar dead code ou tornar seu papel claro
- **Arquivos afetados:** `src/integrations/supabase/client.ts`
- **Esforço:** Baixo
- **Risco de não corrigir:** Dead code confunde; risco de uso indevido
- **Ganho:** Codebase mais limpo

---

## TOP 10 CORREÇÕES ARQUITETURAIS MAIS URGENTES

| # | Problema | Severidade | Status |
|---|---------|-----------|--------|
| 1 | Servidor HTTP Node.js morto em `backend/src/app/` — imports inexistentes, não compilável | Crítica | ✅ Removido |
| 2 | Adaptador TypeORM/MySQL com credenciais hardcoded em `backend/src/infra/database/` | Crítica | ✅ Removido |
| 3 | Store Redis com API de callback obsoleta em `backend/src/infra/rate-limit/` | Alta | ✅ Removido |
| 4 | Validadores duplicados com interfaces divergentes em `backend/src/api/validators/` | Alta | ✅ Removido |
| 5 | README afirmando que não há variáveis de ambiente obrigatórias (falso) | Média | ✅ Corrigido |
| 6 | Ausência de ADR documentando que Edge Functions são o único runtime HTTP | Média | ✅ Criado |
| 7 | `src/integrations/supabase/client.ts` criado mas nunca usado — risco de acoplamento | Baixa | Pendente |
| 8 | `generateMockTestnetAddress()` duplicada entre browser e Deno — sem documentação da intenção | Baixa | Documentado |
| 9 | Biblioteca de domínio sofisticada não conectada às Edge Functions — gap executável | Média | Planejado |
| 10 | Ausência de testes de contrato entre limites de validação do frontend e Edge Functions | Média | Planejado |
