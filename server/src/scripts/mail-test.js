// Vérifie la configuration SMTP en envoyant un e-mail de test.
// Usage : npm run mail:test -- prenom.nom@exemple.fr
import { env } from '../config/env.js';
import { mailTarget, sendMail } from '../utils/mailer.js';
import { testEmail } from '../utils/emails.js';

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+$/.test(to)) {
  console.error('Indique une adresse : npm run mail:test -- prenom.nom@exemple.fr');
  process.exit(1);
}

if (!env.smtpUrl) {
  console.error('SMTP_URL est vide dans server/.env : rien ne partirait. Voir server/.env.example.');
  process.exit(1);
}

try {
  await sendMail({ to, ...testEmail() });
  console.log(`E-mail de test envoyé à ${to} via ${mailTarget()}.`);
  if (env.smtpUrl.includes('localhost:1025')) console.log('Mailpit : ouvre http://localhost:8025 pour le lire.');
} catch (err) {
  console.error(`Échec de l'envoi via ${mailTarget()} : ${err.message}`);
  process.exit(1);
}
