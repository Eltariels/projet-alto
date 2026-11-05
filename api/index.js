// Point d'entrée de l'API sur Vercel : une fonction serverless qui sert toutes les routes /api/*.
// En local, c'est server/src/index.js qui lance l'API (npm run dev).
//
// Les modules sont chargés à la première requête, dans un try/catch : si la configuration est incomplète
// (variable manquante, base injoignable), l'API répond un message clair au lieu de planter sans explication.

let app;

// Message lisible, sans jamais renvoyer de secret (adresse de base, mot de passe, clé)
function diagnose(err) {
  const msg = String(err?.message || '');
  if (msg.includes("Variable d'environnement manquante") || msg.includes('JWT_SECRET trop faible')) return msg;
  if (/bad auth|authentication failed/i.test(msg)) {
    return "MongoDB refuse l'identifiant ou le mot de passe de MONGO_URI : vérifie l'utilisateur et le mot de passe dans Atlas.";
  }
  if (/Invalid scheme|URI must include|Invalid connection string/i.test(msg)) {
    return 'MONGO_URI est mal formée : elle doit commencer par mongodb+srv:// (sans guillemets ni « MONGO_URI= » devant).';
  }
  if (err?.name === 'MongoServerSelectionError' || /querySrv|ENOTFOUND|timed out|Server selection/i.test(msg)) {
    return "Base MongoDB injoignable : dans Atlas, ajoute 0.0.0.0/0 à l'IP Access List, et vérifie l'adresse du cluster dans MONGO_URI.";
  }
  return `Erreur au démarrage de l'API (${err?.name || 'Error'}). Détails dans les logs Vercel.`;
}

export default async function handler(req, res) {
  try {
    if (!app) {
      const { createApp } = await import('../server/src/app.js');
      app = createApp();
    }
    const { connectDb } = await import('../server/src/config/db.js');
    await connectDb();
  } catch (err) {
    console.error('Démarrage de l’API impossible :', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: diagnose(err) }));
    return;
  }
  return app(req, res);
}
