// Each browser gets its own private list. The first visit creates a long
// random key and saves it in localStorage; every API request sends it.
// Anyone with the key has the list, so it is never shown on the page.
const STORAGE_KEY = 'tobe-list-key';
const VALID = /^[A-Za-z0-9_-]{32,128}$/;
let cached = null;

function generateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getListKey() {
  if (cached) return cached;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID.test(saved)) return (cached = saved);
  } catch {
    // Storage blocked (e.g. some private windows): the list lasts for this visit only.
  }
  cached = generateKey();
  try {
    localStorage.setItem(STORAGE_KEY, cached);
  } catch {
    // See above.
  }
  return cached;
}
