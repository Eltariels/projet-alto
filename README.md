# ALTO

Plateforme d'alternance : « Ne postule qu'aux vraies offres ».

Stack (cf. architecture cible) : React + Tailwind (`client/`), Node.js + Express (`server/`), MongoDB, authentification JWT par rôle.

## Démarrer en local

Prérequis : Node.js 22+, Docker Desktop lancé.

```bash
npm install
cp server/.env.example server/.env   # puis changer JWT_SECRET
npm run db:up                        # MongoDB + Mailpit (e-mails) dans Docker
npm run db:seed                      # 18 offres de démonstration
npm run dev                          # API sur :4000, front sur :5173
```

Le front proxifie `/api` vers l'API : ouvrir http://localhost:5173.

## Commandes utiles

| Commande          | Rôle |
|-------------------|------|
| `npm test`        | Tests de l'API (base `alto_test` dédiée, MongoDB doit tourner) |
| `npm run kpi`     | North Star et 3 KPI semaine par semaine (`npm run kpi -- 12` pour 12 semaines) |
| `npm run db:seed` | Recrée les offres de démonstration |
| `npm run mail:test -- adresse` | Envoie un e-mail de test |
| `npm run build`   | Build du front |

## Organisation

```
client/            React + Vite + Tailwind
  src/pages/       un fichier par écran (accueil, connexion, inscription, mot de passe oublié,
                   réinitialisation, profil, offres, détail, candidatures, 404)
  src/lib/api.js   appels à l'API (cookie JWT inclus)
server/            Express + Mongoose
  src/models/      users, profiles, offers, applications, schools, promos, events
  src/routes/      health, auth, profile, offers, applications
  src/middleware/  requireAuth, requireRole, limitation des tentatives, gestion d'erreurs
  src/utils/       score (+ synonymes de compétences), analyse des offres, e-mails, fichiers
  src/scripts/     seed (offres de démo), kpi
  test/            tests de l'API (node:test)
```

## API disponible

| Méthode | Route                | Rôle            |
|---------|----------------------|-----------------|
| GET     | `/api/health`        | public          |
| POST    | `/api/auth/register` | public (crée un étudiant, `inviteCode` optionnel) |
| POST    | `/api/auth/login`    | public (10 essais / 15 min par compte) |
| POST    | `/api/auth/logout`   | public          |
| GET     | `/api/auth/me`       | connecté        |
| POST    | `/api/auth/forgot-password` | public (même réponse que le compte existe ou non) |
| POST    | `/api/auth/reset-password`  | public (`token` reçu par e-mail, valable 1 h, usage unique) |
| GET/PUT | `/api/profile`       | connecté        |
| POST/GET/DELETE | `/api/profile/cv` | connecté (CV PDF, 5 Mo max, champ `cv`) |
| GET     | `/api/offers`        | connecté (`q`, `secteur`, `ville`, `niveau`, `rythme`, `tri=score\|date`, `favoris=1`, `page`) |
| GET     | `/api/offers/:id`    | connecté (score détaillé + 3 offres proches) |
| PUT/DELETE | `/api/offers/:id/favori` | connecté |
| POST    | `/api/applications`  | étudiant (`offerId`, profil complet requis) |
| GET     | `/api/applications`  | étudiant |
| PATCH   | `/api/applications/:id` | étudiant (`status` : envoyee, vue, entretien, refusee, acceptee, retiree ; et/ou `note`) |

Le JWT est stocké dans un cookie `httpOnly` (`alto_token`). En production, `JWT_SECRET` doit faire au moins
32 caractères aléatoires : le serveur refuse de démarrer sinon.

## E-mails

En développement, `npm run db:up` lance aussi **Mailpit**, un serveur d'e-mail local : tout ce que l'API envoie
(lien « mot de passe oublié ») arrive dans la boîte de réception **http://localhost:8025**, sans rien distribuer.

- `npm run mail:test -- prenom.nom@exemple.fr` : envoie un e-mail de test pour vérifier la configuration.
- Au démarrage, l'API affiche « E-mails : SMTP prêt » ou l'erreur de connexion.
- Si l'envoi échoue, l'étudiant voit la même réponse (on ne révèle pas si le compte existe) et l'erreur est
  tracée dans la console du serveur.

**En production**, il suffit de remplacer `SMTP_URL` et `MAIL_FROM` dans `server/.env` par ceux d'un vrai
fournisseur (par exemple Brevo, offre gratuite de 300 e-mails par jour : voir `server/.env.example`), puis de
lancer `npm run mail:test`. Pour ne pas finir en indésirables, l'adresse `MAIL_FROM` doit être sur un domaine
vérifié chez le fournisseur.

## Fichiers déposés

Les CV sont stockés dans `server/uploads/` (ignoré par Git). À chaque candidature, une copie du CV est gardée
dans `server/uploads/candidatures/` : remplacer son CV ne modifie pas une candidature déjà envoyée.

## Score et badges

Le badge vient des règles de `server/src/utils/analysis.js`, le score de `server/src/utils/score.js`
(formation 30, niveau 20, compétences 30, ville 10, rythme 10). Les compétences sont comparées avec leurs
synonymes (`server/src/utils/skills.js` : « JS » = « JavaScript », « nodejs » = « Node.js »…), et les
abréviations de formation sont reconnues (« BUT info » = informatique).
