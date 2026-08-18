# Mettre CloudMeet en production

Guide de déploiement sur Cloudflare Pages (D1 + KV + cron worker).
Deux chemins possibles : **bouton GitHub** (workflow `deploy.yml`, recommandé) ou **CLI local**.

---

## 1. Prérequis

- Un compte Cloudflare (le plan gratuit suffit pour démarrer)
- Les credentials OAuth Google (voir `.env.example`) si vous voulez la connexion Google + Google Meet
- Un secret JWT fort : `openssl rand -hex 32`

## 2. Option A — Déploiement via GitHub (recommandé)

Le workflow `.github/workflows/deploy.yml` (déclenchement manuel `workflow_dispatch`) crée
automatiquement la base D1, le namespace KV, le projet Pages et le worker de rappels,
puis applique le schéma et déploie.

1. Dans **Settings → Secrets and variables → Actions**, définir :

   | Secret | Rôle |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | Token avec droits Pages, D1, Workers, KV |
   | `CLOUDFLARE_ACCOUNT_ID` | ID du compte Cloudflare |
   | `JWT_SECRET` | Secret de signature des sessions (fort !) |
   | `APP_URL` | URL publique finale (ex: `https://rendez-vous.mondomaine.fr`) |
   | `ADMIN_EMAIL` | Email autorisé à se connecter au dashboard |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
   | `EMAILIT_API_KEY` / `EMAIL_FROM` | Envoi d'emails via EmailIt (optionnel si SMTP) |
   | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | OAuth Outlook (optionnel) |
   | `CRON_SECRET` | Secret partagé avec le worker de rappels |

2. Onglet **Actions → Deploy to Cloudflare → Run workflow**.
3. Le workflow crée les ressources, injecte les IDs dans `wrangler.toml`, déploie Pages + le cron.

> Le token API doit couvrir : Account — Cloudflare Pages (Edit), D1 (Edit), Workers Scripts (Edit),
> Workers KV Storage (Edit). Créable dans **My Profile → API Tokens**.

## 3. Option B — Déploiement local (CLI)

```bash
npx wrangler login

# Ressources
npx wrangler d1 create cloudmeet
npx wrangler kv namespace create cloudmeet-kv
# → renseigner database_id et KV id dans wrangler.toml

# Schéma + migrations
pnpm run db:init:remote
for m in migrations/*.sql; do npx wrangler d1 execute cloudmeet --file="$m" --remote || true; done

# Secrets Pages (redemander à chaque commande)
npx wrangler pages secret put JWT_SECRET --project-name=cloudmeet
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=cloudmeet
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=cloudmeet
# … idem pour ADMIN_EMAIL, APP_URL, EMAILIT_API_KEY, EMAIL_FROM, CRON_SECRET, MICROSOFT_*

# Déploiement
pnpm run deploy

# Worker de rappels (toutes les 5 min)
cd workers/cron-reminders && npx wrangler deploy && npx wrangler secret put APP_URL && npx wrangler secret put CRON_SECRET
```

## 4. Domaine personnalisé

Dans le dashboard Cloudflare Pages → **Custom domains** → ajouter le domaine (le DNS
Cloudflare se configure automatiquement si le domaine est sur le même compte). HTTPS est
provisionné sans action. Mettre alors `APP_URL` à jour avec l'URL finale et redéployer.

## 5. Après le déploiement : checklist

- [ ] `GET /api/health` renvoie `{"status":"ok"}` (D1 + schéma vérifiés)
- [ ] Connexion dashboard via Google (ou config SMTP/CalDAV dans « CalDAV & SMTP »)
- [ ] Créer au moins un type d'événement actif
- [ ] Parcours complet en visiteur : page `/` → choix → créneau → formulaire → confirmation
- [ ] Email de confirmation reçu (avec pièce jointe `.ics` si SMTP est configuré)
- [ ] `DASHBOARD_DEMO` **non défini** (ou `0`) en production — le login instantané doit rester désactivé

## 6. Sécurité — rappels

- `JWT_SECRET` doit être unique et fort ; sans lui (hors mode démo), les sessions refusent de valider (échec fermé).
- Les credentials CalDAV/CardDAV/SMTP sont stockés en clair dans D1 (suivi dans #40) : réserver à un compte dédié à mot de passe limité.
- `CRON_SECRET` protège `/api/cron/send-reminders` contre les appels externes.
