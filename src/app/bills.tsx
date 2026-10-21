import { PlaceholderScreen } from '@/components';

/**
 * Bill Payment — placeholder route.
 * Reachable from the home quick-action panel so the button is never a dead end.
 */
export default function Bills() {
  return (
    <PlaceholderScreen
      title="Bill Payment"
      owner="Developer B — PayNow"
      todoTag="// TODO: PAYNOW FEATURE"
      description="Pay a biller from a saved list. This is a placeholder — build the biller selection and amount entry, then reuse the PayNow review + confirm flow."
      buildNotes={[
        'Reuse the shared transaction review + confirmation.',
        'Keep confirmation explicit; no auto-pay.',
        'Synthetic billers and amounts only.',
      ]}
    />
  );
}
