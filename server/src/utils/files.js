import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fichiers déposés par les étudiants, hors du dépôt Git (voir .gitignore)
export const UPLOADS_DIR = fileURLToPath(new URL('../../uploads/', import.meta.url));
export const CV_DIR = path.join(UPLOADS_DIR, 'cv');
export const APPLICATION_CV_DIR = path.join(UPLOADS_DIR, 'candidatures');

export const CV_MAX_BYTES = 5 * 1024 * 1024;

await mkdir(CV_DIR, { recursive: true });
await mkdir(APPLICATION_CV_DIR, { recursive: true });

// Un vrai PDF commence par « %PDF- » : on ne se fie pas à l'extension ni au type annoncé
export const isPdf = (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

// Nom d'affichage sûr : on retire caractères de contrôle et séparateurs de chemin, on garde accents et ponctuation
export const safeName = (name) => name.replace(/[\x00-\x1f\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'cv.pdf';
