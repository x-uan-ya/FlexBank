import { Component, type ReactNode } from 'react';
import { View } from 'react-native';

import { ErrorState } from './ErrorState';

/**
 * App-level error boundary. Catches render-time crashes in any feature and
 * shows a calm, customer-friendly fallback instead of a red screen or raw
 * stack trace. This supports the "fail gracefully" safety requirement.
 *
 * Feature developers do NOT need their own boundary for basic safety, but may
 * wrap risky areas (e.g. AI rendering) with their own for finer recovery.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // In a real app this would go to a logging service. For the prototype we
    // log to the dev console only — never surface raw errors to the customer.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[ErrorBoundary] caught an error:', error);
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset);
      }
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            title="Something went wrong"
            message="The app ran into an unexpected problem. Your account is safe. Please try again."
            retryLabel="Reload this screen"
            onRetry={this.reset}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
