/**
 * Synthetic PayNow recipients. CLEARLY fake data — no real people, no real
 * account numbers (identifiers are masked). Dev B consumes this list.
 */

import type { Recipient } from '@/types/banking';

export const MOCK_RECIPIENTS: Recipient[] = [
  { id: 'rcp-alex', name: 'Alex Tan', bank: 'DBS', maskedIdentifier: '•••• 4821', initials: 'AT' },
  { id: 'rcp-sarah', name: 'Sarah Lim', bank: 'OCBC', maskedIdentifier: '•••• 1293', initials: 'SL' },
  { id: 'rcp-marcus', name: 'Marcus Lee', bank: 'UOB', maskedIdentifier: '•••• 7356', initials: 'ML' },
  { id: 'rcp-priya', name: 'Priya Nair', bank: 'OCBC', maskedIdentifier: '•••• 9014', initials: 'PN' },
  { id: 'rcp-wei', name: 'Wei Zhang', bank: 'DBS', maskedIdentifier: '•••• 2680', initials: 'WZ' },
];
