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

Pour l'IA (mise en forme et vérification des offres), ajouter `ANTHROPIC_API_KEY=…` dans `server/.env` : sans clé,
tout fonctionne, mais les offres publiées par les entreprises restent « Analyse en attente ».

Le front proxifie `/api` vers l'API : ouvrir http://localhost:5173.

## Commandes utiles

| Commande          | Rôle |
|-------------------|------|
| `npm test`        | Tests de l'API (base `alto_test` dédiée, MongoDB doit tourner) |
| `npm run kpi`     | North Star et 3 KPI semaine par semaine (`npm run kpi -- 12` pour 12 semaines) |
| `npm run db:seed` | Recrée les offres de démonstration |
| `npm run mail:test -- adresse` | Envoie un e-mail de test |
| `npm run build`   | Build du front |
| `npm run ia:essai` | Essai réel de l'IA sur six annonces types (quiz A et B, nos trois signes…) : badge obtenu, durée, coût |
| `npm run ia:bilan` | Bilan du journal de l'IA pour le recettage : appels, échecs, coût, offres « Analyse en attente » (`-- 7` pour 7 jours) |
| `npm run admin -- adresse` | Donne le rôle administrateur (back-office `/admin`) ; crée le compte s'il n'existe pas et affiche son mot de passe une fois ; `--retirer` pour l'enlever |

## Organisation

```
client/            React + Vite + Tailwind
  src/pages/       un fichier par écran (accueil, connexion, inscription, mot de passe oublié,
                   réinitialisation, profil, offres, détail, candidatures, 404)
  src/pages/company/  l'espace entreprise : inscription, mes offres, publier une offre, offre et candidats
  src/pages/admin/    le back-office : tableau de bord (visites, inscriptions, liens de promo)
  src/lib/api.js   appels à l'API (cookie JWT inclus)
server/            Express + Mongoose
  src/models/      users, profiles, offers, applications, schools, promos, events, companies, airuns
  src/routes/      health, auth, profile, offers, applications, company (espace entreprise), admin (back-office)
  src/ai/          offerAi (les deux appels à Claude), review (du verdict de l'IA au badge)
  src/middleware/  requireAuth, requireRole, limitation des tentatives, gestion d'erreurs
  src/utils/       score (+ synonymes de compétences), analyse des offres, e-mails, fichiers, sirene (SIRET)
  src/scripts/     seed (offres de démo), kpi, ia-essai, ia-bilan, admin
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
| POST/GET/DELETE | `/api/profile/cv` | connecté (CV PDF, 4 Mo max, champ `cv`) |
| GET     | `/api/offers`        | connecté (`q`, `secteur`, `ville`, `niveau`, `rythme`, `tri=score\|date`, `favoris=1`, `page`) |
| GET     | `/api/offers/:id`    | connecté (score détaillé + 3 offres proches) |
| PUT/DELETE | `/api/offers/:id/favori` | connecté |
| POST    | `/api/applications`  | étudiant (`offerId`, profil complet requis) |
| GET     | `/api/applications`  | étudiant |
| PATCH   | `/api/applications/:id` | étudiant (`status` : envoyee, vue, entretien, refusee, acceptee, retiree ; et/ou `note`) |
| POST    | `/api/entreprise/inscription` | public (`companyName`, `siret`, `email`, `password` ; SIRET contrôlé dans l'annuaire des entreprises) |
| GET     | `/api/entreprise/moi` | entreprise (l'entreprise et son contrôle SIRET, `ai` : IA disponible ou non) |
| POST    | `/api/entreprise/offres/mise-en-forme` | entreprise (`texte` : l'annonce brute → fiche remplie par l'IA, rien n'est enregistré) |
| POST/GET | `/api/entreprise/offres` | entreprise (publier : fiche + `texte`, puis vérification par l'IA ; lister ses offres et leurs candidats) |
| GET/PATCH | `/api/entreprise/offres/:id` | entreprise (l'offre et ses candidats ; `active` pour clôturer ou rouvrir) |
| POST    | `/api/entreprise/offres/:id/analyse` | entreprise (relancer la vérification d'une offre « Analyse en attente ») |
| GET/PATCH | `/api/entreprise/candidatures/:id` | entreprise (ouvrir une candidature la marque « vue » ; `status` : entretien, refusee, acceptee) |
| GET     | `/api/entreprise/candidatures/:id/cv` | entreprise (le CV joint à la candidature) |
| GET     | `/api/admin/stats` | administrateur (visites, inscriptions par jour, étudiants par lien de promo, entreprises) |

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

Les CV (PDF, 4 Mo max) sont stockés **dans MongoDB** (GridFS, collections `cv.files` et `cv.chunks`), pas sur le
disque : ça marche aussi sur un hébergement sans disque durable comme Vercel. À chaque candidature, une copie
indépendante du CV est gardée : remplacer son CV ne modifie pas une candidature déjà envoyée.

## Déployer sur Vercel

Le dépôt est prêt : `vercel.json` construit le front (`client/dist`) et `api/index.js` sert toute l'API
`/api/*` sous forme de fonction serverless, sur le même domaine que le site (le cookie de session marche sans
réglage CORS).

1. **Base de données** : créer un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/atlas)
   (offre M0), un utilisateur de base, et autoriser l'accès réseau depuis `0.0.0.0/0` (Vercel n'a pas d'IP fixe).
   Récupérer l'URI `mongodb+srv://…` en ajoutant le nom de base `/alto`.
2. **Vercel** : *Add New → Project*, importer le dépôt GitHub, garder les réglages proposés (ils viennent de
   `vercel.json`).
3. **Variables d'environnement** (*Settings → Environment Variables*) :

   | Variable | Valeur |
   |---|---|
   | `MONGO_URI` | l'URI Atlas |
   | `JWT_SECRET` | 64 caractères aléatoires : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `NODE_ENV` | `production` |
   | `SMTP_URL`, `MAIL_FROM` | ceux du fournisseur d'e-mails (Brevo…), sinon les e-mails ne partent pas |
   | `CLIENT_ORIGIN` | facultatif : l'adresse du site si vous utilisez un domaine personnalisé |
   | `ANTHROPIC_API_KEY` | la clé d'API Claude (console.anthropic.com), sinon les offres restent « Analyse en attente » |
   | `ALTO_AI_MODEL` | facultatif : `claude-opus-5-5` par défaut, `claude-haiku-5-5` pour un coût environ 40 fois moindre |

4. **Offres de démonstration** : mettre l'adresse Atlas dans `server/.env.atlas` (ligne `MONGO_URI=…`, fichier
   ignoré par Git), puis lancer une fois `npm run seed:atlas -w server`.
5. *Deploy*. Chaque `git push` sur `main` redéploie ensuite automatiquement.

Limites connues sur Vercel : le compteur de tentatives de connexion est propre à chaque instance de la fonction
(protection réelle mais approximative), et une requête ne peut pas dépasser 4,5 Mo (d'où la limite de 4 Mo
pour les CV).

## Score et badges

Le badge vient des règles de `server/src/utils/analysis.js`, le score de `server/src/utils/score.js`
(formation 30, niveau 20, compétences 30, ville 10, rythme 10). Les compétences sont comparées avec leurs
synonymes (`server/src/utils/skills.js` : « JS » = « JavaScript », « nodejs » = « Node.js »…), et les
abréviations de formation sont reconnues (« BUT info » = informatique).

## Espace entreprise

Une entreprise crée son espace avec son SIRET (`/entreprise/inscription`). Le SIRET est contrôlé dans l'annuaire des
entreprises de l'État (API publique `recherche-entreprises.api.gouv.fr`, données INSEE, sans clé) : un SIRET inconnu ou
fermé est refusé ; si l'annuaire ne répond pas, l'inscription passe et le contrôle est refait avant chaque publication.
Un SIRET n'ouvre qu'un espace, pour qu'on ne puisse pas rejoindre une entreprise et voir ses candidats.

Publier une offre se fait en trois temps : l'entreprise colle son annonce telle qu'elle l'a rédigée, l'IA en fait une
fiche (champs manquants signalés), l'entreprise relit puis publie ; la vérification donne alors le badge. Elle peut aussi
remplir la fiche sans l'IA. Sur la page de l'offre, elle voit ses candidats classés par score ; ouvrir une candidature
la marque « Vue » et montre les coordonnées et le CV ; « Proposer un entretien », « Recruter » et « Refuser » apparaissent
dans le suivi de l'étudiant (« par l'entreprise »), et un entretien compte dans la North Star.

Limite connue du prototype : rien ne prouve encore que la personne qui s'inscrit travaille dans l'entreprise du SIRET.

## IA (Claude)

À l'arrivée de chaque offre, deux appels à Claude, l'un après l'autre (`server/src/ai/offerAi.js`) :

1. **Mise en forme** : à partir du texte brut de l'annonce, des champs propres (titre, entreprise, ville, contrat et
   durée, rythme, niveau, missions, profil, formation, compétences, expérience, rémunération) et la liste des manquants.
2. **Vérification** : le verdict (« verifiee », « suspecte », « experience_exigee » ou « indetermine »), les trois signes
   (publiée par une école, entreprise non nommée, inscription obligatoire), l'expérience exigée et la raison.

L'IA reçoit le texte de l'annonce, le nom de l'émetteur et ce que l'annuaire dit de son SIRET (actif ou non, activité :
un code NAF en 85 signale l'enseignement) ; la vérification reçoit en plus la fiche. Les réponses sont du JSON contraint
par un schéma (structured outputs), validé par zod. `server/src/ai/review.js` en tire le badge avec deux garde-fous :
un signe de fausse offre l'emporte toujours, et « Vérifiée » exige un SIRET contrôlé.

Si l'appel échoue (annonce trop vague, service injoignable, délai dépassé, format invalide, refus), l'offre garde son
texte et le badge « Analyse en attente », jamais « Vérifiée » par défaut ; l'entreprise peut relancer la vérification.
Chaque appel est noté dans la collection `airuns` (durée, jetons, résultat ou erreur) : `npm run ia:bilan` en fait le
bilan pour le recettage du 15 décembre, et `npm run ia:essai` mesure la qualité et le coût sur six annonces types.

Le modèle se choisit avec `ALTO_AI_MODEL` (Claude Opus 5.5 par défaut). Un appel fait pendant une requête est coupé à
45 s, sous la limite de 60 s des fonctions Vercel (`vercel.json`). Chaque compte entreprise est limité à 40 appels par heure.

## Back-office (administrateurs)

`/admin` est réservé aux comptes administrateurs. Le tableau de bord montre les visites (total, et jour par jour depuis
la mise en place de ce suivi), les inscriptions des 30 derniers jours (étudiants et entreprises), les étudiants par
lien de promo avec leurs profils complétés (le relevé par code du protocole de test) et les entreprises (SIRET vérifiés,
offres en ligne). Le rôle est relu en base à chaque requête : le donner ou le retirer prend effet tout de suite.

Créer un administrateur en local : `npm run admin -- prenom.nom@exemple.fr`. Sur la base en ligne : mettre l'URI Atlas
dans `server/.env.atlas` (ligne `MONGO_URI=…`, fichier ignoré par Git), puis
`npm run admin:atlas -w server -- prenom.nom@exemple.fr`. Un compte entreprise ne peut pas devenir administrateur.
