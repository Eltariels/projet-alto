export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Session expirée en cours de navigation : le contexte d'authentification écoute cet événement
export const SESSION_EXPIRED = 'alto:session-expired';

async function request(method, path, body) {
  // Un FormData (fichier) part tel quel : le navigateur pose lui-même l'en-tête multipart
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body && !isForm ? JSON.stringify(body) : body,
    });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event(SESSION_EXPIRED));
    const message = res.status >= 500 && !data.error ? 'Le serveur a rencontré un problème. Réessaie dans un instant.' : data.error;
    throw new ApiError(res.status, message || 'Une erreur est survenue', data.details);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
