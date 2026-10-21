import { PlaceholderScreen } from '@/components';

/**
 * Scan & Pay — placeholder route.
 * Reachable from the home quick-action panel so the button is never a dead end.
 */
export default function Scan() {
  return (
    <PlaceholderScreen
      title="Scan & Pay"
      owner="Developer B — PayNow"
      todoTag="// TODO: PAYNOW FEATURE"
      description="Scan a PayNow QR code to pay. This is a placeholder — wire up the camera/QR flow and route into the existing PayNow review + confirm journey."
      buildNotes={[
        'Reuse the PayNow transaction state and review screen.',
        'Confirmation must stay an explicit customer action.',
        'Synthetic data only — no live payment rails.',
      ]}
    />
  );
}
