# Roadmap CloudMeet

> Détail tracking : [milestones](https://github.com/delta-whiplash/CloudMeet/milestones) et [issues](https://github.com/delta-whiplash/CloudMeet/issues).

## 🚀 v1.0.0 — Le Roc (MVP+ ultra-stable)

**Objectif : rendre le One-to-One tellement fluide et fiable qu'on peut le vendre/lancer en self-host.**

- Finalisation du rework UI/UX : figer dark mode + palette teal/stone, design system (composants Tailwind v4)
- Résilience des synchronisations : refresh auto des tokens OAuth Google/Outlook, gestion des conflits de créneaux
- Messages transactionnels premium : pièces jointes `.ics` dans les emails (« Ajouter à mon calendrier » en un clic)
- Fuseaux horaires « détectés vs forcés » : l'hôte peut forcer un fuseau par type d'événement
- CI/CD & monitoring : `/api/health` vérifiant D1, KV et les APIs Google/Outlook
- Refactor disponibilités en deux couches : récurrences cachées dans KV (~1h), exceptions lues en temps réel dans D1 — prépare le Round Robin de la v2

## 👥 v2.0.0 — Le Collectif (One-to-Many / Many-to-One)

**Objectif : permettre à plusieurs hôtes de gérer des rendez-vous ensemble. Le gros morceau technique.**

- Modèle de données Équipes : tables `teams`, `team_memberships`, `event_types.team_id` (transactions D1)
- Types d'événements collectifs :
  - **Collective** : le créneau s'affiche si les dispos de tous les hôtes se chevauchent
  - **Round Robin** : assignation tour à tour avec load balancing (le moins chargé / le plus ancien)
- Page `/[slug]` adaptative pour les événements d'équipe
- Dashboard « Calendriers connectés » en mode Team (invitation des co-équipiers)

## ⚡ v3.0.0 — Automatisation & monétisation

**Objectif : rendre l'outil indispensable et générer des revenus.**

- Workflows conditions & actions (`si form_field == "Consultation" ALORS email spécifique`)
- Intégration Stripe : champ prix sur les event types, PaymentIntent, créneau réservé 15 min via KV `pending_booking`
- Routing Forms : 2-3 questions avant le calendrier pour rediriger vers le bon type d'événement

## 🏢 v4.0.0 — Enterprise & scale

**Objectif : séduire les grosses structures.**

- White-label : domaine personnalisé, logo/couleurs via le dashboard, suppression du « Powered by CloudMeet » (payant)
- Webhooks sortants : push temps réel (création, annulation, replanification), payload signé HMAC
- Audit Logs : qui a fait quoi et quand dans D1 (RGPD)
- Cron `/api/cron/send-reminders` idempotent avec verrouillage KV (anti-doublons)
