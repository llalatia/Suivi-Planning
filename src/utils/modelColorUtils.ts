import React from 'react';

export interface ModelColorOption {
  hex: string;
  name: string;
  category: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'amber' | 'pink';
}

export const MODEL_COLOR_PALETTE: ModelColorOption[] = [
  { hex: '#2563EB', name: 'Bleu Royal', category: 'blue' },
  { hex: '#0D9488', name: 'Sarcelle Émeraude', category: 'teal' },
  { hex: '#7C3AED', name: 'Violet Intense', category: 'purple' },
  { hex: '#EA580C', name: 'Orange Mandarine', category: 'orange' },
  { hex: '#DB2777', name: 'Rose Framboise', category: 'pink' },
  { hex: '#059669', name: 'Vert Forêt', category: 'green' },
  { hex: '#0284C7', name: 'Bleu Ciel Foncé', category: 'blue' },
  { hex: '#D97706', name: 'Ambre Doré', category: 'amber' },
  { hex: '#4F46E5', name: 'Indigo Profond', category: 'blue' },
  { hex: '#E11D48', name: 'Rouge Carmin', category: 'red' },
  { hex: '#9333EA', name: 'Pourpre', category: 'purple' },
  { hex: '#16A34A', name: 'Vert Prairie', category: 'green' },
  { hex: '#C026D3', name: 'Fuchsia Vif', category: 'pink' },
  { hex: '#0891B2', name: 'Cyan Océan', category: 'teal' },
  { hex: '#CA8A04', name: 'Ocre Jaune', category: 'amber' },
  { hex: '#475569', name: 'Ardoise Métal', category: 'blue' },
];

export function normalizeModelKey(name: string): string {
  if (!name) return '';
  return name.trim().toUpperCase();
}

/**
 * Deterministically generates a distinct color from the palette for any model name.
 */
export function getDefaultModelColor(modelName: string): string {
  if (!modelName) return MODEL_COLOR_PALETTE[0].hex;
  const key = normalizeModelKey(modelName);

  // Hash code
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MODEL_COLOR_PALETTE.length;
  return MODEL_COLOR_PALETTE[index].hex;
}

/**
 * Returns the effective color for a given model, respecting manual assignments.
 */
export function getModelColor(
  modelName: string,
  modelColors?: Record<string, string>,
  jobColor?: string
): string {
  if (jobColor && jobColor.startsWith('#')) return jobColor;
  if (!modelName) return MODEL_COLOR_PALETTE[0].hex;

  const normKey = normalizeModelKey(modelName);
  if (modelColors && modelColors[normKey]) {
    return modelColors[normKey];
  }

  // Check partial key matches
  if (modelColors) {
    for (const [k, c] of Object.entries(modelColors)) {
      if (k === normKey || normKey.includes(k) || k.includes(normKey)) {
        return c;
      }
    }
  }

  return getDefaultModelColor(modelName);
}

/**
 * Helper to produce a transparent hex (alpha) or CSS color.
 */
export function hexToRgba(hex: string, alpha: number = 0.15): string {
  if (!hex || !hex.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
  let c = hex.slice(1);
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(100, 116, 139, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
