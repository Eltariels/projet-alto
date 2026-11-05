import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: String,
  },
  { timestamps: true },
);

export const School = mongoose.model('School', schoolSchema);
