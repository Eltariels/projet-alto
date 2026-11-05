import mongoose from 'mongoose';
import { ROLES } from './constants.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'etudiant' },
    // Renseignés via le lien d'invitation de promo (mesure du coût par canal)
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    promo: { type: mongoose.Schema.Types.ObjectId, ref: 'Promo' },
    // Offres mises de côté par l'étudiant
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
    // Mot de passe oublié : on ne stocke que l'empreinte du jeton envoyé par e-mail
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, email: this.email, role: this.role, school: this.school, promo: this.promo };
};

export const User = mongoose.model('User', userSchema);
