# ADR 0001 — Backend Runtime: Source of Truth

**Status:** Accepted  
**Date:** 2026-03-20  
**Deciders:** Architecture team

---

## Contexto

O repositório ShadowMix continha dois diretórios com aparência de "backend":

1. `backend/` — código TypeScript/Node.js estruturado em Clean Architecture + DDD, com módulos de domínio, use cases, infra abstractions, um `application.ts` com servidor HTTP Node.js e um `package.json` com dependências Node.js (Express, pg, ioredis, etc.)
2. `supabase/functions/` — Edge Functions Deno que efetivamente servem HTTP, conectam-se ao banco de dados Supabase e são chamadas pelo frontend via `src/lib/api.ts`

Essa coexistência criou ambiguidade crítica:
- `docs/api-contract.md` declarava que todos os endpoints são servidos por Edge Functions
- `backend/README.md` descrevia uma arquitetura própria sem deixar claro que não era o runtime de produção
- `backend/docs/hardening-architecture.md` usava linguagem de runtime ativo ("API Security", "Guarantees"), sem indicar que era uma referência conceitual

---

## Problema

**Qual backend realmente roda em produção?**

Sem uma declaração explícita, qualquer desenvolvedor novo poderia:
- Tentar executar `backend/` como servidor de produção (o que falha — Node.js, sem entrypoint de start)
- Ignorar `supabase/functions/` como se fosse apenas auxiliar
- Criar inconsistências ao estender a lógica no lugar errado

---

## Opções Consideradas

### Opção A — Supabase Edge Functions como runtime oficial

**Evidências a favor:**
- `src/lib/api.ts` chama exclusivamente `${SUPABASE_URL}/functions/v1/*`
- `supabase/functions/*/index.ts` usa `Deno.serve(...)` — são entrypoints Deno ativos
- `supabase/config.toml` e `supabase/migrations/` indicam integração real com Supabase
- `backend/package.json` lista Node.js dependencies (Express, pg, ioredis) — **nunca instaladas nem usadas em CI**
- `backend/src/app/application.ts` cria um servidor `http.createServer()` Node.js — **nunca iniciado em produção**
- Não há script de start, build ou deploy para `backend/` no `package.json` raiz
- `docs/api-contract.md` e `docs/architecture.md` já descrevem Edge Functions como runtime

**Evidências contra:** Nenhuma concreta — backend/ não tem entrypoint funcional de produção.

### Opção B — backend/ como runtime oficial

**Evidências a favor:** Nenhuma — sem scripts de deploy, sem integração ao CI, sem entrypoint funcional.

**Evidências contra:**
- Usa Node.js (incompatível com Supabase Edge runtime, que é Deno)
- Frontend nunca chama este backend diretamente
- Dependências não instaladas

---

## Decisão

**Opção A — Supabase Edge Functions (`supabase/functions/`) é o backend oficial de produção.**

`backend/src/` é declarado como **biblioteca de domínio e blueprint arquitetural** — não executável em produção.

---

## Consequências

### Para desenvolvimento

- Toda nova lógica de negócio HTTP deve ser adicionada em `supabase/functions/`
- `backend/src/` pode ser consultado como referência de design (DDD, Clean Architecture), mas não deve ser implantado como servidor
- Nenhum script deve tentar iniciar `backend/src/app/application.ts` como servidor de produção

### Para deploy

- Deploy de backend = `supabase functions deploy <function-name>`
- Deploy de frontend = build Vite + hospedagem estática
- `backend/` **não faz parte do pipeline de deploy**

### Status dos diretórios

| Diretório | Status | Papel |
|-----------|--------|-------|
| `supabase/functions/` | ✅ **Runtime oficial** | Serve todos os endpoints HTTP em produção via Deno Edge Functions |
| `backend/src/` | 📚 **Biblioteca de domínio** | Referência arquitetural e domínio compartilhado — não executável em produção |
| `src/` | ✅ **Frontend oficial** | Interface React — chama Edge Functions via `src/lib/api.ts` |

### Documentos atualizados por esta decisão

- `README.md` — adicionada seção "Architecture Overview" com tabela de camadas e entrypoints
- `backend/README.md` — reescrito com aviso explícito de "não é runtime de produção"
- `backend/docs/hardening-architecture.md` — adicionado aviso no topo sobre papel do diretório
- `docs/adr/0001-backend-runtime-source-of-truth.md` — este documento

---

## Implicações para novos desenvolvedores

1. **Para subir o projeto localmente:**
   - Frontend: `npm install && npm run dev`
   - Edge Functions: `supabase start && supabase functions serve`
   - `backend/` não precisa ser iniciado

2. **Para publicar:**
   - Frontend: via Lovable ou qualquer host estático
   - Edge Functions: `supabase functions deploy <function-name>`

3. **Para estender a API:**
   - Crie ou modifique arquivos em `supabase/functions/`
   - Consulte `backend/src/` para padrões de domínio, não para instanciar um servidor

---

## Referências

- `src/lib/api.ts` — cliente frontend que chama exclusivamente Edge Functions
- `supabase/functions/mix-sessions/index.ts` — exemplo de entrypoint Deno ativo
- `docs/api-contract.md` — contrato de API completo (todos os endpoints via Edge Functions)
- `docs/architecture.md` — diagrama de arquitetura com Edge Functions como API Layer
