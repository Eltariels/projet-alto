import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { User, Promo } from '../models/index.js';
import { AUTH_COOKIE, requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { trackEvent } from '../utils/events.js';
import { sendMail } from '../utils/mailer.js';
import { resetPasswordEmail } from '../utils/emails.js';
import { env } from '../config/env.js';
import { loginLimiter, registerLimiter, resetLimiter } from '../middleware/rateLimit.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(1),
});

// L'inscription publique crée toujours un compte étudiant
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, inviteCode } = registerSchema.parse(req.body);

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, 'Un compte existe déjà avec cet e-mail');
  }

  let promo = null;
  if (inviteCode) {
    promo = await Promo.findOne({ inviteCode });
    if (!promo) throw new HttpError(400, "Lien d'invitation invalide");
  }

  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'etudiant',
    school: promo?.school,
    promo: promo?._id,
  });

  await trackEvent('inscription', user, { channel: promo ? 'promo' : 'direct' });

  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: user.toPublic() });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  // Les e-mails sont enregistrés en minuscules : « Lea@… » doit retrouver « lea@… »
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'E-mail ou mot de passe incorrect');
  }
  setAuthCookie(res, signToken(user));
  res.json({ user: user.toPublic() });
});

router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw new HttpError(401, 'Compte introuvable');
  res.json({ user: user.toPublic() });
});

// --- Mot de passe oublié ---

const RESET_TTL_MS = 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

// Réponse identique que le compte existe ou non : on ne révèle pas quels e-mails sont inscrits
router.post('/forgot-password', resetLimiter, async (req, res) => {
  const { email } = z.object({ email: z.string().email('E-mail invalide') }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const token = randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const link = `${env.clientOrigin}/reinitialiser-mot-de-passe?token=${token}`;
    try {
      await sendMail({ to: user.email, ...resetPasswordEmail({ link }) });
    } catch (err) {
      // On garde la même réponse (sinon un échec révélerait que le compte existe) ; l'erreur est tracée côté serveur
      console.error(`E-mail de réinitialisation non envoyé à ${user.email} : ${err.message}`);
    }
  }

  res.json({ ok: true });
});

const resetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Lien invalide ou expiré'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password } = resetSchema.parse(req.body);
  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');
  if (!user) throw new HttpError(400, 'Ce lien est invalide ou a expiré. Refais une demande.');

  // Le jeton ne sert qu'une fois
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  setAuthCookie(res, signToken(user));
  res.json({ user: user.toPublic() });
});

export default router;
