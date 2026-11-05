import mongoose from 'mongoose';
import { BADGES, NIVEAUX } from './constants.js';

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

    source: {
      name: { type: String, enum: ['demo', 'labonnealternance', 'partenaire'], default: 'demo' },
      externalId: String,
      url: String,
    },

    // Rempli une seule fois par offre, par la tâche planifiée (IA) ou les règles simples en repli
    analysis: {
      status: { type: String, enum: ['en_attente', 'analysee', 'echec'], default: 'en_attente' },
      method: { type: String, enum: ['regles', 'ia'] },
      badge: { type: String, enum: BADGES },
      reason: String,
      criteria: criteriaSchema,
      analyzedAt: Date,
    },

    // Contrôle Sirene : pas de badge « Vérifiée » tant que le SIRET n'est pas validé
    siretCheck: {
      status: { type: String, enum: ['non_verifie', 'valide', 'invalide'], default: 'non_verifie' },
      checkedAt: Date,
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

offerSchema.index({ 'source.name': 1, 'source.externalId': 1 }, { unique: true, sparse: true });
offerSchema.index({ secteur: 1, ville: 1, niveau: 1 });

export const Offer = mongoose.model('Offer', offerSchema);
