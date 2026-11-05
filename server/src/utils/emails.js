// Modèles d'e-mails : une version texte (lue par tous les clients) et une version HTML aux couleurs d'ALTO.
// Le HTML reste simple, en tableaux et styles en ligne : c'est ce que les messageries affichent de façon fiable.

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ title, intro, buttonLabel, buttonUrl, outro }) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f5eddd;font-family:Arial,Helvetica,sans-serif;color:#1c2333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5eddd;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf7ee;border:1px solid #dccaa6;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f1b33;padding:20px 28px;">
          <span style="font-family:Georgia,serif;font-size:20px;font-weight:bold;letter-spacing:5px;color:#ead08a;">ALTO</span>
        </td></tr>
        <tr><td style="height:3px;background:#c9a23a;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#0f1b33;">${escape(title)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1c2333;">${escape(intro)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#c9a23a;">
            <a href="${escape(buttonUrl)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:bold;color:#0f1b33;text-decoration:none;border-radius:8px;">${escape(buttonLabel)}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#545c6d;">Le bouton ne marche pas ? Copie ce lien dans ton navigateur :<br>
            <a href="${escape(buttonUrl)}" style="color:#2d5e90;word-break:break-all;">${escape(buttonUrl)}</a></p>
        </td></tr>
        <tr><td style="padding:24px 28px 28px;">
          <p style="margin:0;padding-top:16px;border-top:1px solid #dccaa6;font-size:13px;line-height:1.6;color:#545c6d;">${escape(outro)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#545c6d;">ALTO · L'alternance, sans les fausses annonces.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function resetPasswordEmail({ link }) {
  const intro = 'Tu as demandé à changer ton mot de passe ALTO. Clique sur le bouton pour en choisir un nouveau : le lien est valable une heure et ne sert qu’une fois.';
  const outro = "Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.";
  return {
    subject: 'Réinitialise ton mot de passe ALTO',
    text: `Bonjour,\n\n${intro}\n${link}\n\n${outro}`,
    html: layout({ title: 'Choisis un nouveau mot de passe', intro, buttonLabel: 'Choisir mon mot de passe', buttonUrl: link, outro }),
  };
}

export function testEmail() {
  const intro = "Si tu lis ce message, l'envoi d'e-mails d'ALTO est bien configuré.";
  return {
    subject: 'ALTO : e-mail de test',
    text: `${intro}`,
    html: layout({ title: 'Ça fonctionne', intro, buttonLabel: 'Ouvrir ALTO', buttonUrl: 'http://localhost:5173', outro: 'E-mail envoyé par npm run mail:test.' }),
  };
}
