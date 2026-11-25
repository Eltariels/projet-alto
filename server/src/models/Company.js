import mongoose from 'mongoose';
import { SIRET_STATUSES } from './constants.js';

// L'entreprise qui recrute : son compte « entreprise » et ses offres y sont rattachés
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    siret: { type: String, required: true, unique: true, match: /^\d{14}$/ },
    // Contrôle dans l'annuaire des entreprises (données INSEE) : sans lui, pas de badge « Vérifiée »
    siretCheck: {
      status: { type: String, enum: SIRET_STATUSES, default: 'non_verifie' },
      officialName: String,
      city: String,
      activity: String, // code NAF : 85.xx = enseignement, un indice d'offre d'école
      checkedAt: Date,
    },
  },
  { timestamps: true },
);

export const Company = mongoose.model('Company', companySchema);
