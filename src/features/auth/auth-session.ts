let accessToken: string | null = null;
const sessionExpiryListeners = new Set<() => void>();

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function subscribeToSessionExpiry(listener: () => void): () => void {
  sessionExpiryListeners.add(listener);
  return () => sessionExpiryListeners.delete(listener);
}

export function expireSession(): void {
  clearAccessToken();
  for (const listener of sessionExpiryListeners) listener();
}
