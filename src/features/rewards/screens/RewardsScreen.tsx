import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppCard, AppText, Header, ScreenContainer } from '@/components';
import { useCurrentUser } from '@/features/shell/useCurrentUser';
import { usePersistedState } from '@/features/shell/usePersistedState';
import { useTheme } from '@/theme';

type Category = 'Dining' | 'Groceries' | 'Travel' | 'Giving';

interface Offer {
  id: string;
  title: string;
  detail: string;
  category: Category;
  cost: number;
}

interface RewardsState {
  points: number;
  redeemed: string[];
}

const CATEGORIES: Category[] = ['Dining', 'Groceries', 'Travel', 'Giving'];
const START_STATE: RewardsState = { points: 4200, redeemed: [] };

const OFFERS: Offer[] = [
  { id: 'dining-5', title: 'S$5 dining voucher', detail: 'For a demo partner restaurant.', category: 'Dining', cost: 500 },
  { id: 'dining-12', title: 'S$12 weekend brunch deal', detail: 'Saturday and Sunday only (demo).', category: 'Dining', cost: 1100 },
  { id: 'groceries-10', title: 'S$10 groceries voucher', detail: 'For a demo supermarket.', category: 'Groceries', cost: 900 },
  { id: 'travel-10', title: 'S$10 transport top-up', detail: 'Adds value to a demo travel card.', category: 'Travel', cost: 800 },
  { id: 'giving-5', title: 'Donate S$5 to a demo charity', detail: 'No real donation is made.', category: 'Giving', cost: 400 },
];

function formatPoints(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Rewards (Frontend). Synthetic points and offers; redeeming needs a confirm step. */
export function RewardsScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const [state, setState] = usePersistedState<RewardsState>(`rewards:state:${user.id}`, START_STATE);
  const [filter, setFilter] = useState<'All' | Category>('All');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const visible = filter === 'All' ? OFFERS : OFFERS.filter((offer) => offer.category === filter);

  function confirmRedeem(offer: Offer) {
    setPending(null);
    if (state.redeemed.includes(offer.id) || state.points < offer.cost) {
      setMessage('That offer could not be redeemed.');
      return;
    }
    setState({ points: state.points - offer.cost, redeemed: [...state.redeemed, offer.id] });
    setMessage(`${offer.title} redeemed for ${formatPoints(offer.cost)} points (demo).`);
  }

  return (
    <ScreenContainer scroll>
      <Header title="Rewards" subtitle="Demo points and offers" />

      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="caption" color="textSecondary">Your demo rewards balance</AppText>
          <AppText role="display">{formatPoints(state.points)} pts</AppText>
          <AppText role="caption" color="textMuted">
            Demonstration only. These points have no real value.
          </AppText>
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {(['All', ...CATEGORIES] as const).map((option) => (
          <AppButton
            key={option}
            label={option}
            variant={filter === option ? undefined : 'secondary'}
            fullWidth={false}
            accessibilityState={{ selected: filter === option }}
            onPress={() => setFilter(option)}
          />
        ))}
      </View>

      <View accessibilityLiveRegion="polite">
        {message ? (
          <AppCard elevation="none">
            <AppText role="body">{message}</AppText>
          </AppCard>
        ) : null}
      </View>

      {visible.map((offer) => {
        const redeemed = state.redeemed.includes(offer.id);
        const affordable = state.points >= offer.cost;
        return (
          <AppCard key={offer.id}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText role="bodyStrong">{offer.title}</AppText>
              <AppText role="caption" color="textSecondary">{offer.detail}</AppText>
              <AppText role="label">{formatPoints(offer.cost)} points · {offer.category}</AppText>
              {redeemed ? (
                <AppText role="bodyStrong" color="primary">Redeemed</AppText>
              ) : pending === offer.id ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <AppText role="body">Redeem this for {formatPoints(offer.cost)} points?</AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    <AppButton label="Yes, redeem" fullWidth={false} onPress={() => confirmRedeem(offer)} />
                    <AppButton label="Cancel" variant="secondary" fullWidth={false} onPress={() => setPending(null)} />
                  </View>
                </View>
              ) : (
                <View style={{ gap: theme.spacing.xs }}>
                  <AppButton
                    label="Redeem"
                    variant="secondary"
                    fullWidth={false}
                    disabled={!affordable}
                    onPress={() => { setMessage(''); setPending(offer.id); }}
                  />
                  {!affordable ? (
                    <AppText role="caption" color="textMuted">Not enough points yet.</AppText>
                  ) : null}
                </View>
              )}
            </View>
          </AppCard>
        );
      })}

      <AppButton
        label="Reset demo rewards"
        variant="ghost"
        onPress={() => { setState(START_STATE); setPending(null); setMessage('Demo rewards reset.'); }}
      />
    </ScreenContainer>
  );
}