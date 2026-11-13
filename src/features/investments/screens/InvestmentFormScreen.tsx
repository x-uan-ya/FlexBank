import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppButton,
  AppInput,
  AppText,
  LoadingState,
} from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';

import {
  hasErrors,
  parseAmount,
  parseRate,
  uid,
  validateInvestmentForm,
  type InvestmentFieldErrors,
} from '../logic';
import { getInvestment } from '../storage';
import {
  COUPON_FREQUENCY_LABELS,
  type CouponFrequency,
  type Investment,
  type InvestmentKind,
} from '../types';
import { useInvestments } from '../useInvestments';

const FREQUENCIES: CouponFrequency[] = ['annual', 'semiAnnual', 'quarterly', 'monthly'];

/**
 * Create OR edit an investment (fixed deposit or bond).
 * - /investments/new         → create
 * - /investments/[id]/edit   → edit
 */
export function InvestmentFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const { save } = useInvestments();

  const [loaded, setLoaded] = useState(!editing);
  const [original, setOriginal] = useState<Investment | null>(null);

  const [kind, setKind] = useState<InvestmentKind>('fixedDeposit');
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [frequency, setFrequency] = useState<CouponFrequency>('semiAnnual');
  const [errors, setErrors] = useState<InvestmentFieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;
    let active = true;
    (async () => {
      const inv = await getInvestment(id);
      if (!active) return;
      if (inv) {
        setOriginal(inv);
        setKind(inv.kind);
        setName(inv.name);
        setPrincipal(String(inv.principal));
        setRate(String(inv.rate));
        setStartDate(inv.startDate);
        setMaturityDate(inv.maturityDate);
        if (inv.kind === 'bond') {
          setFaceValue(String(inv.faceValue));
          setFrequency(inv.couponFrequency);
        }
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [editing, id]);

  const title = editing ? 'Edit investment' : 'Add investment';

  function onSave() {
    const fieldErrors = validateInvestmentForm({
      kind,
      name,
      principal,
      rate,
      startDate: startDate.trim(),
      maturityDate: maturityDate.trim(),
      faceValue: kind === 'bond' ? faceValue : undefined,
    });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setBusy(true);
    const base = {
      name: name.trim(),
      principal: parseAmount(principal)!,
      rate: parseRate(rate)!,
      startDate: startDate.trim(),
      maturityDate: maturityDate.trim(),
    };

    let investment: Investment;
    if (kind === 'bond') {
      investment = {
        ...(original && original.kind === 'bond' ? original : {
          id: uid('inv'),
          createdAt: new Date().toISOString(),
        }),
        ...base,
        kind: 'bond',
        faceValue: parseAmount(faceValue)!,
        couponFrequency: frequency,
      } as Investment;
    } else {
      investment = {
        ...(original && original.kind === 'fixedDeposit' ? original : {
          id: uid('inv'),
          createdAt: new Date().toISOString(),
        }),
        ...base,
        kind: 'fixedDeposit',
      } as Investment;
    }

    void save(investment).then(() => router.back());
  }

  if (!loaded) {
    return (
      <BankingScreen title={title} backTo="/investments">
        <LoadingState message="Loading investment…" />
      </BankingScreen>
    );
  }

  return (
    <BankingScreen title={title} backTo="/investments">
      {/* Type toggle (locked when editing to keep the model consistent). */}
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="label" color="textSecondary">
          Type
        </AppText>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <TypeChip label="Fixed deposit" active={kind === 'fixedDeposit'} disabled={editing} onPress={() => setKind('fixedDeposit')} />
          <TypeChip label="Bond" active={kind === 'bond'} disabled={editing} onPress={() => setKind('bond')} />
        </View>
        {editing ? (
          <AppText role="caption" color="textMuted">
            Type can't be changed after creation.
          </AppText>
        ) : null}
      </View>

      <AppInput
        label="Name"
        placeholder={kind === 'bond' ? 'e.g. Corporate Bond B' : 'e.g. 12-month FD'}
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        maxLength={50}
      />

      <AppInput
        label="Principal invested (SGD)"
        placeholder="e.g. 10000"
        keyboardType="decimal-pad"
        value={principal}
        onChangeText={(t) => {
          setPrincipal(t.replace(/[^0-9.]/g, ''));
          if (errors.principal) setErrors((e) => ({ ...e, principal: undefined }));
        }}
        error={errors.principal}
      />

      {kind === 'bond' ? (
        <AppInput
          label="Face value (repaid at maturity, SGD)"
          placeholder="e.g. 5000"
          keyboardType="decimal-pad"
          value={faceValue}
          onChangeText={(t) => {
            setFaceValue(t.replace(/[^0-9.]/g, ''));
            if (errors.faceValue) setErrors((e) => ({ ...e, faceValue: undefined }));
          }}
          error={errors.faceValue}
        />
      ) : null}

      <AppInput
        label={kind === 'bond' ? 'Coupon rate (% p.a.)' : 'Interest rate (% p.a.)'}
        placeholder="e.g. 2.5"
        keyboardType="decimal-pad"
        value={rate}
        onChangeText={(t) => {
          setRate(t.replace(/[^0-9.]/g, ''));
          if (errors.rate) setErrors((e) => ({ ...e, rate: undefined }));
        }}
        error={errors.rate}
      />

      {kind === 'bond' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="label" color="textSecondary">
            Coupon frequency
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {FREQUENCIES.map((f) => (
              <TypeChip
                key={f}
                label={COUPON_FREQUENCY_LABELS[f]}
                active={frequency === f}
                onPress={() => setFrequency(f)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <AppInput
        label="Start date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        value={startDate}
        onChangeText={(t) => {
          setStartDate(t);
          if (errors.startDate) setErrors((e) => ({ ...e, startDate: undefined }));
        }}
        error={errors.startDate}
      />

      <AppInput
        label="Maturity date"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        value={maturityDate}
        onChangeText={(t) => {
          setMaturityDate(t);
          if (errors.maturityDate) setErrors((e) => ({ ...e, maturityDate: undefined }));
        }}
        error={errors.maturityDate}
      />

      <AppButton label={editing ? 'Save changes' : 'Add investment'} loading={busy} onPress={onSave} />
      <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} />
    </BankingScreen>
  );
}

function TypeChip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        opacity: disabled && !active ? 0.5 : 1,
        borderColor: active ? theme.colors.selectedBorder : theme.colors.border,
        borderWidth: active || theme.clarity ? 2 : 1,
        backgroundColor: active
          ? theme.colors.selectedBg
          : pressed
            ? theme.colors.surfaceMuted
            : theme.colors.surface,
      })}
    >
      <AppText role="label" color={active ? 'primary' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}
