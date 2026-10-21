/**
 * Adaptive homepage widget model.
 *
 * Owner: Developer A (Personalisation) owns layout logic; the home feature
 * (also Dev A) renders widgets by type. The FOUNDATION only provides the data
 * model + a default layout. The personalisation algorithm is NOT implemented
 * here — Dev A will later map CustomerPreferences -> ordered HomeWidget[].
 */

/** The kinds of widget the homepage can render. */
export type HomeWidgetType =
  | 'paynow'
  | 'transfer'
  | 'bills'
  | 'accounts'
  | 'spending'
  | 'recentRecipients'
  | 'concierge'
  | 'help';

export const HOME_WIDGET_LABELS: Record<HomeWidgetType, string> = {
  paynow: 'PayNow',
  transfer: 'Transfer',
  bills: 'Pay bills',
  accounts: 'Accounts',
  spending: 'Spending',
  recentRecipients: 'Recent recipients',
  concierge: 'Banking Concierge',
  help: 'Help & assistance',
};

/**
 * A single homepage widget instance.
 * - priority: higher = more prominent. Used as a tie-breaker / for sizing.
 * - position: explicit order index (0 = top). Dev A sets this from preferences.
 * - visible: a customer can hide a widget in Customize (but core banking
 *   features must remain reachable elsewhere — see SAFETY principles).
 */
export interface HomeWidget {
  id: string;
  type: HomeWidgetType;
  title: string;
  priority: number;
  visible: boolean;
  position: number;
}

/**
 * Default "standard" homepage layout used before personalisation runs and by
 * reset-to-standard. Ordered by position.
 */
export const DEFAULT_HOME_LAYOUT: HomeWidget[] = [
  { id: 'w-paynow', type: 'paynow', title: HOME_WIDGET_LABELS.paynow, priority: 100, visible: true, position: 0 },
  { id: 'w-accounts', type: 'accounts', title: HOME_WIDGET_LABELS.accounts, priority: 90, visible: true, position: 1 },
  { id: 'w-recent', type: 'recentRecipients', title: HOME_WIDGET_LABELS.recentRecipients, priority: 80, visible: true, position: 2 },
  { id: 'w-transfer', type: 'transfer', title: HOME_WIDGET_LABELS.transfer, priority: 70, visible: true, position: 3 },
  { id: 'w-bills', type: 'bills', title: HOME_WIDGET_LABELS.bills, priority: 60, visible: true, position: 4 },
  { id: 'w-spending', type: 'spending', title: HOME_WIDGET_LABELS.spending, priority: 50, visible: true, position: 5 },
  { id: 'w-concierge', type: 'concierge', title: HOME_WIDGET_LABELS.concierge, priority: 40, visible: true, position: 6 },
  { id: 'w-help', type: 'help', title: HOME_WIDGET_LABELS.help, priority: 30, visible: true, position: 7 },
];
