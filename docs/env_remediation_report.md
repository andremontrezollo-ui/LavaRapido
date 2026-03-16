# Environment Variable Remediation Report

**Date:** 2026-03-16  
**Author:** Security/DevOps automated remediation  
**Severity:** High – live Supabase credentials were tracked in Git history

---

## 1. Summary

The frontend `.env` file containing real Supabase credentials was committed and tracked by the repository. This report documents every change made to remediate the exposure and harden the project against future occurrences.

---

## 2. Files Changed

| File | Change |
|---|---|
| `.gitignore` | Added rules to ignore `.env` and `.env.*`; added `!.env.example` exception |
| `.env` | Removed from Git index (`git rm --cached`) – file stays on disk, is no longer tracked |
| `.env.example` *(new)* | Created with placeholder variable names and no real values |
| `src/lib/env.ts` *(new)* | Typed environment validation utility – fails fast if required vars are missing |
| `src/integrations/supabase/client.ts` | Now imports env vars via `src/lib/env.ts` instead of raw `import.meta.env` |
| `src/lib/api.ts` | Now imports env vars via `src/lib/env.ts` instead of raw `import.meta.env` |
| `README.md` | Corrected "no env vars needed" claim; added proper env var documentation table |
| `docs/env_remediation_report.md` *(this file)* | Created |

---

## 3. Rules Added to `.gitignore`

```gitignore
# Environment variables – never commit real secrets
.env
.env.*
!.env.example
```

These rules ensure that:
- `.env` and any variant (`.env.local`, `.env.production`, etc.) are never tracked.
- The safe template `.env.example` **is** tracked (negation rule `!.env.example`).

---

## 4. Variables Mapped

### Variables in `.env` (now untracked)

| Variable | Used in Code? | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Required – used in `client.ts` and `api.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Required – used in `client.ts` and `api.ts` |
| `VITE_SUPABASE_PROJECT_ID` | ❌ No | Present in `.env`; not referenced in source code; included in `.env.example` for tooling use |

### Variables used by code (`import.meta.env`)

| File | Variable |
|---|---|
| `src/integrations/supabase/client.ts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `src/lib/api.ts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

---

## 5. Risks Found

| Risk | Severity | Status |
|---|---|---|
| `.env` with real Supabase keys tracked in Git | **High** | ✅ Mitigated – file untracked, `.gitignore` updated |
| No `.gitignore` rule for `.env` files | **High** | ✅ Fixed |
| No frontend `.env.example` | **Medium** | ✅ Fixed |
| No environment validation (silent failures) | **Medium** | ✅ Fixed – `src/lib/env.ts` validates at startup |
| README incorrectly stated no env vars needed | **Low** | ✅ Fixed |

---

## 6. Sensitive Secrets Audit

The exposed `.env` contained:

- **`VITE_SUPABASE_URL`** – project URL (semi-public, but should not be in Git).
- **`VITE_SUPABASE_PUBLISHABLE_KEY`** – Supabase anonymous/anon JWT. This key has **limited privileges** (row-level security enforced by Supabase), but its exposure still allows unauthenticated access to public tables and should be treated as compromised.

**No private keys, `service_role` tokens, SMTP credentials, or administrative secrets were found in the frontend code or `.env` file.** The backend `.env.example` correctly contains a placeholder for `SUPABASE_SERVICE_ROLE_KEY` but the actual `.env` file in `backend/` was not committed.

> ⚠️ **Recommendation:** Even though the anon key has limited privileges, it is best practice to rotate the exposed Supabase anon key from the Supabase dashboard since it appeared in the Git history.

---

## 7. Manual Commands Required

The following commands must be run **locally** by every developer who already has the repository cloned, to ensure the real `.env` is no longer tracked:

```bash
# Remove .env from the Git index without deleting the file on disk
git rm --cached .env

# Verify the file is no longer tracked
git status
```

These commands have already been applied to the remote repository as part of this remediation.

---

## 8. Git History Cleanup (Separate Step)

The real credentials appear in the **Git commit history** (not just the working tree). Removing the file from tracking does not purge it from past commits. To fully scrub history, a separate rebase/filter step is required:

```bash
# Using git-filter-repo (recommended):
git filter-repo --path .env --invert-paths

# OR using BFG Repo Cleaner:
bfg --delete-files .env
```

> ⚠️ This rewrites history and requires a **force-push** (`git push --force`). All collaborators must re-clone or rebase after this operation. Coordinate with the team before executing.

**Additionally:** Supabase anon key rotation is strongly recommended regardless of history cleanup, as the key may have been captured by any automated scanner monitoring public GitHub repositories.

---

## 9. Post-Remediation Checklist

- [x] `.gitignore` updated
- [x] `.env` untracked via `git rm --cached`
- [x] `.env.example` created with safe placeholders
- [x] `src/lib/env.ts` validation utility created
- [x] `src/integrations/supabase/client.ts` uses validation utility
- [x] `src/lib/api.ts` uses validation utility
- [x] `README.md` corrected
- [ ] *(Manual)* Rotate Supabase anon key from dashboard
- [ ] *(Manual)* Purge `.env` from Git history using `git filter-repo` or BFG
- [ ] *(Manual)* Each developer runs `git rm --cached .env` locally
