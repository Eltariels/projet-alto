import mongoose from 'mongoose';
import { NIVEAUX } from './constants.js';

const cvSchema = new mongoose.Schema(
  {
    storedName: { type: String, required: true }, // nom du fichier sur le disque
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Critères du score de compatibilité
    formation: { type: String, trim: true },
    niveau: { type: String, enum: NIVEAUX },
    competences: [{ type: String, trim: true }],
    ville: { type: String, trim: true },
    rythme: { type: String, trim: true }, // ex. « 3 sem. entreprise / 1 sem. école »

    // Parcours
    formationPrecedente: { type: String, trim: true },
    diplomeObtenu: { type: String, trim: true },

    // Coordonnées, envoyées avec les candidatures
    telephone: { type: String, trim: true },
    adresse: { type: String, trim: true },

    // CV : un PDF à imprimer et/ou un lien vers un CV en ligne
    cv: { type: cvSchema, default: null },
    cvWebUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Profile = mongoose.model('Profile', profileSchema);
