import mongoose from 'mongoose';
import { BADGES, CONTRATS, NIVEAUX, SIRET_STATUSES } from './constants.js';

const criteriaSchema = new mongoose.Schema(
  {
    formation: String,
    niveau: { type: String, enum: NIVEAUX },
    competences: [String],
    rythme: String,
  },
  { _id: false },
);

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    emitter: {
      name: { type: String, required: true, trim: true },
      siret: { type: String, trim: true },
    },
    ville: String,
    secteur: String,
    niveau: { type: String, enum: NIVEAUX },
    rythme: String,
    experienceRequise: String,
    description: String,

    // Fiche de poste (remplie par l'entreprise, avec l'aide de l'IA)
    contrat: { type: String, enum: CONTRATS },
    duree: String,
    missions: [String],
    profilRecherche: String,
    remuneration: String,

    // Le texte de l'annonce tel qu'il a été publié ou importé, avant toute mise en forme
    rawText: String,

    // Offre publiée par une entreprise inscrite sur ALTO
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    source: {
      name: { type: String, enum: ['demo', 'labonnealternance', 'partenaire', 'entreprise'], default: 'demo' },
      externalId: String,
      url: String,
    },

    // Rempli à l'arrivée de l'offre, par l'IA ou les règles simples en repli
    analysis: {
      status: { type: String, enum: ['en_attente', 'analysee', 'echec'], default: 'en_attente' },
      method: { type: String, enum: ['regles', 'ia'] },
      badge: { type: String, enum: BADGES },
      reason: String,
      criteria: criteriaSchema,
      // Les trois signes d'une fausse offre, et l'expérience exigée, tels que l'IA les a relevés
      signs: {
        ecole: Boolean,
        entrepriseNonNommee: Boolean,
        inscriptionObligatoire: Boolean,
        experienceExigee: Boolean,
      },
      model: String,
      error: String, // dernier échec, pour le recettage
      attempts: { type: Number, default: 0 },
      analyzedAt: Date,
    },

    // Contrôle Sirene : pas de badge « Vérifiée » tant que le SIRET n'est pas validé
    siretCheck: {
      status: { type: String, enum: SIRET_STATUSES, default: 'non_verifie' },
      checkedAt: Date,
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

offerSchema.index({ 'source.name': 1, 'source.externalId': 1 }, { unique: true, sparse: true });
offerSchema.index({ secteur: 1, ville: 1, niveau: 1 });
offerSchema.index({ company: 1, createdAt: -1 });

export const Offer = mongoose.model('Offer', offerSchema);
