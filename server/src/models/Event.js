import mongoose from 'mongoose';
import { EVENT_TYPES } from './constants.js';

// Chaque étape du parcours, datée, pour calculer la NSM (entretiens) et les KPI
const eventSchema = new mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'Promo' },
  meta: { type: Object },
  at: { type: Date, default: Date.now },
});

eventSchema.index({ type: 1, at: 1 });

export const Event = mongoose.model('Event', eventSchema);
