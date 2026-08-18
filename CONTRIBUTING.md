# Contribuer à CloudMeet

Merci de contribuer ! Ce document décrit comment développer sur CloudMeet : setup, conventions de commits, processus de développement (TDD) et checks à passer.

## Setup

```bash
pnpm install
cp .env.example .dev.vars   # puis remplir les valeurs (voir .env.example)
pnpm run db:init            # initialise D1 local
pnpm run dev:watch          # vite dev (UI seule, sans bindings)
pnpm run dev                # build + wrangler pages dev (prod-like, port 8788)
```

Stack : SvelteKit 2 + Svelte 5 (runes) + Tailwind v4, adaptateur Cloudflare (D1/KV).
Pas de `process.env` : tout passe par les bindings (`platform.env.DB`).

## Cycle de contribution

1. Crée une **issue** (ou commente celle sur laquelle tu travailles) — toute PR doit référencer une issue.
2. Branche nommée `feat/<slug>`, `fix/<slug>` ou `chore/<slug>` issue-N (ex: `feat/ics-attachments-12`).
3. Développe en **TDD** (voir ci-dessous).
4. Assure-toi que `pnpm run check` et `pnpm run test` passent.
5. PR → `main`, avec `Closes #N` dans la description.

## Standardisation des commits (Conventional Commits)

Format : `type(scope): description courte à l'impératif, en anglais`

```
feat(booking): attach .ics files to confirmation emails
fix(availability): ignore detected timezone when forced on event type
refactor(availability): split recurring/exception layers between KV and D1
```

### Types autorisés

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Restructuration sans changement de comportement |
| `test` | Ajout/correction de tests |
| `docs` | Documentation |
| `chore` | Tooling, CI, dépendances |
| `perf` | Performance |

### Règles

- Une PR = un commit squash au format ci-dessus (le titre de la PR devient le message).
- Toute `feat`/`fix` doit référencer l'issue : `feat(booking): ... (#12)`.
- `BREAKING CHANGE:` en pied de commit (ou `!` après le type) pour les ruptures.
- Les commits `feat` déclenchent un bump minor, `fix` un patch, `BREAKING CHANGE` un major.

## Développement piloté par les tests (TDD)

Le développement suit strictement le cycle **Red → Green → Refactor** :

1. **Red** : écris un test qui décrit le comportement attendu et échoue.
   - Logique métier pure → test unitaire (`*.test.ts`, vitest).
   - Règles métier avec entrées aléatoires (algorithmes de disponibilité, round robin, .ics…) → **test de propriété** avec `fast-check`.
   - Parcours utilisateur critiques (booking, annulation, replanification) → e2e Playwright (`test:e2e`).
2. **Green** : écris le **minimum** de code pour faire passer le test.
3. **Refactor** : nettoie en gardant les tests verts.

Règles :
- Pas de `feat` sans test qui la couvre ; pas de `fix` sans test de régression qui échouait avant.
- La logique métier doit vivre dans des **modules purs** sous `src/lib/server/` (ou `src/lib/`), testables sans bindings Cloudflare. Les routes/routes server ne font que l'orchestration.
- Les tests doivent être **déterministes** (pas de `Date.now()` nu — injecter l'horloge).

## Checks CI (bloquants)

```bash
pnpm run check   # svelte-check — doit rester à 0 erreur
pnpm run test    # vitest (unitaires + propriétés)
pnpm run test:e2e # Playwright
```

La CI (Node 24) fait tourner `check` + `test` sur chaque PR ; elle doit rester verte.

## Design system

La palette (teal/stone) et le dark mode sont en cours de figeage (voir la roadmap, Phase 1). Toute UI nouvelle doit :
- utiliser les tokens Tailwind v4 du design system (pas de couleurs ad hoc) ;
- être vérifiée en light **et** dark mode.

## Roadmap

Voir [ROADMAP.md](./ROADMAP.md) et les [milestones](https://github.com/delta-whiplash/CloudMeet/milestones).
