/**
 * Minimal API client. Prefixes VITE_API_BASE_URL (default `/api`, served
 * through the Vite dev proxy → the existing Express backend on :4000).
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiGet(path, params) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    const err = new Error('Network error — is the backend running?');
    err.cause = e;
    throw err;
  }

  return handle(res);
}

/**
 * apiSend('PATCH', '/interventions/:id', { status: 'in_progress' })
 * For the small number of write endpoints (intervention approve / dismiss /
 * reassign). Same error shape as apiGet.
 */
export async function apiSend(method, path, body) {
  let res;
  try {
    res = await fetch(new URL(`${BASE}${path}`, window.location.origin), {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err = new Error('Network error — is the backend running?');
    err.cause = e;
    throw err;
  }
  return handle(res);
}

async function handle(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const b = await res.json();
      if (b && b.error) message = b.error;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
