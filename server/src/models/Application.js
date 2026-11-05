import mongoose from 'mongoose';
import { APPLICATION_STATUSES } from './constants.js';

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'envoyee' },
    score: { type: Number, min: 0, max: 100 },
    // Copie du profil au moment de l'envoi : la candidature ne change pas si le profil évolue
    profileSnapshot: { type: Object },
    reminderSentAt: Date,
    // Note personnelle de l'étudiant (relance, date d'entretien…), jamais envoyée à l'entreprise
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    // Chaque changement de statut, daté : sert au suivi et aux KPI
    history: [
      {
        _id: false,
        status: { type: String, enum: APPLICATION_STATUSES, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

applicationSchema.index({ user: 1, offer: 1 }, { unique: true });

export const Application = mongoose.model('Application', applicationSchema);
