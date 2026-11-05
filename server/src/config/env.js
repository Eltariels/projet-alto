const required = ['MONGO_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variable d'environnement manquante : ${key} (voir server/.env.example)`);
  }
}

const isProd = process.env.NODE_ENV === 'production';

// En production, une clé JWT faible ou recopiée de l'exemple permettrait de fabriquer de fausses sessions
if (isProd && (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('change-moi'))) {
  throw new Error('JWT_SECRET trop faible pour la production : au moins 32 caractères aléatoires');
}

export const env = {
  // API_PORT d'abord : PORT est souvent déjà défini par l'outil qui lance le front
  port: Number(process.env.API_PORT || process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Envoi d'e-mails : sans SMTP_URL, les e-mails sont affichés dans la console (développement)
  smtpUrl: process.env.SMTP_URL || '',
  mailFrom: process.env.MAIL_FROM || 'ALTO <no-reply@alto.local>',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
};
