import type { Avatar } from '@dcl/schemas';

export type Props = {
  address?: string;
  avatar?: Avatar;
  isSignedIn: boolean;
  isSigningIn: boolean;
  onClickSignOut: () => void;
  onClickSignIn: () => void;
};
