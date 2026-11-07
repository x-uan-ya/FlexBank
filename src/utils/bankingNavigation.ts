const RETURN_ROUTES = ['/home', '/customize', '/settings', '/paynow', '/paynow/review', '/paynow/success', '/checkpoint'] as const;
export type BankingReturnRoute = typeof RETURN_ROUTES[number];

/** Return links use known app destinations, not arbitrary query-string URLs. */
export function bankingReturnRoute(value: unknown, fallback: BankingReturnRoute = '/home'): BankingReturnRoute {
  return typeof value === 'string' && (RETURN_ROUTES as readonly string[]).includes(value)
    ? value as BankingReturnRoute : fallback;
}
