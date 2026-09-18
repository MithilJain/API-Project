/**
 * Central color system for verdicts, error types, and verification engines.
 * Fixed-order categorical hues (never cycled/reassigned) so the same entity
 * always renders the same color across every chart and badge in the app.
 */
import type { ErrorType, Verdict } from './api';

// Fixed-order categorical palette (blue, orange, aqua, yellow, magenta, ...)
export const ERROR_TYPE_COLORS: Record<Exclude<ErrorType, 'none'>, string> = {
  numerical_mismatch: '#2a78d6', // blue
  entity_mismatch: '#eb6834', // orange
  temporal_mismatch: '#1baf7a', // aqua
  formatting_mismatch: '#eda100', // yellow
  contradiction: '#4a3aa7', // violet
  unverifiable: '#e87ba4', // magenta
};

export const ERROR_TYPE_LABELS: Record<Exclude<ErrorType, 'none'>, string> = {
  numerical_mismatch: 'Numerical',
  entity_mismatch: 'Entity',
  temporal_mismatch: 'Temporal',
  formatting_mismatch: 'Formatting',
  contradiction: 'Contradiction',
  unverifiable: 'Unverifiable',
};

// Ordered list so charts iterate in a stable sequence
export const ERROR_TYPE_ORDER: Exclude<ErrorType, 'none'>[] = [
  'numerical_mismatch',
  'entity_mismatch',
  'temporal_mismatch',
  'formatting_mismatch',
  'contradiction',
  'unverifiable',
];

// Status palette for verdicts (fixed, never themed)
export const VERDICT_COLORS: Record<Verdict, { hex: string; bg: string; text: string; border: string }> = {
  Supported: {
    hex: '#0ca30c',
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-900',
  },
  Contradicted: {
    hex: '#d03b3b',
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-900',
  },
  Abstain: {
    hex: '#fab219',
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900',
  },
};

export const ENGINE_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  rule_based_fallback: 'Rule-based fallback',
  mixed: 'Mixed',
  unknown: 'Unknown',
};

export const ENGINE_COLORS: Record<string, string> = {
  gemini: '#2a78d6',
  rule_based_fallback: '#898781',
  mixed: '#eda100',
  unknown: '#c3c2b7',
};
