import { useAuthState } from '@/state';

export interface CurrentUser {
  id: string;
  firstName?: string;
}

/**
 * Who is signed in. useAuthState's exact return type was not checked, so it is
 * read defensively: if the shape differs, we fall back to a guest with no name.
 */
export function useCurrentUser(): CurrentUser {
  const auth = useAuthState() as unknown as {
    user?: { id?: string; fullName?: string } | null;
  } | null;
  const user = auth?.user;
  const fullName = user?.fullName?.trim();
  return {
    id: user?.id ?? 'guest',
    firstName: fullName ? fullName.split(/\s+/)[0] : undefined,
  };
}