# Auditoria Técnica — ShadowMix (`andremontrezollo-ui/round1`)

> **Data**: 2026-03-19  
> **Branch auditada**: `main`  
> **Auditor**: GitHub Copilot (análise automática + revisão guiada)

---

## Sumário executivo

| Prioridade | Achado | Status |
|-----------|--------|--------|
| 🔴 CRÍTICO | `.env` com credenciais reais versionado no repositório | **Corrigido neste PR** |
| 🔴 CRÍTICO | `.gitignore` não exclui `.env` | **Corrigido neste PR** |
| 🟠 ALTO | README declara "sem variáveis de ambiente" e "sem segredos" — ambas falsas | **Corrigido neste PR** |
| 🟡 MÉDIO | Coexistência de `package-lock.json` + `bun.lock` + `bun.lockb` | **Corrigido neste PR** |
| 🟡 MÉDIO | TypeScript `strict: false` — desativa proteções importantes | Recomendação |
| 🟢 BAIXO | ESLint desabilita `@typescript-eslint/no-unused-vars` | Recomendação |
| 🟢 BAIXO | `bun.lockb` (binário) convivendo com `bun.lock` (texto) — duplicata | **Corrigido neste PR** |

---

## Achados detalhados

---

### 🔴 F-01 — `.env` versionado com credenciais Supabase reais

**Arquivo**: `.env` (raiz do projeto)  
**Evidência** (valores mascarados):

```
VITE_SUPABASE_PROJECT_ID="cnzsyzib********************"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci...****"  # JWT anon key real
VITE_SUPABASE_URL="https://cnzsyzib********************.supabase.co"
```

**Risco**: O `VITE_SUPABASE_PUBLISHABLE_KEY` é uma chave JWT real para o projeto Supabase. Qualquer pessoa com acesso ao repositório (ou ao histórico de commits) pode usá-la para consultar o banco de dados diretamente, contornando a camada da aplicação. Mesmo que o Supabase use Row-Level Security (RLS), uma chave exposta amplifica a superfície de ataque.

**Ação imediata necessária pelo time**:
1. **Rotar a chave** no dashboard do Supabase → Settings → API → regenerar a `anon key`.
2. Remover o commit do histórico (o arquivo foi removido do tracking neste PR, mas ainda existe no histórico de git):
   ```bash
   # Opção 1: BFG Repo-Cleaner (recomendado)
   bfg --delete-files .env
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force

   # Opção 2: git filter-repo
   git filter-repo --invert-paths --path .env
   git push --force
   ```

**Correção aplicada neste PR**:
- `git rm --cached .env` — remove o arquivo do tracking
- `.env` adicionado ao `.gitignore`
- `.env.example` criado com placeholders (sem valores reais)

---

### 🔴 F-02 — `.gitignore` não excluía `.env`

**Arquivo**: `.gitignore`  
**Evidência**: O arquivo continha `*.local` (exclui `.env.local`) mas não continha `.env`, permitindo que o arquivo de credenciais fosse versionado sem aviso.

**Correção aplicada neste PR**:
```diff
+ # Environment variables — never commit real secrets
+ .env
+ .env.*
+ !.env.example
```

---

### 🟠 F-03 — README com afirmações incorretas sobre segurança

**Arquivo**: `README.md`

**Evidências**:
1. Linha ~68: _"This project does not require any environment variables for frontend operation."_  
   → Falso: `src/lib/api.ts` e `src/integrations/supabase/client.ts` leem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` via `import.meta.env`.

2. Linha ~85: _"✅ No hardcoded secrets in codebase"_  
   → Contraditório: o próprio `.env` com valores reais estava no repositório.

**Correção aplicada neste PR**:
- Seção "Environment Variables" atualizada com instruções de setup, tabela de variáveis e aviso de rotação.
- Item do checklist corrigido com aviso explícito.

---

### 🟡 F-04 — Coexistência de lockfiles incompatíveis

**Arquivos**: `package-lock.json` (npm), `bun.lock` (Bun ≥1.2 texto), `bun.lockb` (Bun ≤1.1 binário)

**Risco**: Dois gerenciadores de pacotes diferentes (npm e Bun) produzem árvores de dependências potencialmente distintas. Dependendo de qual lockfile o CI ou cada desenvolvedor usa, versões diferentes de pacotes podem ser instaladas — introduzindo bugs de ambiente ou vulnerabilidades não detectadas. Além disso, `bun.lock` e `bun.lockb` representam dois formatos de lockfile do *mesmo* gerenciador (redundância).

**Correção aplicada neste PR**:
- `bun.lock` e `bun.lockb` removidos do tracking (`git rm --cached`).
- Adicionados ao `.gitignore` com comentário explicativo.
- `package-lock.json` mantido como lockfile canônico (alinhado com os scripts `npm run …` documentados no README).

**Recomendação adicional**:
- Se o time quiser migrar para Bun, remover `package-lock.json` e commitar `bun.lock`, atualizando os scripts do README.
- Escolher **um** gerenciador de pacotes e documentá-lo explicitamente no README e no `package.json` via `"packageManager": "npm@10.x"` (ou `"bun@1.x"`).

---

### 🟡 F-05 — TypeScript `strict: false` e checagens críticas desativadas

**Arquivos**: `tsconfig.json`, `tsconfig.app.json`

**Evidência**:
```jsonc
// tsconfig.app.json
"strict": false,
"noImplicitAny": false,
"strictNullChecks": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noFallthroughCasesInSwitch": false
```

**Risco**:
- `strictNullChecks: false` é o mais perigoso: permite erros de `null`/`undefined` em runtime que o compilador deveria pegar.
- `noImplicitAny: false` permite código sem tipagem explícita, reduzindo a confiança nas interfaces.
- `noUnusedLocals/Parameters: false` permite dead code silencioso.

**Contexto**: `tsconfig.node.json` usa `"strict": true` (apenas para `vite.config.ts`), mostrando que o time conhece a opção mas optou por não aplicá-la no código da aplicação.

**Recomendação** (não aplicada neste PR por ser potencialmente breaking):
1. Ativar progressivamente: comece por `strictNullChecks: true` e resolva os erros antes de ativar `strict: true`.
2. Ferramentas como `ts-prune` ou `knip` podem ajudar a identificar código morto com `noUnusedLocals`.

```jsonc
// Migração progressiva sugerida (tsconfig.app.json)
"strictNullChecks": true,   // fase 1
"noImplicitAny": true,      // fase 2
"strict": true,             // fase 3 (inclui todas acima)
```

---

### 🟢 F-06 — ESLint desabilita `@typescript-eslint/no-unused-vars`

**Arquivo**: `eslint.config.js`  
**Evidência**:
```js
"@typescript-eslint/no-unused-vars": "off",
```

**Risco**: Variáveis e imports não utilizados passam silenciosamente pelo lint. Em combinação com `noUnusedLocals: false` no TypeScript, o dead code nunca é sinalizado.

**Recomendação** (não aplicada para evitar introduzir ruído no PR):
```js
// Trocar "off" por warn/error com padrão de ignore para _prefix
"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
```

---

### 🟢 F-07 — `bun.lockb` (binário) e `bun.lock` (texto) coexistiam

**Arquivos**: `bun.lock` (texto, Bun ≥1.2) e `bun.lockb` (binário, Bun ≤1.1)

**Causa**: O Bun mudou o formato do lockfile de binário (`.lockb`) para texto (`.lock`) na versão 1.2. O repositório acumulou ambos, provavelmente porque a versão do Bun foi atualizada sem remover o arquivo legado.

**Correção aplicada neste PR**: ambos removidos do tracking (ver F-04).

---

## Análise de configuração: achados sem ação imediata

### `vite.config.ts`

```ts
server: { host: "::", port: 8080, hmr: { overlay: false } }
```

- `host: "::"` vincula o servidor a todas as interfaces (IPv6). Em ambientes de desenvolvimento local isso geralmente é intencional (acesso via LAN), mas pode expor o servidor em redes não confiáveis. **Recomendação**: usar `host: "localhost"` ou `"127.0.0.1"` se o acesso externo não for necessário.
- `hmr: { overlay: false }` desabilita o overlay de erros do HMR — dificulta a visibilidade de erros de compilação no navegador. Considere reativar em dev.

### `vitest.config.ts`

Configuração razoável. Ponto de atenção:
- `globals: true` expõe `describe`, `it`, `expect` globalmente sem imports. Funcionalmente OK, mas pode gerar confusão. O projeto já importa explicitamente em alguns arquivos de teste (ex.: `validation.test.ts`). Recomenda-se manter o import explícito para consistência (ou omiti-lo consistentemente se `globals: true` for a convenção adotada).

### `eslint.config.js`

- Ignora apenas `dist/` — `node_modules` é ignorado por padrão pelo ESLint v9.
- `ecmaVersion: 2020` é conservador dado que o alvo de build é ES2020/ES2022. Pode ser atualizado para `"latest"` sem impacto.
- Falta lint para arquivos `.js` na raiz (`postcss.config.js`, `eslint.config.js`). A regex `**/*.{ts,tsx}` não os cobre.

### `tailwind.config.ts`

Configuração bem estruturada. Único ponto:
- `require("tailwindcss-animate")` usa sintaxe CommonJS (`require`) dentro de um arquivo TypeScript com `"type": "module"` no `package.json`. Funciona porque o Tailwind config é processado pelo Node/TS-node antes do bundler, mas pode causar problemas de tipos ou warnings em futuras versões do Tailwind. Migrar para `import tailwindcssAnimate from "tailwindcss-animate"` e usar como `plugins: [tailwindcssAnimate]` é a forma idiomática para projetos ESM.

---

## Análise de estrutura

### `src/`

Organização clara e convencional:
```
src/
├── components/   # UI + layout + features
├── hooks/        # Custom hooks
├── lib/          # Utilitários, constantes, validação
├── pages/        # Rotas
└── test/         # Testes unitários
```

**Ponto positivo**: `src/lib/validation.ts` centraliza toda a lógica de validação com Zod, com testes correspondentes em `src/test/validation.test.ts`.

**Ponto de atenção**: `src/integrations/supabase/client.ts` tem o comentário _"This file is automatically generated. Do not edit it directly."_ mas está no repositório sem indicação clara de como/quando regenerá-lo. Recomenda-se documentar o processo de geração.

### `backend/`

Arquitetura bem documentada em `backend/ARCHITECTURE.md`. Segue separação de camadas (domain / application / infra). Possui `backend/.env.example` (boas práticas).

### `supabase/`

- Funções Edge organizadas por domínio (`mix-sessions`, `contact`, `health`, `cleanup`).
- Pasta `supabase/functions/tests/` indica presença de testes para funções Edge.
- Migrações com UUIDs como nomes de arquivo (gerado pelo Supabase CLI) — padrão normal.

### `docs/`

- `SECURITY.md` — bem elaborado e referência útil.
- `architecture.md`, `api-contract.md` — documentação de arquitetura presente.
- **Gap**: sem documento de `CONTRIBUTING.md` ou `SETUP.md`. A seção de setup está no README, mas um `CONTRIBUTING.md` com processo de git (branch, PR, review) adicionaria clareza.

---

## Recomendações prioritizadas

| # | Prioridade | Ação | Esforço |
|---|-----------|------|---------|
| 1 | 🔴 CRÍTICO | Rotar a `anon key` do Supabase (credencial exposta no histórico) | Baixo (5 min) |
| 2 | 🔴 CRÍTICO | Limpar histórico git para remover o commit com `.env` (BFG ou `git filter-repo`) | Médio |
| 3 | 🟠 ALTO | Definir um único gerenciador de pacotes no `package.json` (`"packageManager"`) | Baixo |
| 4 | 🟡 MÉDIO | Ativar `strictNullChecks: true` e corrigir os erros resultantes | Médio |
| 5 | 🟡 MÉDIO | Ativar `@typescript-eslint/no-unused-vars: warn` no ESLint | Baixo |
| 6 | 🟢 BAIXO | Migrar `require("tailwindcss-animate")` para `import` ESM | Baixo |
| 7 | 🟢 BAIXO | Adicionar `CONTRIBUTING.md` com instruções de fluxo de contribuição | Baixo |

---

## Mudanças aplicadas neste PR

| Arquivo | Mudança |
|---------|---------|
| `.gitignore` | Adicionadas entradas para `.env`, `.env.*`, `bun.lock`, `bun.lockb` |
| `.env` | Removido do tracking via `git rm --cached` |
| `.env.example` | Criado com placeholders (sem valores reais) |
| `bun.lock` | Removido do tracking via `git rm --cached` |
| `bun.lockb` | Removido do tracking via `git rm --cached` |
| `README.md` | Corrigida seção "Environment Variables" e checklist de segurança |
| `docs/AUDIT.md` | Este relatório |

> ⚠️ **Ação urgente fora do PR**: Rotacionar a `anon key` do Supabase no dashboard e limpar o histórico de git.
