import mongoose from 'mongoose';

// Journal des appels à l'IA : durée, coût en jetons et échecs, relus au recettage du 15 décembre
const aiRunSchema = new mongoose.Schema({
  step: { type: String, enum: ['mise_en_forme', 'verification'], required: true },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  model: String,
  ok: { type: Boolean, required: true },
  error: String,
  durationMs: Number,
  inputTokens: Number,
  outputTokens: Number,
  // Ce que l'IA a renvoyé (fiche ou verdict) : on relit les cas ratés sans relancer l'appel
  result: Object,
  at: { type: Date, default: Date.now },
});

aiRunSchema.index({ at: -1 });

export const AiRun = mongoose.model('AiRun', aiRunSchema);
