// Tiny confetti/spark bursts, drawn with plain DOM elements and CSS.
const COLORS = ['#38bdf8', '#0ea5e9', '#7dd3fc', '#fbbf24', '#f472b6', '#34d399', '#a78bfa'];
const KINDS = ['spark', 'flake', 'dot'];

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Bursts sparks and flakes outward from a point on the screen. */
export function burst(x, y, { count = 18, distance = 70, size = 1 } = {}) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;

  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const reach = distance * (0.6 + Math.random() * 0.6);
    piece.className = `burst-piece ${KINDS[i % KINDS.length]}`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * reach}px`);
    piece.style.setProperty('--angle', `${angle}rad`);
    piece.style.setProperty('--rot', `${Math.round(Math.random() * 540 - 270)}deg`);
    piece.style.setProperty('--delay', `${Math.round(Math.random() * 60)}ms`);
    piece.style.setProperty('--s', (size * (0.7 + Math.random() * 0.6)).toFixed(2));
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1200);
}

/** Bursts from the center of an element. */
export function burstFrom(element, options) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, options);
}
