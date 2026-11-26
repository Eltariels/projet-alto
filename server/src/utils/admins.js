import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from '../models/index.js';

// Donner ou retirer le rôle administrateur. Utilisé par la commande `npm run admin`.
// Un compte qui n'existe pas encore est créé avec un mot de passe aléatoire, renvoyé une seule fois.
export async function setAdmin(email, { remove = false } = {}) {
  const address = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error(`Adresse e-mail invalide : « ${email || ''} »`);
  const user = await User.findOne({ email: address });

  if (remove) {
    if (!user || user.role !== 'admin') return { status: 'pas_admin', email: address };
    user.role = 'etudiant';
    await user.save();
    return { status: 'retire', email: address };
  }

  if (!user) {
    const password = randomBytes(12).toString('base64url');
    await User.create({ email: address, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
    return { status: 'cree', email: address, password };
  }
  if (user.role === 'admin') return { status: 'deja_admin', email: address };
  // Un compte entreprise porte son entreprise et ses offres : il ne peut pas devenir administrateur
  if (user.role === 'entreprise') return { status: 'entreprise', email: address };
  user.role = 'admin';
  await user.save();
  return { status: 'promu', email: address };
}
