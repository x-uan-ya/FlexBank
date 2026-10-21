/**
 * Demo personas — DEVELOPMENT / DEMO ONLY.
 *
 * IMPORTANT: These are convenience presets so we can switch the prototype into
 * different preference configurations quickly during a demo. They are NOT
 * inferred customer categories and must NEVER be used to classify or guess a
 * real customer's characteristics. Every persona is just a bundle of EXPLICIT
 * preference values a customer could have chosen themselves.
 */

import type { CustomerPreferences } from '@/types/preferences';

export interface DemoPersona {
  id: 'A' | 'B' | 'C';
  label: string;
  description: string;
  preferences: CustomerPreferences;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'A',
    label: 'Persona A — Fast & familiar',
    description: 'Quick guidance, payments first, standard display.',
    preferences: {
      language: 'en',
      guidanceLevel: 'quick',
      displayMode: 'standard',
      priorities: ['payments', 'moneyManagement', 'guidance', 'accessibility'],
      voiceEnabled: false,
    },
  },
  {
    id: 'B',
    label: 'Persona B — Wants explanations',
    description: 'Guided journey, guidance prioritised, standard display.',
    preferences: {
      language: 'en',
      guidanceLevel: 'guided',
      displayMode: 'standard',
      priorities: ['guidance', 'payments', 'moneyManagement', 'accessibility'],
      voiceEnabled: false,
    },
  },
  {
    id: 'C',
    label: 'Persona C — Accessibility focused',
    description: 'Guided journey, large/high-clarity display, voice enabled.',
    preferences: {
      language: 'en',
      guidanceLevel: 'guided',
      displayMode: 'highClarity',
      priorities: ['accessibility', 'guidance', 'payments', 'moneyManagement'],
      voiceEnabled: true,
    },
  },
];

export function getPersona(id: DemoPersona['id']): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.id === id);
}
