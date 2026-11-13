import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Pressable } from 'react-native';

import {
  AppButton,
  AppInput,
  AppText,
  Icon,
  type IconName,
  LoadingState,
} from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';

import {
  hasErrors,
  makePocket,
  parseAmount,
  validatePocketForm,
  type FieldErrors,
} from '../logic';
import { getPocket } from '../storage';
import { POCKET_CATEGORIES, type PocketCategory, type SavingsPocket } from '../types';
import { useSavingsPockets } from '../useSavingsPockets';

/**
 * Create OR edit a savings pocket.
 * - /savings/new            → create (no id param)
 * - /savings/[id]/edit      → edit (id param present)
 *
 * Validation prevents empty names, non-positive/invalid targets, negative or
 * over-target initial amounts, and past target dates.
 */
export function PocketFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const { save } = useSavingsPockets();

  const [loaded, setLoaded] = useState(!editing);
  const [original, setOriginal] = useState<SavingsPocket | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PocketCategory>('general');
  const [target, setTarget] = useState('');
  const [initial, setInitial] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  // Load the existing pocket when editing.
  useEffect(() => {
    if (!editing || !id) return;
    let active = true;
    (async () => {
      const p = await getPocket(id);
      if (!active) return;
      if (p) {
        setOriginal(p);
        setName(p.name);
        setCategory(p.category);
        setTarget(String(p.target));
        setTargetDate(p.targetDate ?? '');
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [editing, id]);

  const title = editing ? 'Edit pocket' : 'New savings pocket';

  function onSave() {
    const fieldErrors = validatePocketForm({
      name,
      target,
      initial: editing ? undefined : initial, // initial only applies on create
      targetDate: targetDate.trim() === '' ? null : targetDate.trim(),
    });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setBusy(true);
    const parsedTarget = parseAmount(target)!; // validated above
    const date = targetDate.trim() === '' ? null : targetDate.trim();

    if (editing && original) {
      // Preserve contributions and id; update editable fields only.
      void save({
        ...original,
        name: name.trim(),
        category,
        target: parsedTarget,
        targetDate: date,
      }).then(() => router.back());
    } else {
      const pocket = makePocket({
        name,
        category,
        target: parsedTarget,
        targetDate: date,
        initial: parseAmount(initial) ?? 0,
      });
      void save(pocket).then(() => router.back());
    }
  }

  if (!loaded) {
    return (
      <BankingScreen title={title} backTo="/savings">
        <LoadingState message="Loading pocket…" />
      </BankingScreen>
    );
  }

  return (
    <BankingScreen title={title} backTo="/savings">
      <AppInput
        label="Pocket name"
        placeholder="e.g. Holiday Fund"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        maxLength={40}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="label" color="textSecondary">
          Category
        </AppText>
        <CategoryPicker selected={category} onSelect={setCategory} />
      </View>

      <AppInput
        label="Target amount (SGD)"
        placeholder="e.g. 3000"
        keyboardType="decimal-pad"
        value={target}
        onChangeText={(t) => {
          setTarget(t.replace(/[^0-9.]/g, ''));
          if (errors.target) setErrors((e) => ({ ...e, target: undefined }));
        }}
        error={errors.target}
      />

      {!editing ? (
        <AppInput
          label="Starting amount (optional)"
          placeholder="e.g. 500"
          keyboardType="decimal-pad"
          value={initial}
          onChangeText={(t) => {
            setInitial(t.replace(/[^0-9.]/g, ''));
            if (errors.initial) setErrors((e) => ({ ...e, initial: undefined }));
          }}
          error={errors.initial}
          hint="A simulated opening contribution. Leave blank for 0."
        />
      ) : null}

      <AppInput
        label="Target date (optional)"
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        value={targetDate}
        onChangeText={(t) => {
          setTargetDate(t);
          if (errors.targetDate) setErrors((e) => ({ ...e, targetDate: undefined }));
        }}
        error={errors.targetDate}
        hint="When you'd like to reach this goal."
      />

      <AppButton label={editing ? 'Save changes' : 'Create pocket'} loading={busy} onPress={onSave} />
      <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} />
    </BankingScreen>
  );
}

function CategoryPicker({
  selected,
  onSelect,
}: {
  selected: PocketCategory;
  onSelect: (c: PocketCategory) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
    >
      {POCKET_CATEGORIES.map((c) => {
        const active = c.key === selected;
        return (
          <SelectableCardChip
            key={c.key}
            icon={c.icon as IconName}
            label={c.label}
            active={active}
            onPress={() => onSelect(c.key)}
          />
        );
      })}
    </ScrollView>
  );
}

function SelectableCardChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
        gap: 4,
        minWidth: 84,
        minHeight: 72,
        justifyContent: 'center',
        borderRadius: theme.radius.lg,
        borderColor: active ? theme.colors.selectedBorder : theme.colors.border,
        borderWidth: active || theme.clarity ? 2 : 1,
        backgroundColor: active
          ? theme.colors.selectedBg
          : pressed
            ? theme.colors.surfaceMuted
            : theme.colors.surface,
      })}
    >
      <Icon name={icon} size={20} color={active ? theme.colors.primary : theme.colors.textSecondary} />
      <AppText role="caption" color={active ? 'primary' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}
