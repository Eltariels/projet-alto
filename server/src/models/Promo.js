import mongoose from 'mongoose';

const promoSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    inviteCode: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const Promo = mongoose.model('Promo', promoSchema);
