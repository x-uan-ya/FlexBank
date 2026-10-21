/**
 * Shared UI components — public surface.
 *
 *   import { AppButton, AppText, ScreenContainer } from '@/components';
 *
 * These are the building blocks every feature should reuse. They are all
 * theme-aware (scale with displayMode) and accessible by default.
 */

export { AppText } from './AppText';
export { AppButton, type ButtonVariant } from './AppButton';
export { AppCard } from './AppCard';
export { AppInput } from './AppInput';
export { ScreenContainer } from './ScreenContainer';
export { Header } from './Header';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { EmptyState } from './EmptyState';
export { ErrorBoundary } from './ErrorBoundary';
export { PlaceholderScreen } from './PlaceholderScreen';
