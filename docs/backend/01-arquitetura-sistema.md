# ShadowMix — Arquitetura de Sistema

## 1. Princípios Norteadores

### Separação de Responsabilidades
Cada camada possui um único propósito. Alterações em uma camada não propagam para outras.

### Fronteiras limpas entre camadas
- **Domínio** (`backend/src/modules/*/domain/`): entidades e erros — zero dependências externas.
- **Aplicação** (`backend/src/modules/*/application/`): casos de uso, ports (interfaces) e DTOs.
- **Infraestrutura** (`supabase/functions/_shared/adapters/`): implementações Supabase dos ports.
- **HTTP** (`supabase/functions/*`): adaptadores HTTP finos — apenas parse, rate-limit, chamada do use case e resposta.

### Privacidade por Arquitetura
- Minimização de dados: apenas o estritamente necessário é persistido.
- Logs com redação automática: endereços BTC, IPs, e-mails e JWTs são mascarados antes de emitir.
- IP nunca armazenado em texto claro — apenas hash SHA-256.

### Segurança por Design
- Service role key nunca vai ao frontend.
- Variáveis de ambiente nunca hardcoded no código.
- `.env` está no `.gitignore`.
- Inputs são validados e sanitizados nos use cases antes de qualquer persistência.

## 2. Estrutura de Módulos

| Módulo | Responsabilidade |
|--------|-----------------|
| `mix-session` | Criar sessão de mixing, consultar status, expirar sessões |
| `contact` | Validar e persistir tickets de suporte |
| `health` | Verificação de saúde da aplicação |
| `cleanup` | Expirar sessões vencidas e remover registros antigos de rate limit |

## 3. Fluxo de Requisição

```
Cliente HTTP
     │
     ▼  Edge Function (Deno)
 hash IP → check rate-limit → chamar use case
     │
     ▼  Use Case (TypeScript puro)
 validar → executar lógica de domínio → chamar port
     │
     ▼  Repository Adapter (Supabase)
 query Supabase PostgreSQL
     │
     ▼  resposta serializada → 2xx / 4xx / 5xx
```

## 4. Regras de Dependência

```
domain/  ──(não importa nada externo)
application/  ──► domain/, shared/
_shared/adapters/  ──► application/ports/, @supabase/supabase-js
Edge Functions  ──► application/use-cases, _shared/
Frontend  ──► src/lib/api.ts → HTTP → Edge Functions
```

**Proibido:**
- Use cases importarem `@supabase/supabase-js` diretamente.
- Edge Functions conterem lógica de negócio.
- Frontend importar código de `backend/src/` diretamente.
