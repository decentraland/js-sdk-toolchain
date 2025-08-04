import React, { useCallback, useState, type MouseEvent } from 'react';
import { IconButton, MenuItem, Menu } from 'decentraland-ui2';
import ThreeDots from '@mui/icons-material/MoreVert';
import cx from 'classnames';

import type { Option, Props } from './types';

import './styles.css';

function Dropdown(props: Props) {
  const { options, className, selected } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleSelect = useCallback((e: MouseEvent<HTMLLIElement>, option: Option) => {
    e.stopPropagation();
    setAnchorEl(null);
    option.handler();
  }, []);

  const handleClose = useCallback((e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick}>
        <ThreeDots />
      </IconButton>
      <Menu
        classes={{ root: cx('Dropdown', className) }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {options.map(option => (
          <MenuItem
            key={option.text}
            selected={option.text === selected}
            onClick={e => handleSelect(e, option)}
          >
            {option.text}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export const DropdownMemo = React.memo(Dropdown);
