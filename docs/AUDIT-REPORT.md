# Relatório de Auditoria Técnica — ShadowMix (andremontrezollo-ui/round1)

> **Branch auditada:** `main`  
> **Data:** 2026-03-19  
> **Escopo:** Segurança, Arquitetura, DevEx/CI, Frontend  
> **Nota:** Este documento é somente auditoria e recomendações; nenhum código foi criado ou modificado.

---

## 1. Resumo Executivo

O repositório `andremontrezollo-ui/round1` é o frontend e backend de um serviço de mixing de Bitcoin chamado **ShadowMix**, construído com React/TypeScript/Vite no frontend e uma arquitetura Clean Architecture em Node.js no backend, com Supabase Edge Functions como camada HTTP.

A auditoria identificou **2 achados CRÍTICOS**, **4 ALTO**, **8 MÉDIO** e **5 BAIXO**.

### Situação Geral

| Dimensão | Nota | Destaque |
|---|---|---|
| Segurança e configuração | ⚠️ Preocupante | `.env` versionado, CORS wildcard, cleanup sem auth |
| Arquitetura core/adapters | ⚠️ Divergente | Backend com 238 arquivos nunca é chamado em runtime |
| DevEx / CI | ❌ Crítico | Zero GitHub Actions, TypeScript strict desligado |
| Frontend | ✅ Adequado | Endereços mock/testnet expostos ao usuário |

### Risco Dominante

O risco mais imediato é a **ausência total de CI/CD** combinada com um arquivo `.env` versionado. Isso significa que qualquer commit pode introduzir regressões sem detecção automática, e credenciais reais estão expostas no histórico do repositório. O segundo risco estrutural é que o **backend (`backend/src`) com 238 arquivos TypeScript nunca é chamado em runtime** — todo o tráfego real passa exclusivamente pelas Supabase Edge Functions — tornando esse core um investimento arquitetural sem retorno operacional imediato.

---

## 2. Etapa 1 — Segurança e Configuração

### 2.1 Segredos versionados e `.gitignore`

#### Achado 1 — `.env` versionado com credenciais reais · CRÍTICO

**Evidência:**
```
# /home/runner/work/round1/round1/.env  (tracked by git ls-files)
VITE_SUPABASE_PROJECT_ID="cnzsyzibprecpaxmfyzb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenN5emlicHJlY3BheG1meXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDA5OTYsImV4cCI6MjA4ODA3Njk5Nn0..."
VITE_SUPABASE_URL="https://cnzsyzibprecpaxmfyzb.supabase.co"
```

```bash
$ git ls-files | grep '\.env'
.env
backend/.env.example
```

**Severidade:** CRÍTICO  
**Análise:** O arquivo `.env` está rastreado pelo Git e contém a anon key JWT real e o Project ID do Supabase (`cnzsyzibprecpaxmfyzb`). Embora a `anon key` seja concebida para uso público no cliente, comprometer o Project ID e expô-lo no histórico público facilita ataques de enumeração, abuse de quotas e, se combinado com políticas RLS permissivas, exploração de dados. A `service_role key` não está neste arquivo, mas a exposição do projeto abre superfície para outros vetores.

**Quick win:** Remover o rastreamento imediatamente:
```bash
git rm --cached .env
echo ".env\n.env.*\n!.env.example" >> .gitignore
git commit -m "chore: remove tracked .env and add gitignore rules"
# Purgar histórico: bfg --delete-files .env && git push --force-with-lease
```

---

#### Achado 2 — `.gitignore` não exclui arquivos `.env` · CRÍTICO

**Evidência:**
```gitignore
# /.gitignore — conteúdo completo
logs
*.log
npm-debug.log*
...
node_modules
dist
dist-ssr
*.local
...
```

Nenhuma linha `/.env`, `.env.*`, `.env.local` presente.

**Severidade:** CRÍTICO  
**Análise:** A ausência de regras de exclusão de `.env` é a causa raiz do Achado 1 e tornará qualquer nova credencial versionável por engano, especialmente por desenvolvedores novos no projeto.

**Quick win:** Adicionar ao `.gitignore`:
```gitignore
# Environment secrets — never commit
.env
.env.*
!.env.example
!.env.template
```

---

#### Achado 3 — README contradiz realidade de configuração · BAIXO

**Evidência:**
```markdown
# README.md (linha ~55)
### Environment Variables
This project does not require any environment variables for frontend operation.
All configuration is handled through `src/lib/constants.ts`.
```

O arquivo `.env` existe e é necessário para `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` usados em `src/lib/api.ts` e `src/integrations/supabase/client.ts`.

**Severidade:** BAIXO  
**Quick win:** Atualizar README para listar as variáveis necessárias e criar `.env.example`.

---

### 2.2 Supabase / RLS

#### Achado 4 — Política inicial permissiva em migration · MÉDIO

**Evidência:**
```sql
-- supabase/migrations/20260303055007_078bafdd...sql
CREATE POLICY "Anyone can create mix sessions"
  ON public.mix_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage contact tickets"
  ON public.contact_tickets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits FOR ALL USING (true) WITH CHECK (true);
```

A migration seguinte (`20260303055136`) corrigiu as políticas:
```sql
CREATE POLICY "No public access to contact tickets"
  ON public.contact_tickets FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "No public access to rate limits"
  ON public.rate_limits FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "No public insert to mix sessions"
  ON public.mix_sessions FOR INSERT WITH CHECK (false);
```

**Severidade:** MÉDIO  
**Análise:** As políticas finais estão corretas — `USING(false)` bloqueia todo acesso público e o `service_role` bypassa RLS por design Supabase. O risco existe na **janela de tempo entre a primeira e segunda migration** caso o ambiente tenha recebido tráfego nesse período. Como as migrations são sequenciais e datadas com 1m29s de diferença, o risco em produção é baixo. Porém, a política de SELECT em `mix_sessions` ainda permite qualquer leitura pública via anon:

```sql
-- Ainda ativa (sem DROP na migration 2):
CREATE POLICY "Anyone can read mix sessions"
  ON public.mix_sessions FOR SELECT USING (true);
```

Isso expõe todos os registros de sessões a qualquer cliente anon. Um atacante pode enumerar `deposit_address`, `client_fingerprint_hash` e `expires_at` de todas as sessões. 

**Quick win:** Adicionar migration para restringir SELECT:
```sql
DROP POLICY "Anyone can read mix sessions" ON public.mix_sessions;
CREATE POLICY "Service role read mix sessions"
  ON public.mix_sessions FOR SELECT TO service_role USING (true);
```

---

#### Achado 5 — `service_role_key` sem rotação documentada · MÉDIO

**Evidência:**
```typescript
// supabase/functions/mix-sessions/index.ts (linha 28)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
```

Todos os 4 Edge Functions ativos (`mix-sessions`, `mix-session-status`, `contact`, `cleanup`) usam `SUPABASE_SERVICE_ROLE_KEY`. A chave em si não está hardcoded — corretamente usa `Deno.env.get()` — mas não há nenhum documento de rotação, nenhum script de auditoria e nenhum alerta se a chave vazar.

**Severidade:** MÉDIO  
**Quick win:** Adicionar `SECURITY.md` com procedimento de rotação de chaves e frequência recomendada (a cada 90 dias ou em caso de suspeita de comprometimento).

---

### 2.3 CORS e validação de origem

#### Achado 6 — CORS wildcard em todos os Edge Functions · MÉDIO

**Evidência:**
```typescript
// supabase/functions/_shared/security-headers.ts
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",  // Qualquer origem
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, ...",
};
```

**Severidade:** MÉDIO  
**Análise:** O uso de `Access-Control-Allow-Origin: *` permite que qualquer site na internet chame as Edge Functions diretamente. Para uma API pública sem autenticação de usuário, isso pode ser aceitável, mas combinado com a anon key exposta, permite que qualquer página maliciosa abuse dos endpoints de criação de sessão (esgotando quotas ou poluindo dados). Além disso, não há `Access-Control-Allow-Methods` restritivo (deve ser apenas `POST, OPTIONS`) nem `Access-Control-Max-Age` para cache de preflight.

**Quick win:**
```typescript
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Max-Age": "3600",
};
```

---

### 2.4 Rate limiting / abuse protection

#### Achado 7 — Endpoint `cleanup` acessível sem autenticação · MÉDIO

**Evidência:**
```typescript
// supabase/functions/cleanup/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();
  // Sem verificação de token, sem rate limit, sem IP check
  const supabase = createClient(...SERVICE_ROLE...);
  // Executa operações de DELETE direto
```

**Severidade:** MÉDIO  
**Análise:** Qualquer `POST` para `/functions/v1/cleanup` pode ser chamado por um atacante externo, disparando operações de cleanup massivo repetidamente. Embora o cleanup em si não apague dados válidos (só expirados), o volume de chamadas pode elevar custos de banco e CPU do Supabase.

**Quick win:** Adicionar verificação de token secreto:
```typescript
const authHeader = req.headers.get("Authorization");
const expectedToken = Deno.env.get("CLEANUP_SECRET_TOKEN");
if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
  return errorResponse(401, "UNAUTHORIZED", "Unauthorized");
}
```

---

#### Achado 8 — Rate limiting não usa Redis (divergência com backend) · BAIXO

**Evidência:**
```typescript
// supabase/functions/_shared/rate-limiter.ts
const { count } = await supabase
  .from("rate_limits")
  .select("*", { count: "exact", head: true })
  .eq("ip_hash", ipHash)
  .eq("endpoint", config.endpoint)
  .gte("created_at", windowStart);
```

O backend (`backend/src/infra/rate-limit/redis-rate-limit-store.ts`) implementa rate limiting com Redis, mas o backend nunca é chamado. Os Edge Functions usam a tabela `rate_limits` do Supabase. Duas queries SQL por request (count + insert) adicionam latência e custo.

**Severidade:** BAIXO  
**Análise:** A implementação atual funciona, mas tem limitações: janela deslizante não é atômica, race conditions possíveis sob carga alta (dois requests simultâneos passando o limite). Para o volume atual (demo/MVP), aceitável. Para produção, considerar Upstash Redis.

---

### 2.5 Logs, headers e validação de input

**Achados Positivos:**

- ✅ **Logs sem PII:** `supabase/functions/_shared/structured-logger.ts` redige endereços Bitcoin, IPs e emails.
- ✅ **Security headers completos:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `HSTS: max-age=31536000`, CSP restritivo com `frame-ancestors 'none'`.
- ✅ **Validação multi-camada:** Frontend (Zod + `src/lib/validation.ts`) + Edge Function (manual com sanitize). Padrões Bitcoin validados com 4 regex distintos (Legacy, P2SH, Bech32, Bech32m).
- ✅ **Erros opacos:** Nenhuma stack trace ou detalhe interno exposto. Formato padronizado: `{ error: { code, message } }`.
- ✅ **Hash de IP:** SHA-256 de `X-Forwarded-For` — IP bruto nunca armazenado.

**Limitação:** O CSP em `index.html` permite `'unsafe-inline'` em `script-src`:
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
  content="...script-src 'self' 'unsafe-inline'...">
```
Isso enfraquece a proteção contra XSS. Vite injeta inline scripts durante desenvolvimento, mas em produção (`build`) é possível eliminar esse permissivo.

---

## 3. Etapa 2 — Arquitetura Core vs. Adapters

### 3.1 Identificação de ports/interfaces e contratos

O backend (`backend/src`) implementa uma arquitetura Clean Architecture completa. Os contratos estão bem definidos em `backend/src/shared/ports/`:

```typescript
// backend/src/shared/ports/Repository.ts
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

// backend/src/shared/ports/DistributedLock.ts
export interface DistributedLock {
  acquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}
```

Cada módulo define seus próprios ports em `application/ports/` (ex.: `ScheduledPaymentRepository`, `PaymentEventPublisher`), seguindo o padrão de inversão de dependência.

**Achado:** ✅ Ports e interfaces bem definidos.

---

### 3.2 Localização de use cases vs. domain

**Estrutura correta:**
```
backend/src/modules/{modulo}/
├── domain/           → Entidades, value objects, políticas, erros
├── application/
│   ├── use-cases/    → Orquestração (SchedulePaymentUseCase, etc.)
│   ├── dtos/         → Input/Output DTOs
│   └── ports/        → Interfaces abstratas
└── infra/            → Implementações concretas
```

**21 use cases identificados** distribuídos em 5 módulos:
- `address-generator` (2): generate-address, issue-address-token  
- `blockchain-monitor` (4): confirm-deposit, get-transaction-status, ingest-blockchain-event, reconcile-observed-transactions  
- `liquidity-pool` (5): allocate-liquidity, get-pool-health, rebalance-pool, register-deposit-credit, reserve-obligation  
- `log-minimizer` (4): classify-log-data, enforce-retention-policy, purge-expired-logs, redact-log-entry  
- `payment-scheduler` (5): cancel-scheduled-payment, get-due-payments, mark-payment-executed, reschedule-payment, schedule-payment  

**Achado:** ✅ Separação correta entre use cases e domain.

---

### 3.3 Regras de dependência e imports cruzados

**Verificação:**
- Domain não importa de `infra` ✅  
- Application não importa de `infra` (apenas interfaces/ports) ✅  
- Módulos não importam diretamente uns dos outros (apenas via `EventBus`) ✅  
- Cross-imports verificados: apenas para `shared/` (legítimo) ✅  

**Achado:** ✅ Regras de dependência respeitadas dentro do `backend/src`.

---

### 3.4 O problema central: backend/src nunca é chamado em runtime · ALTO

**Evidência:**

```typescript
// src/lib/api.ts — todo o frontend chama Edge Functions diretamente
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
async function callFunction<T>(functionName: string, ...): Promise<ApiResponse<T>> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const res = await fetch(url, { ... });
}
// Não há nenhuma chamada para o backend Node.js
```

```json
// backend/package.json
{"dependencies": {"pg": "^8.7.1","ioredis": "^5.3.0","express": "^4.18.2",...}}
// Sem nenhum script definido (start, build, dev, test)
```

**Severidade:** ALTO  
**Análise:** O `backend/src` contém **238 arquivos TypeScript** organizados em 52 diretórios com arquitetura sofisticada (EventBus, Outbox, Saga, JobScheduler, Redis, PostgreSQL), mas:
1. **Não há nenhum script de deploy ou execução** no `backend/package.json`
2. **Não há nenhuma referência ao backend no frontend**
3. **Não há CI/CD** que construa ou teste o backend
4. **As Edge Functions não importam nada do `backend/src`**

Portanto, toda a lógica de negócio real (criação de sessões, rate limiting, cleanup) está nas 4 Edge Functions (~200 linhas cada), e o `backend/src` é um framework arquitetural sem aplicação prática no estado atual do projeto.

**Consequência:** O investimento em `backend/src` não entrega valor operacional. PRs como `#28`, `#31`, `#32` tentam "consolidar arquitetura" mas não resolvem o problema fundamental: o backend não é chamado.

**Quick win:** Definir explicitamente qual é o papel do `backend/src`:
- **Opção A (remover):** Aceitar que o projeto é exclusivamente Supabase Edge Functions e remover ou arquivar `backend/src`
- **Opção B (conectar):** Deployar `backend/src` como serviço Node.js real (Railway, Fly.io) e redirecionar Edge Functions para chamá-lo
- **Opção C (migrar):** Mover os use cases críticos para dentro das Edge Functions/`_shared`

---

### 3.5 Side effects (event bus, jobs, cron, filas)

O `backend/src` tem infraestrutura completa para side effects:

```typescript
// backend/src/shared/events/InMemoryEventBus.ts (ResilientEventBus)
// - Retry com exponential backoff
// - Dead Letter Queue
// - Deduplicação via Inbox

// backend/src/infra/messaging/outbox-processor.ts
// - Outbox pattern para durable event publishing

// backend/src/infra/scheduler/job-scheduler.ts
// - Distributed lock via PostgreSQL
// - DLQ para jobs falhos
```

**Achado MÉDIO:** O `ResilientEventBus` é **in-memory**. Se o processo reiniciar, todos os eventos em fila são perdidos. O Outbox Processor corrige isso para eventos publicados, mas não está integrado à camada HTTP (Edge Functions). Na prática, como o backend não roda, nenhum desses componentes está ativo.

**Achado MÉDIO:** A migration 3 habilita `pg_cron` para cleanup:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
```
Mas não há nenhum `cron.schedule()` definido nas migrations. O cleanup depende de chamadas manuais ao endpoint, sem automação real.

---

### 3.6 Fonte única da verdade: backend/src vs. supabase/_shared

| Componente | backend/src | supabase/_shared | Duplicação? |
|---|---|---|---|
| Rate Limiting | `RedisRateLimitStore` (Redis) | `rate-limiter.ts` (Supabase table) | Não — implementações distintas, runtimes distintos |
| Security Headers | `SecurityHeaders.ts` (infra) | `security-headers.ts` | Sim — padrões similares, CSP idêntico |
| Logging | `StructuredLogger` + redaction policy | `structured-logger.ts` | Sim — mesma política de redação replicada |
| Error Responses | `shared/http/ErrorResponse.ts` | `error-response.ts` | Sim — mesma estrutura `{ code, message }` |

**Achado BAIXO:** Há duplicação conceitual entre `backend/src/infra/security/SecurityHeaders.ts` e `supabase/functions/_shared/security-headers.ts`. Como os runtimes são incompatíveis (Node.js vs. Deno), compartilhamento direto não é possível, mas os valores divergem levemente (ex.: HSTS `max-age` é `31536000` no _shared e `63072000` no backend). Isso pode criar inconsistência se um for atualizado sem o outro.

---

## 4. Etapa 3 — DevEx / CI

### 4.1 GitHub Actions

#### Achado 9 — Zero GitHub Actions/CI configurado · CRÍTICO

**Evidência:**
```bash
$ find /home/runner/work/round1/round1/.github -type f 2>/dev/null
# Retorno vazio — diretório .github não existe
```

**Severidade:** CRÍTICO  
**Análise:** O repositório tem **34 Pull Requests abertos**, muitos marcados como `[WIP]`, com múltiplos conflitantes em paralelo (ex.: PRs #22, #27, #28, #29, #31, #32 todos tentando consolidar a mesma arquitetura). Sem nenhum CI:
- Qualquer merge pode quebrar o build sem detecção
- TypeScript não é verificado em PRs
- Testes não rodam automaticamente
- Lint não bloqueia código com problemas
- Não há status checks obrigatórios para merge

**Quick win:** Criar `.github/workflows/ci.yml` mínimo:
```yaml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

---

### 4.2 Convenções e ferramentas

#### Achado 10 — TypeScript strict mode desligado · ALTO

**Evidência:**
```json
// tsconfig.json (raiz)
{
  "compilerOptions": {
    "strict": false,           // ← desligado
    "noImplicitAny": false,    // ← permite any implícito
    "noUnusedLocals": false,   // ← não detecta variáveis mortas
    "noUnusedParameters": false,
    "strictNullChecks": false  // ← não detecta null/undefined
  }
}
```

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}
```

**Severidade:** ALTO  
**Análise:** Com `strictNullChecks: false`, erros de `null pointer` não são detectados em compile time. Com `noImplicitAny: false`, o código pode ter variáveis sem tipo sem alertas. O ESLint também desabilita `@typescript-eslint/no-unused-vars: off`. Isso mascara bugs em tempo de desenvolvimento.

**Quick win (gradual):**
1. Habilitar `"strictNullChecks": true` primeiro (menor impacto)
2. Habilitar `"noImplicitAny": true` e corrigir os erros resultantes
3. Habilitar `"strict": true` ao final

---

#### Achado 11 — Sem Prettier / sem import-order · MÉDIO

**Evidência:**
```bash
$ find /home/runner/work/round1/round1 -name ".prettierrc*" -o -name "prettier.config.*"
# Nenhum resultado
```

O `eslint.config.js` tem apenas 4 regras:
```javascript
export default tseslint.config({
  rules: {
    ...reactHooks.configs.recommended.rules,
    "react-refresh/only-export-components": ["warn", ...],
    "@typescript-eslint/no-unused-vars": "off",  // ← desabilitado!
  },
});
```

Sem regras de: `import/order`, `no-console`, `no-duplicate-imports`, boundary enforcement (`import/no-restricted-paths`).

**Severidade:** MÉDIO

---

#### Achado 12 — Dois lock files (npm + Bun) · MÉDIO

**Evidência:**
```bash
$ ls -la /home/runner/work/round1/round1/bun.lock* /home/runner/work/round1/round1/package-lock.json
-rw-rw-r-- 1 runner bun.lock          144 KB
-rwxrwxr-x 1 runner bun.lockb         245 KB (binário)
-rw-rw-r-- 1 runner package-lock.json 293 KB
```

**Severidade:** MÉDIO  
**Análise:** A presença de `bun.lock`, `bun.lockb` (Bun) e `package-lock.json` (npm) indica que o projeto foi instalado com ambos os gerenciadores. Isso pode causar divergência de versões entre desenvolvedores e ambientes de CI, além de confusão sobre qual lockfile é canônico. O README menciona "npm, yarn, ou bun" sem definir um padrão.

**Quick win:** Escolher um gerenciador (recomenda-se npm para compatibilidade máxima), deletar os arquivos do outro e documentar a escolha no README.

---

### 4.3 Testes

#### Achado 13 — Backend sem runner de testes e sem scripts · ALTO

**Evidência:**
```json
// backend/package.json
{"dependencies": {"pg":"^8.7.1","ioredis":"^5.3.0",...}}
// Sem scripts, sem devDependencies, sem jest/vitest/mocha
```

Os 8 test files no backend (`backend/src/modules/**/__tests__/*.test.ts`) referenciam apenas `vitest`, mas o `vitest.config.ts` da raiz **exclui o backend**:
```typescript
// vitest.config.ts (raiz)
test: {
  include: ["src/**/*.{test,spec}.{ts,tsx}"],  // Só "src/", não "backend/"
}
```

**Severidade:** ALTO  
**Análise:** Os testes em `backend/src/modules/` nunca rodam. `npm test` na raiz executa apenas os 4 testes em `src/test/`.

**Quick win:** Adicionar vitest ao `backend/package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

#### Cobertura de testes existente

| Arquivo | Tipo | Status |
|---|---|---|
| `src/test/mock-session.test.ts` | Unit (frontend) | ✅ Roda (vitest) |
| `src/test/fees-calculator.test.ts` | Unit (frontend) | ✅ Roda |
| `src/test/validation.test.ts` | Unit (frontend) | ✅ Roda |
| `supabase/functions/tests/index.test.ts` | Integration (Deno) | ⚠️ Requer Supabase real |
| `backend/src/modules/*/  __tests__/*.test.ts` (8 arquivos) | Unit (backend) | ❌ Nunca rodam |

Módulos sem nenhum teste: `address-generator`, `deposit-saga`, `log-minimizer` (parcial), infraestrutura (`outbox-processor`, `saga-orchestrator`, `job-scheduler`).

---

## 5. Etapa 4 — Frontend

### 5.1 Autenticação e sessão

**Achado:** O projeto não tem autenticação de usuário. O `supabase/client.ts` está configurado com `persistSession: true` e `autoRefreshToken: true`, mas como nenhuma página chama `supabase.auth.signIn()`, isso é inerte. Toda a interação é anônima via anon key.

```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,   // ← inerte sem login
    autoRefreshToken: true, // ← inerte sem login
  }
});
```

**Sem route guards** porque não há rotas protegidas — toda a aplicação é pública. Isso é adequado para o modelo de negócio atual.

---

### 5.2 Endereço de depósito é mock/testnet · ALTO

**Evidência:**
```typescript
// supabase/functions/mix-sessions/index.ts
function generateMockTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`; // ← "tb1q" é prefixo TESTNET
}
```

```typescript
// src/test/mock-session.test.ts
it("starts with tb1q", () => {
  expect(generateMockTestnetAddress()).toMatch(/^tb1q/);
});
```

**Severidade:** ALTO  
**Análise:** Os endereços gerados têm prefixo `tb1q` (Bitcoin **testnet**). Se um usuário real enviar Bitcoin mainnet para um endereço `tb1q`, **os fundos serão perdidos permanentemente**. Isso é um risco crítico de produto para qualquer deployment além de demo/desenvolvimento. A `DepositInfo.tsx` exibe esse endereço ao usuário como real.

**Quick win:** Exibir aviso explícito na UI:
```tsx
<Alert variant="warning">
  <AlertDescription>
    ⚠️ DEMO MODE — This is a testnet address. Do NOT send real Bitcoin.
  </AlertDescription>
</Alert>
```

---

### 5.3 Estado e cache

**React Query** está configurado corretamente:
```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,  // 1 minuto
      retry: 1,
    },
  },
});
```

`MixingPage.tsx` usa `useState` local para o fluxo de mixing. Não há Zustand ou Context API — adequado para a complexidade atual. Loading e error states são tratados no componente.

**Achado:** ✅ Gerenciamento de estado adequado para a complexidade atual.

---

### 5.4 Componentização e design system

O frontend usa **shadcn/ui** com Radix UI primitives (`components.json`). 47 componentes de UI em `src/components/ui/`. O design system está bem estruturado com tokens do Tailwind. Lazy loading implementado corretamente para todas as páginas não-críticas.

**Achado:** ✅ Componentização adequada.

---

### 5.5 Observabilidade · MÉDIO

**Evidência:**
```bash
$ grep -r "sentry" /home/runner/work/round1/round1/src --include="*.ts" --include="*.tsx" -i
# Nenhum resultado
$ grep -r "@sentry" /home/runner/work/round1/round1/package.json
# Nenhum resultado
```

**Severidade:** MÉDIO  
**Análise:** Nenhum rastreamento de erros em produção (Sentry, Datadog, LogRocket, etc.). Erros JavaScript no frontend são silenciosos. O `callFunction()` em `src/lib/api.ts` captura erros de rede mas não os reporta. Em produção, bugs de usuário serão invisíveis.

**Quick win:** Integrar Sentry gratuito:
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
```

---

### 5.6 CSP com `unsafe-inline` · MÉDIO

**Evidência:**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; ...">
```

**Severidade:** MÉDIO  
**Análise:** `script-src 'unsafe-inline'` enfraquece a proteção CSP contra XSS. O Vite injeta scripts inline durante `dev`, mas em `build` de produção isso pode ser evitado com nonces ou hashes. Como o React renderiza conteúdo de usuário escapado, o risco prático é baixo, mas o header contradiz a postura de segurança enunciada nos documentos.

---

## 6. Roadmap Priorizado

### P0 — Crítico (agir hoje)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| P0.1 | Remover `.env` do rastreamento git + purgar histórico | 30 min | Remove exposição permanente de credenciais |
| P0.2 | Adicionar `.env` e `.env.*` ao `.gitignore` | 5 min | Previne reincidência |
| P0.3 | Criar CI mínimo (lint + build + test em PR) | 2h | Fecha porta para regressões silenciosas |

### P1 — Alto (próxima sprint)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| P1.1 | Avisar usuário que endereços são testnet/mock | 1h | Previne perda de fundos reais |
| P1.2 | Decidir o papel do `backend/src` (remover, deployar ou migrar) | ADR | Remove ambiguidade arquitetural central |
| P1.3 | Habilitar TypeScript `strict: true` e corrigir erros | 4-8h | Detecta bugs antes de produção |
| P1.4 | Adicionar scripts ao `backend/package.json` | 30 min | Permite rodar/testar o backend |
| P1.5 | Fazer testes de backend rodarem (`vitest.config.ts` backend) | 1h | Ativa 8 test files mortos |

### P2 — Médio (próxima quinzena)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| P2.1 | Adicionar token de autenticação ao endpoint `cleanup` | 1h | Evita abuse de operações privilegiadas |
| P2.2 | Restringir RLS SELECT em `mix_sessions` | 30 min | Fecha enumeração de sessões |
| P2.3 | Restringir `CORS_HEADERS` para domínio específico | 1h | Reduz superfície de CSRF |
| P2.4 | Adicionar Sentry ou equivalente ao frontend | 2h | Visibilidade de erros em produção |
| P2.5 | Configurar `pg_cron` na migration para cleanup automático | 1h | Remove dependência de chamada manual |
| P2.6 | Padronizar package manager (npm ou Bun, não ambos) | 1h | Elimina inconsistência de lockfiles |
| P2.7 | Eliminar `unsafe-inline` do CSP em produção | 2h | Fortalece proteção XSS |

### P3 — Baixo (backlog)

| # | Item | Esforço |
|---|---|---|
| P3.1 | Adicionar Prettier + import-order ao ESLint | 2h |
| P3.2 | Documentar rotação de chaves Supabase | 1h |
| P3.3 | Corrigir README (variáveis de ambiente necessárias) | 30 min |
| P3.4 | Aumentar cobertura de testes (address-generator, deposit-saga) | 4h |
| P3.5 | Sincronizar valores de security headers entre `backend/src` e `_shared` | 1h |

---

## 7. Top 10 Ações Imediatas

> Em ordem de prioridade decrescente de risco/impacto.

| # | Ação | Comando / Arquivo | Severidade |
|---|---|---|---|
| 1 | **Remover `.env` do Git** | `git rm --cached .env && git commit` + BFG para histórico | CRÍTICO |
| 2 | **Adicionar `.env` ao `.gitignore`** | Adicionar `.env`, `.env.*`, `!.env.example` | CRÍTICO |
| 3 | **Criar CI GitHub Actions** | Criar `.github/workflows/ci.yml` com lint + build + test | CRÍTICO |
| 4 | **Avisar sobre endereços testnet na UI** | Banner em `DepositInfo.tsx` indicando modo DEMO | ALTO |
| 5 | **Definir destino do `backend/src`** | ADR: remover / deployar / migrar — fechar ambiguidade | ALTO |
| 6 | **Habilitar TypeScript strict** | `"strictNullChecks": true` → `"strict": true` em tsconfig.app.json | ALTO |
| 7 | **Autenticar endpoint `cleanup`** | Verificar `Authorization: Bearer CLEANUP_SECRET_TOKEN` | MÉDIO |
| 8 | **Restringir RLS SELECT em `mix_sessions`** | Migration SQL: `DROP POLICY "Anyone can read mix sessions"` | MÉDIO |
| 9 | **Ativar testes do backend** | Criar `backend/vitest.config.ts` e scripts no `backend/package.json` | ALTO |
| 10 | **Integrar Sentry no frontend** | `@sentry/react` + `VITE_SENTRY_DSN` em `.env.example` | MÉDIO |

---

*Auditoria realizada em 2026-03-19. Evidências baseadas no estado da branch `main` no momento da análise.*
