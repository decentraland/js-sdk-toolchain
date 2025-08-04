import { Box, OperativeSystem, Typography } from 'decentraland-ui2';
import {
  DownloadButtonAppleIcon,
  DownloadButtonWindowsIcon,
} from 'decentraland-ui2/dist/components/DownloadButton/DownloadButton.styled';
import { useAdvancedUserAgentData } from '@dcl/hooks';
import { actions } from '/@/modules/store/editor';
import { Modal } from '..';
import { Button } from '../../Button';
import LogoDCLSVG from '/assets/images/logo-dcl.svg';
import type { Props } from './types';

import './styles.css';
import { useCallback, useMemo } from 'react';
import { useDispatch } from '#store';
import { t } from '/@/modules/store/translation/utils';

export function InstallClient({ open, onClose }: Props) {
  const [_, agent] = useAdvancedUserAgentData();
  const dispatch = useDispatch();

  const handleDownload = useCallback(async () => {
    if (!agent) return;
    dispatch(actions.openExternalURL('https://decentraland.org/download/'));
    onClose();
  }, [agent, onClose]);
  const { icon, text } = useMemo(() => {
    if (!agent) {
      return { text: t('modal.install_client.download'), icon: <div /> };
    }
    if (agent.os.name === OperativeSystem.MACOS) {
      return { icon: <DownloadButtonAppleIcon />, text: t('modal.install_client.download_macos') };
    }
    return { icon: <DownloadButtonWindowsIcon />, text: t('modal.install_client.download_win') };
  }, [agent]);

  return (
    <Modal
      className="InstallClientModal"
      open={open}
      size="tiny"
    >
      <Box className="InstallClientBox">
        <Box className="LogoContainer">
          <img
            src={LogoDCLSVG}
            alt="Decentraland Logo"
            className="Logo"
          />
        </Box>
        <Typography
          variant="h5"
          className="Title"
        >
          {t('modal.install_client.title')}
        </Typography>
        <Box className="Actions">
          <Button
            variant="contained"
            color="primary"
            onClick={handleDownload}
            startIcon={icon}
          >
            {text}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={onClose}
          >
            {t('modal.install_client.cancel')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
