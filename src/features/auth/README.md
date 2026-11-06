# Auth feature

**Owner: Integration lead**

Login, multi-step registration, and forgot-password. Local-first for the
prototype; swappable for a real backend (see `BACKEND.md`).

## Files

- `screens/LoginScreen.tsx` — email/password sign-in + demo quick-logins (dev).
- `screens/RegisterScreen.tsx` — 4 steps: basic info → banking purposes →
  experience → confirm. Calls `useAuth().register`.
- `screens/ForgotPasswordScreen.tsx` — prototype reset flow (no email server).
- `components/BrandMark.tsx` — shared FlexBank wordmark.

## How it works

Screens call `useAuth()` (from `@/state`), which wraps `authService`
(`@/services`). The service persists on-device (SecureStore + AsyncStorage) and
the session is restored on boot by `SessionProvider`.

## Rules

- Never store or log plaintext passwords (service hashes them).
- Show friendly `AuthError.message` text, never raw errors.
- Banking purposes chosen here drive the purpose-based home — they are explicit
  choices, never inferred.
