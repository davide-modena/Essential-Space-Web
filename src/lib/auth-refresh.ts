import type { NothingUser } from '@/types';
import { getDbAuth, saveDbAuth } from './db';

/** Refresh this long before the access token actually expires. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Reads `exp` from a JWT access token (ms). Null if not a JWT or no exp. */
function getTokenExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

let inflight: Promise<NothingUser | null> | null = null;

/**
 * Gets a new access token with the stored refresh token and saves it.
 * Returns null when the refresh token itself is no longer valid.
 * Concurrent callers share one request.
 */
export function refreshDbAuth(): Promise<NothingUser | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    const user = await getDbAuth();
    if (!user?.refreshToken) return null;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', refreshToken: user.refreshToken }),
    });
    if (res.status === 401 || res.status === 400) return null;
    if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
    const data = await res.json();
    if (!data?.token) return null;
    const updated: NothingUser = {
      ...user,
      token: data.token,
      refreshToken: data.refreshToken || user.refreshToken,
    };
    await saveDbAuth(updated);
    return updated;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Returns the stored user with a valid access token, refreshing it first
 * if it is about to expire. Network errors keep the current token.
 */
export async function getFreshDbAuth(): Promise<NothingUser | null> {
  const user = await getDbAuth();
  if (!user?.token) return user;
  const exp = getTokenExpiry(user.token);
  if (exp !== null && exp - Date.now() < REFRESH_MARGIN_MS && user.refreshToken) {
    try {
      return (await refreshDbAuth()) ?? user;
    } catch {
      return user;
    }
  }
  return user;
}
