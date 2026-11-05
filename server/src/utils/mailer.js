import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = env.smtpUrl ? nodemailer.createTransport(env.smtpUrl) : null;

// Dernier e-mail « envoyé » sans SMTP : utile aux tests automatiques
export let lastMail = null;

// Où partent les e-mails, sans afficher d'identifiants
export function mailTarget() {
  if (!transport) return 'console (SMTP_URL absent)';
  const { hostname, port } = new URL(env.smtpUrl);
  return `${hostname}:${port}`;
}

// Appelé au démarrage : signale tout de suite un SMTP mal configuré, sans empêcher l'API de tourner
export async function verifyMail() {
  if (!transport) return console.log('E-mails : affichés dans la console (SMTP_URL absent)');
  try {
    await transport.verify();
    console.log(`E-mails : SMTP prêt (${mailTarget()})`);
  } catch (err) {
    console.error(`E-mails : SMTP injoignable (${mailTarget()}) : ${err.message}`);
  }
}

export async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    lastMail = { to, subject, text, html };
    if (!env.isTest) console.log(`\n--- E-mail (non envoyé, SMTP_URL absent) ---\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n---\n`);
    return;
  }
  await transport.sendMail({ from: env.mailFrom, to, subject, text, html });
}
