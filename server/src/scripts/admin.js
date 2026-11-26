// Donner ou retirer le rôle administrateur (accès au back-office /admin).
// Usage : npm run admin -- prenom.nom@exemple.fr            le compte devient administrateur
//                                                           (créé s'il n'existe pas : son mot de passe s'affiche une fois)
//         npm run admin -- prenom.nom@exemple.fr --retirer  le compte redevient un compte étudiant
// Sur la base en ligne : npm run admin:atlas -w server -- prenom.nom@exemple.fr  (MONGO_URI dans server/.env.atlas)
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { setAdmin } from '../utils/admins.js';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'));
const remove = args.includes('--retirer');

if (!email) {
  console.error('Indiquez une adresse e-mail : npm run admin -- prenom.nom@exemple.fr');
  process.exit(1);
}

await connectDb();
try {
  const r = await setAdmin(email, { remove });
  const messages = {
    cree: `Compte administrateur créé : ${r.email}\nMot de passe : ${r.password}\nIl ne s'affichera plus : notez-le, ou passez ensuite par « Mot de passe oublié ».`,
    promu: `${r.email} est maintenant administrateur. Reconnectez-vous pour ouvrir le back-office (/admin).`,
    deja_admin: `${r.email} est déjà administrateur.`,
    entreprise: `${r.email} est un compte entreprise : il ne peut pas devenir administrateur. Utilisez une autre adresse.`,
    retire: `${r.email} n'est plus administrateur (compte étudiant).`,
    pas_admin: `${r.email} n'est pas administrateur : rien à retirer.`,
  };
  console.log(messages[r.status]);
  if (r.status === 'entreprise') process.exitCode = 1;
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
await mongoose.disconnect();
