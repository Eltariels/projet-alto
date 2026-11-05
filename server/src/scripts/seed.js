// Offres de démonstration, en attendant l'import La bonne alternance.
// Les entreprises sont fictives. Relancer le script remplace les offres « demo » existantes.
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Offer } from '../models/index.js';
import { analyzeOffer } from '../utils/analysis.js';

const R = {
  court: '2 j. école / 3 j. entreprise',
  semaine: '1 sem. école / 3 sem. entreprise',
  quinzaine: '2 sem. école / 2 sem. entreprise',
  mois: '1 mois / 1 mois',
};

const SIRET_OK = { status: 'valide' };

// criteria : ce que l'analyse extrait de l'annonce (formation, niveau, compétences, rythme)
const OFFERS = [
  {
    title: 'Développeur·se web junior',
    emitter: { name: 'Atelier Numérique', siret: 'demo-001' },
    ville: 'Lyon', secteur: 'Numérique', niveau: 'bac+3', rythme: R.semaine,
    experienceRequise: 'Aucune, une première expérience en projet scolaire suffit',
    description: "Au sein d'une équipe de 6 développeurs, tu participes à la refonte de notre plateforme de réservation : intégration d'écrans en React, petites API en Node.js, revues de code avec ton tuteur.",
    criteria: { formation: 'BUT Informatique, BTS SIO, Licence informatique', competences: ['React', 'JavaScript', 'Node.js'] },
  },
  {
    title: 'Développeur·se full-stack',
    emitter: { name: 'Hexa Logistique', siret: 'demo-002' },
    ville: 'Lyon', secteur: 'Numérique', niveau: 'bac+5', rythme: R.quinzaine,
    experienceRequise: 'Aucune',
    description: "Tu rejoins l'équipe produit qui développe nos outils de suivi de flotte. Stack : React, Node.js, PostgreSQL, Docker.",
    criteria: { formation: 'Master informatique, école d’ingénieur informatique', competences: ['React', 'Node.js', 'SQL', 'Docker'] },
  },
  {
    title: 'Technicien·ne support informatique',
    emitter: { name: 'Groupe Alpes Santé', siret: 'demo-003' },
    ville: 'Lyon', secteur: 'Numérique', niveau: 'bac+2', rythme: R.court,
    experienceRequise: 'Aucune',
    description: 'Tu assures le support de premier niveau pour 400 collaborateurs : installation de postes, gestion des tickets, documentation.',
    criteria: { formation: 'BTS SIO, BUT Réseaux et télécommunications', competences: ['Support utilisateur', 'Windows', 'Communication'] },
  },
  {
    title: 'Data analyst',
    emitter: { name: 'Banque Rhône Crédit', siret: 'demo-004' },
    ville: 'Paris', secteur: 'Finance', niveau: 'bac+5', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: 'Tu construis des tableaux de bord pour les équipes commerciales et automatises des analyses récurrentes.',
    criteria: { formation: 'Master data, Master informatique, école de commerce spécialité data', competences: ['Python', 'SQL', 'Power BI'] },
  },
  {
    title: 'Chargé·e de communication digitale',
    emitter: { name: 'Maison Verdier', siret: 'demo-005' },
    ville: 'Bordeaux', secteur: 'Marketing', niveau: 'bac+3', rythme: R.court,
    experienceRequise: 'Aucune',
    description: 'Tu animes nos réseaux sociaux, rédiges la newsletter mensuelle et participes au lancement de notre nouvelle gamme.',
    criteria: { formation: 'BUT Information-communication, Licence communication, Bachelor marketing', competences: ['Communication', 'Marketing digital', 'Canva'] },
  },
  {
    title: 'Assistant·e marketing produit',
    emitter: { name: 'Sportiva France', siret: 'demo-006' },
    ville: 'Lille', secteur: 'Marketing', niveau: 'bac+4', rythme: R.mois,
    experienceRequise: 'Aucune',
    description: 'Tu accompagnes les chefs de produit dans les études de marché, la veille concurrentielle et la préparation des lancements.',
    criteria: { formation: 'Bachelor marketing, Master marketing, école de commerce', competences: ['Marketing digital', 'Excel', 'Anglais'] },
  },
  {
    title: 'Commercial·e sédentaire',
    emitter: { name: 'Bureau Pro Équipement', siret: 'demo-007' },
    ville: 'Nantes', secteur: 'Commerce', niveau: 'bac+2', rythme: R.court,
    experienceRequise: 'Aucune',
    description: 'Tu gères un portefeuille de clients professionnels par téléphone et e-mail, de la prise de besoin au suivi de commande.',
    criteria: { formation: 'BTS NDRC, BTS MCO, BUT Techniques de commercialisation', competences: ['Relation client', 'Vente', 'Communication'] },
  },
  {
    title: 'Conseiller·ère de vente en magasin',
    emitter: { name: 'Librairie des Quais', siret: 'demo-008' },
    ville: 'Bordeaux', secteur: 'Commerce', niveau: 'bac+2', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: "Tu conseilles les clients, participes à la mise en rayon et à l'organisation d'événements en boutique.",
    criteria: { formation: 'BTS MCO, BTS NDRC', competences: ['Relation client', 'Vente'] },
  },
  {
    title: 'Business developer',
    emitter: { name: 'Cleanwave', siret: 'demo-009' },
    ville: 'Paris', secteur: 'Commerce', niveau: 'bac+5', rythme: R.quinzaine,
    experienceRequise: "3 ans d'expérience en prospection B2B",
    description: 'Tu développes notre portefeuille de grands comptes en autonomie complète et pilotes ton propre chiffre d’affaires.',
    criteria: { formation: 'École de commerce, Master commerce', competences: ['Vente', 'Négociation', 'Anglais'] },
  },
  {
    title: 'Assistant·e comptable',
    emitter: { name: 'Cabinet Fournier & Associés', siret: 'demo-010' },
    ville: 'Toulouse', secteur: 'Gestion', niveau: 'bac+2', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: 'Tu participes à la tenue comptable de TPE clientes : saisie, rapprochements bancaires, préparation des déclarations de TVA.',
    criteria: { formation: 'BTS Comptabilité et gestion, BUT GEA', competences: ['Excel', 'Comptabilité'] },
  },
  {
    title: 'Contrôleur·se de gestion',
    emitter: { name: 'Groupe Alpes Santé', siret: 'demo-003' },
    ville: 'Lyon', secteur: 'Gestion', niveau: 'bac+5', rythme: R.quinzaine,
    experienceRequise: 'Expérience confirmée en contrôle de gestion',
    description: "Tu prends en charge seul·e le contrôle de gestion de trois établissements et présentes les résultats au comité de direction.",
    criteria: { formation: 'Master contrôle de gestion, école de commerce', competences: ['Excel', 'Contrôle de gestion', 'Power BI'] },
  },
  {
    title: 'Chargé·e de recrutement',
    emitter: { name: 'Talentis RH', siret: 'demo-011' },
    ville: 'Lille', secteur: 'Ressources humaines', niveau: 'bac+3', rythme: R.court,
    experienceRequise: 'Aucune',
    description: 'Tu rédiges les annonces, fais le tri des candidatures et mènes des entretiens de pré-qualification par téléphone.',
    criteria: { formation: 'Licence ressources humaines, BUT GEA, Bachelor RH', competences: ['Communication', 'Recrutement', 'Excel'] },
  },
  {
    title: 'Technicien·ne de maintenance industrielle',
    emitter: { name: 'Métallerie du Sud-Ouest', siret: 'demo-012' },
    ville: 'Toulouse', secteur: 'Industrie', niveau: 'bac+2', rythme: R.mois,
    experienceRequise: 'Aucune',
    description: 'Tu assures la maintenance préventive et corrective de nos lignes de production, aux côtés de techniciens expérimentés.',
    criteria: { formation: 'BTS Maintenance des systèmes, BUT Génie industriel et maintenance', competences: ['Électrotechnique', 'Mécanique'] },
  },
  {
    title: 'Développeur·se mobile',
    emitter: { name: 'Pixelfield', siret: 'demo-013' },
    ville: 'Marseille', secteur: 'Numérique', niveau: 'bac+4', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: "Tu participes au développement de nos applications iOS et Android en React Native, de la maquette à la publication.",
    criteria: { formation: 'Master informatique, Bachelor développement, BUT Informatique', competences: ['React', 'JavaScript', 'React Native'] },
  },
  {
    title: 'Ingénieur·e DevOps',
    emitter: { name: 'Nuage Souverain', siret: 'demo-014' },
    ville: 'Nantes', secteur: 'Numérique', niveau: 'bac+5', rythme: R.quinzaine,
    experienceRequise: "Profil senior, 5 ans d'expérience sur Kubernetes",
    description: 'Tu conçois et opères seul·e notre infrastructure Kubernetes multi-région.',
    criteria: { formation: 'Master informatique, école d’ingénieur', competences: ['Docker', 'Kubernetes', 'Linux'] },
  },
  {
    title: 'Assistant·e e-commerce',
    emitter: { name: 'Boutique Lumen', siret: null },
    ville: 'Paris', secteur: 'Commerce', niveau: 'bac+3', rythme: R.court,
    experienceRequise: 'Aucune',
    description: 'Poste en télétravail total, contact uniquement par WhatsApp. Des frais de dossier de 90 € sont demandés pour valider ta candidature.',
    criteria: { formation: 'Bachelor e-commerce, BUT Techniques de commercialisation', competences: ['Marketing digital', 'Relation client'] },
  },
  {
    title: "« Alternance » développeur web",
    emitter: { name: 'StartFast Academy', siret: null },
    ville: 'Lyon', secteur: 'Numérique', niveau: 'bac+3', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: "Mission en autonomie sur des sites clients. Poste non rémunéré pendant les trois premiers mois, puis selon résultats.",
    criteria: { formation: 'BUT Informatique, BTS SIO', competences: ['JavaScript', 'React'] },
  },
  {
    title: 'Chef·fe de projet digital junior',
    emitter: { name: 'Agence Boréale', siret: 'demo-015' },
    ville: 'Lyon', secteur: 'Marketing', niveau: 'bac+4', rythme: R.semaine,
    experienceRequise: 'Aucune',
    description: 'Tu coordonnes la production de sites et de campagnes pour nos clients, entre les équipes design, développement et le client.',
    criteria: { formation: 'Master communication digitale, Bachelor web, école de commerce', competences: ['Gestion de projet', 'Communication', 'Marketing digital'] },
  },
];

await connectDb();

const { deletedCount } = await Offer.deleteMany({ 'source.name': 'demo' });

const docs = OFFERS.map(({ criteria, ...o }, i) => {
  const offer = {
    ...o,
    source: { name: 'demo', externalId: `demo-${String(i + 1).padStart(3, '0')}` },
    siretCheck: o.emitter.siret ? { ...SIRET_OK, checkedAt: new Date() } : { status: 'non_verifie' },
    // Dates étalées sur les deux dernières semaines
    createdAt: new Date(Date.now() - i * 19 * 60 * 60 * 1000),
  };
  const { badge, reason } = analyzeOffer(offer);
  offer.analysis = {
    status: 'analysee',
    method: 'regles',
    badge,
    reason,
    criteria: { ...criteria, niveau: o.niveau, rythme: o.rythme },
    analyzedAt: new Date(),
  };
  return offer;
});

const inserted = await Offer.insertMany(docs);
const byBadge = inserted.reduce((acc, o) => ({ ...acc, [o.analysis.badge]: (acc[o.analysis.badge] || 0) + 1 }), {});

console.log(`${deletedCount} offres démo supprimées, ${inserted.length} créées`, byBadge);
await mongoose.disconnect();
