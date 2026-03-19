# Relatório de Auditoria Técnica — ShadowMix

**Repositório:** `andremontrezollo-ui/round1`  
**Branch analisada:** `main`  
**Data:** 2026-03-19  
**Auditor:** GitHub Copilot (análise automatizada)

---

## Resumo Executivo

O repositório contém uma aplicação React/TypeScript (frontend) com Supabase Edge Functions como backend. A stack é moderna e bem escolhida. Os maiores riscos identificados são de **segurança** (arquivo `.env` com credenciais versionado) e de **qualidade de código** (TypeScript configurado sem `strict`, ESLint silenciando alertas de variáveis não utilizadas). Inconsistências de ferramentas (múltiplos lockfiles) e pequenos erros de documentação completam o quadro.

**Status das correções aplicadas neste PR:**
- ✅ `.env` removido do rastreamento git
- ✅ `.gitignore` atualizado
- ✅ `.env.example` criado na raiz
- ✅ `README.md` corrigido (claims incorretos, docs de env, package manager)
- ✅ `package.json` name corrigido + script `typecheck` adicionado
- ✅ `tailwind.config.ts` content paths corrigidos
- ✅ ESLint: `no-unused-vars` reativado (com tolerância para `_prefix`)

---

## Achados

### 🔴 ALTA — Arquivo `.env` Versionado com Credenciais Reais

**Arquivo:** `.env`  
**Evidência:**
```
VITE_SUPABASE_PROJECT_ID="cnzsyzibprecpaxmfyzb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenN5emlicHJlY3BheG1meXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDA5OTYsImV4cCI6MjA4ODA3Njk5Nn0.9CMjuTU3DiSFLQn8m1EXoGJVj_WCkokmb3RLUms3JTk"
VITE_SUPABASE_URL="https://cnzsyzibprecpaxmfyzb.supabase.co"
```

**Análise:**
- O arquivo `.env` com valores reais foi commitado e estava no histórico do git.
- `VITE_SUPABASE_PUBLISHABLE_KEY` é a chave `anon` do Supabase — ela é pública por design (usada no browser), mas ainda assim **não deve ser versionada**: deixa o Project ID e URL expostos publicamente de forma permanente no histórico.
- O `.gitignore` original **não incluía `.env`**.
- O README afirmava incorretamente "✅ No hardcoded secrets in codebase".

**Risco:** Qualquer pessoa com acesso ao repositório (ou ao histórico) pode identificar o projeto Supabase e tentar abusar da chave `anon` para operações não autorizadas, caso as Row-Level Security policies não estejam perfeitamente configuradas.

**Correções aplicadas:**
1. `git rm --cached .env` — arquivo removido do rastreamento (ainda existe localmente).
2. `.gitignore` atualizado para incluir `.env`, `.env.local`, `.env.*.local`.
3. `.env.example` criado na raiz com placeholders documentados.
4. README corrigido.

**Ação pendente (manual):**
> ⚠️ O histórico git ainda contém o commit com o `.env`. Se o repositório for público ou se as chaves precisarem ser tratadas como comprometidas, execute `git filter-repo` (ou similar) para remover o arquivo do histórico e **rotacione a chave Supabase** no dashboard do projeto.

---

### 🟡 MÉDIA — Múltiplos Lockfiles (npm + bun)

**Arquivos:** `package-lock.json`, `bun.lock`, `bun.lockb`

**Análise:**
- O repositório mantém três lockfiles simultaneamente:
  - `package-lock.json` (npm)
  - `bun.lock` (Bun, formato texto — adicionado no Bun 1.1)
  - `bun.lockb` (Bun, formato binário — versão legada)
- Isso indica que npm e bun foram usados alternadamente, criando risco de **divergências de versões** entre ambientes de desenvolvimento e CI/CD.
- O `README.md` original dizia "npm, yarn, ou bun" sem definir o gerenciador primário.

**Risco:** Um desenvolvedor usando `npm install` e outro usando `bun install` podem ter árvores de dependência diferentes, causando bugs difíceis de rastrear.

**Recomendação:**
1. Escolha um gerenciador: **npm** (mais universal) ou **bun** (mais rápido). Recomendamos npm para maior compatibilidade com o ecossistema.
2. Remova os lockfiles do gerenciador descartado:
   ```bash
   # Se optar por npm:
   rm bun.lock bun.lockb
   echo "use-npm" > .npmrc  # opcional, reforça o uso

   # Se optar por bun:
   rm package-lock.json
   ```
3. Documente a escolha no README e/ou em um campo `engines` no `package.json`:
   ```json
   "engines": { "node": ">=18", "npm": ">=9" }
   ```

**Nota:** O README foi atualizado para recomendar npm como gerenciador primário.

---

### 🟡 MÉDIA — TypeScript Configurado sem Strictness

**Arquivo:** `tsconfig.app.json`  
**Evidência:**
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

**Análise:**
- Com `strict: false` e `strictNullChecks: false`, o TypeScript não valida erros de null/undefined, que são a principal causa de crashes em produção em aplicações React.
- `noImplicitAny: false` permite que variáveis não tipadas sejam tratadas como `any`, esvaziando o valor do TypeScript.
- Paradoxalmente, `tsconfig.node.json` (para o Vite config) tem `strict: true`.

**Recomendação:**
Ativar gradualmente a strictness. A ordem sugerida (sem breaking changes imediatos):
```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,       // 1º passo — detecta null bugs
    "noImplicitAny": true,          // 2º passo — força tipagem explícita
    "noUnusedLocals": true,         // 3º passo — remove código morto
    "noUnusedParameters": true      // 3º passo
  }
}
```

> ⚠️ **Breaking change potencial:** Ativar `strictNullChecks` pode expor erros latentes no código. Recomenda-se fazer isso com `npm run typecheck` localmente antes de commitar, corrigindo os erros um a um. Por isso, esta mudança **não foi aplicada automaticamente** — requer revisão manual.

---

### 🟡 MÉDIA — ESLint Silenciando Alertas de Variáveis Não Utilizadas

**Arquivo:** `eslint.config.js`  
**Evidência:**
```js
"@typescript-eslint/no-unused-vars": "off",
```

**Análise:**
- Com `strict: false` no TypeScript, o ESLint seria a única rede de segurança para detectar variáveis/imports mortos. Ao desativar esta regra, código morto acumula sem aviso.
- A regra `react-refresh/only-export-components` estava configurada como `warn` mas não `error` — aceitável.

**Correção aplicada:** A regra foi reativada como `warn` com tolerância para prefixo `_`:
```js
"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
```
Esta configuração é padrão recomendado — variáveis prefixadas com `_` são ignoradas (ex.: `_event`, `_unused`).

---

### 🟡 MÉDIA — README com Informações Incorretas/Desatualizadas

**Arquivo:** `README.md`

**Problemas encontrados:**
1. Afirmava "✅ No hardcoded secrets in codebase" — **falso** (`.env` estava versionado).
2. Afirmava "This project does not require any environment variables" — **falso** (VITE_SUPABASE_* são necessários).
3. Referenciava `npm run typecheck` que não existia em `package.json` — **script ausente**.
4. Listava "npm, yarn, ou bun" sem definir o gerenciador primário — **ambíguo**.

**Correções aplicadas:** Seções "Prerequisites", "Getting Started", "Environment Variables" e "Best Practices Implemented" foram reescritas com informações corretas.

---

### 🟢 BAIXA — `package.json` com Nome Genérico de Template

**Arquivo:** `package.json`  
**Evidência:** `"name": "vite_react_shadcn_ts"`

**Análise:** O nome é o valor padrão do template Vite+ShadCN, nunca atualizado para refletir o projeto real. Não causa erros de execução, mas é ruim para rastreabilidade e tooling.

**Correção aplicada:** Alterado para `"shadowmix"`.

---

### 🟢 BAIXA — Tailwind: Content Paths Inexistentes

**Arquivo:** `tailwind.config.ts`  
**Evidência:**
```js
content: [
  "./pages/**/*.{ts,tsx}",       // ❌ não existe
  "./components/**/*.{ts,tsx}",  // ❌ não existe
  "./app/**/*.{ts,tsx}",         // ❌ não existe
  "./src/**/*.{ts,tsx}",         // ✅ correto
],
```

**Análise:** Os três primeiros paths são herança de um template Next.js/genérico. Eles não causam erros (glob simplesmente não encontra nada), mas aumentam levemente o tempo de build do Tailwind e causam confusão.

**Correção aplicada:**
```js
content: ["./index.html", "./src/**/*.{ts,tsx}"],
```
`index.html` foi adicionado para garantir que classes usadas no HTML raiz sejam incluídas (ex.: classes no `<body>`).

---

### 🟢 BAIXA — Script `typecheck` Ausente no `package.json`

**Arquivo:** `package.json`

**Análise:** O README documentava `npm run typecheck` mas o script não existia.

**Correção aplicada:**
```json
"typecheck": "tsc --noEmit"
```

---

### 🟢 BAIXA — `vitest.config.ts`: Ausência de Coverage

**Arquivo:** `vitest.config.ts`

**Análise:** A configuração de testes não define limites mínimos de cobertura (`coverage`). Existem apenas 3 arquivos de teste para um projeto com 10+ páginas/componentes relevantes. As áreas sem cobertura incluem:
- `src/lib/api.ts` (cliente HTTP) — zero testes
- `src/components/mixing/` — zero testes (fluxo crítico)
- `src/hooks/` — zero testes

**Recomendação:**
```ts
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    thresholds: { lines: 60, functions: 60 },
  },
}
```

---

### 🟢 BAIXA — Dependências do Backend Desatualizadas

**Arquivo:** `backend/package.json`  
**Evidência:**
```json
"typescript": "^4.9.4"   // frontend usa 5.8.3
"zod": "^3.20.2"          // frontend usa 3.25.76
"express": "^4.18.2"      // v5 disponível
```

**Análise:** O backend usa TypeScript 4.x enquanto o frontend usa 5.x. Isso pode causar inconsistências de sintaxe e typing se código for compartilhado. O `express` v4 ainda é suportado mas v5 está disponível.

**Recomendação:** Atualizar dependências do backend progressivamente com `npm update` e rodar testes após cada atualização.

---

## Estrutura do Projeto — Avaliação

```
round1/
├── src/               ✅ Bem organizado: components/, hooks/, lib/, pages/, test/
├── backend/           ✅ Clean Architecture com domain/application/infra
├── supabase/          ✅ Edge Functions + migrações versionadas
│   ├── functions/     ✅ Funções bem separadas (mix-sessions, contact, health, etc.)
│   └── migrations/    ✅ Migrations com timestamp
├── docs/              ✅ Boa documentação técnica existente
└── public/            ✅ Mínimo e correto
```

**Pontos positivos da estrutura:**
- Separação clara entre frontend, backend e infra (Supabase)
- Clean Architecture no backend (domain/application/infra por módulo)
- Edge Functions importam lógica de `backend/src` — boa reutilização
- Documentação de arquitetura presente em múltiplos níveis

**Sugestões futuras (não urgentes):**
- `src/integrations/supabase/client.ts` é gerado automaticamente ("Do not edit it directly") — considere documentar no README como regenerar
- `src/lib/mock-session.ts` está no `lib/` mas parece ser exclusivo para desenvolvimento/testes — considere mover para `src/test/` ou `src/mocks/`

---

## Resumo de Prioridades e Status

| # | Achado | Prioridade | Status |
|---|--------|-----------|--------|
| 1 | `.env` versionado com credenciais | 🔴 Alta | ✅ Corrigido (git + gitignore + .env.example) |
| 2 | Múltiplos lockfiles (npm + bun) | 🟡 Média | ⚠️ Documentado — escolha manual necessária |
| 3 | TypeScript sem strictness | 🟡 Média | ⚠️ Documentado — migração gradual recomendada |
| 4 | ESLint silenciando unused-vars | 🟡 Média | ✅ Corrigido |
| 5 | README com informações incorretas | 🟡 Média | ✅ Corrigido |
| 6 | `package.json` nome genérico | 🟢 Baixa | ✅ Corrigido |
| 7 | Tailwind: content paths inexistentes | 🟢 Baixa | ✅ Corrigido |
| 8 | Script `typecheck` ausente | 🟢 Baixa | ✅ Corrigido |
| 9 | Vitest sem limites de cobertura | 🟢 Baixa | ⚠️ Documentado |
| 10 | Backend deps desatualizadas | 🟢 Baixa | ⚠️ Documentado |

---

## Próximos Passos Recomendados

### Imediato (antes do próximo deploy)
1. **Rotacione a chave Supabase** se o repositório tiver sido público ou se houver dúvidas sobre acesso — acesse Supabase Dashboard → Settings → API → Regenerate keys.
2. **Limpe o histórico git** se necessário: `git filter-repo --path .env --invert-paths` (requer coordenação com todos os colaboradores).

### Curto prazo (próximas sprints)
3. **Escolha um package manager** (npm ou bun) e remova o lockfile do outro.
4. **Ative `strictNullChecks: true`** no `tsconfig.app.json`, corrija os erros com `npm run typecheck`.
5. **Adicione testes** para `src/lib/api.ts` e `src/components/mixing/`.

### Médio prazo
6. **Ative `noImplicitAny: true`** no TypeScript após o passo 4.
7. **Atualize dependências do backend** (`typescript`, `zod`, `express`).
8. **Configure coverage** no Vitest com thresholds mínimos.
