import { useCallback, useState } from 'react';
import { Menu, MenuItem, Button } from 'decentraland-ui2';
import { AvatarFace } from 'decentraland-ui2/dist/components/AvatarFace/AvatarFace';
import { t } from '/@/modules/store/translation/utils';
import type { Props } from './types';

import './styles.css';

export function UserMenu({ avatar, isSignedIn, onClickSignOut, onClickSignIn }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return isSignedIn ? (
    <>
      <Button
        id="AvatarButton"
        className="AvatarButton"
        aria-controls={open ? 'UserMenu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        disableRipple
      >
        <AvatarFace
          size="medium"
          avatar={avatar}
        />
      </Button>
      <Menu
        id="UserMenu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'AvatarButton',
        }}
      >
        <MenuItem onClick={onClickSignOut}>{t('navbar.user_menu.sign_out')}</MenuItem>
      </Menu>
    </>
  ) : (
    <Button
      className="SignInButton"
      onClick={onClickSignIn}
      variant="contained"
      disableRipple
    >
      {t('navbar.user_menu.sign_in')}
    </Button>
  );
}
