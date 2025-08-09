import cx from 'classnames';
import { useAuth } from '/@/hooks/useAuth';
import { UserMenu } from './UserMenu';
import type { Props } from './types';

import './styles.css';

export function Header({ children, classNames, hideUserMenu }: Props) {
  const auth = useAuth();
  const [title, actions] = children;

  return (
    <nav className={cx('Header', classNames)}>
      <div className="left">{title}</div>
      <div className="right">{actions}</div>
      {hideUserMenu ? null : (
        <div className="user">
          <UserMenu
            address={auth.wallet}
            avatar={auth.avatar}
            isSignedIn={auth.isSignedIn}
            isSigningIn={auth.isSigningIn}
            onClickSignIn={auth.signIn}
            onClickSignOut={auth.signOut}
          />
        </div>
      )}
    </nav>
  );
}
