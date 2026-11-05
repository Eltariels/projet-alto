import mongoose from 'mongoose';

// Les CV sont stockés dans MongoDB (GridFS), pas sur le disque : les hébergeurs « serverless » comme Vercel
// n'ont pas de disque durable, et la base reste la seule chose à sauvegarder.

// 4 Mo : Vercel refuse les requêtes de plus de 4,5 Mo
export const CV_MAX_BYTES = 4 * 1024 * 1024;

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'cv' });

// Un vrai PDF commence par « %PDF- » : on ne se fie pas à l'extension ni au type annoncé
export const isPdf = (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

// Nom d'affichage sûr : on retire caractères de contrôle et séparateurs de chemin, on garde accents et ponctuation
export const safeName = (name) => name.replace(/[\x00-\x1f\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'cv.pdf';

export function saveFile(buffer, filename, metadata = {}) {
  return new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, { metadata: { contentType: 'application/pdf', ...metadata } });
    upload.on('error', reject).on('finish', () => resolve(upload.id));
    upload.end(buffer);
  });
}

export async function readFile(id) {
  const chunks = [];
  for await (const chunk of bucket().openDownloadStream(new mongoose.Types.ObjectId(id))) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export const openFile = (id) => bucket().openDownloadStream(new mongoose.Types.ObjectId(id));

export async function deleteFile(id) {
  if (!id) return;
  await bucket()
    .delete(new mongoose.Types.ObjectId(id))
    .catch(() => {}); // déjà supprimé : rien à faire
}

// Copie indépendante (pour figer le CV d'une candidature)
export async function copyFile(id, filename, metadata) {
  return saveFile(await readFile(id), filename, metadata);
}
