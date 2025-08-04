import { useCallback, useMemo, useState } from 'react';
import { Box, Typography, Button } from 'decentraland-ui2';
import { InfoOutlined } from '@mui/icons-material';
import { Row } from '../../../Row';
import { Column } from '../../../Column';
import { t } from '/@/modules/store/translation/utils';
import { useEditor } from '/@/hooks/useEditor';
import { useDispatch, useSelector } from '#store';
import { checkForUpdates, downloadUpdate, installUpdate } from '/@/modules/store/settings/slice';
import './styles.css';

interface UpdateButtonProps {
  action: () => void;
  text: string;
  disabled?: boolean;
}

export const UpdateSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { version: currentVersion } = useEditor();
  const {
    downloadingUpdate: { progress, finished, isDownloading },
    updateInfo,
  } = useSelector(state => state.settings);

  const checkForUpdatesStatus = useSelector(state => state.settings.checkForUpdates.status);

  const [hasCheckedForUpdates, setHasCheckedForUpdates] = useState(false);

  const shouldShowUpdateAvailable = useCallback(() => {
    return hasCheckedForUpdates && updateInfo.available && updateInfo.version && !isDownloading;
  }, [hasCheckedForUpdates, updateInfo, isDownloading]);

  const handleCheckForUpdates = useCallback(async () => {
    setHasCheckedForUpdates(true);
    dispatch(checkForUpdates({ autoDownload: false }));
  }, [dispatch]);

  const handleInstallUpdate = useCallback(async () => {
    dispatch(installUpdate());
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    dispatch(downloadUpdate());
  }, [handleCheckForUpdates]);

  const getButtonProps = useCallback((): UpdateButtonProps => {
    if (checkForUpdatesStatus === 'loading') {
      return {
        action: () => {},
        text: t('editor.loading.title'),
        disabled: true,
      };
    }

    if (progress > 0 && !finished) {
      return {
        action: () => {},
        text: t('modal.app_settings.update.downloading', { progress }),
        disabled: true,
      };
    }

    if (!hasCheckedForUpdates || checkForUpdatesStatus === 'idle') {
      return {
        action: handleCheckForUpdates,
        text: t('modal.app_settings.update.check'),
      };
    }

    if (updateInfo.available) {
      const buttonText = updateInfo.isDownloaded
        ? t('modal.app_settings.update.install')
        : t('modal.app_settings.update.update');

      return {
        action: updateInfo.isDownloaded ? handleInstallUpdate : handleDownloadUpdate,
        text: buttonText,
      };
    }

    return {
      action: handleCheckForUpdates,
      text: t('modal.app_settings.update.check'),
    };
  }, [
    checkForUpdatesStatus,
    updateInfo,
    progress,
    finished,
    hasCheckedForUpdates,
    isDownloading,
    handleCheckForUpdates,
    handleDownloadUpdate,
    handleInstallUpdate,
  ]);

  const canInstallNewVersion = useMemo(
    () => updateInfo.available && updateInfo.isDownloaded && hasCheckedForUpdates,
    [updateInfo.available, updateInfo.isDownloaded, hasCheckedForUpdates],
  );

  const buttonProps = getButtonProps();

  return (
    <Column className={`update-settings ${className}`}>
      {currentVersion && (
        <Typography variant="body1">
          {t('modal.app_settings.version.current', { version: currentVersion })}
        </Typography>
      )}
      <Row className="update-settings__button-container">
        <Button
          variant="contained"
          onClick={buttonProps.action}
          disabled={buttonProps.disabled}
        >
          {buttonProps.text}
        </Button>
        {shouldShowUpdateAvailable() && (
          <Typography variant="subtitle1">
            {t('modal.app_settings.version.new', { version: updateInfo.version })}
          </Typography>
        )}
        {progress > 0 && !finished && (
          <Box className="update-settings__progress-container">
            <Typography variant="body2">{t('modal.app_settings.update.applying')}</Typography>
            <Typography variant="body2">{t('modal.app_settings.update.dont_close')}</Typography>
          </Box>
        )}
        {hasCheckedForUpdates &&
          updateInfo.available === false &&
          checkForUpdatesStatus === 'succeeded' && (
            <Typography variant="subtitle1">
              {t('modal.app_settings.version.up_to_date')}
            </Typography>
          )}
      </Row>
      {canInstallNewVersion && (
        <Row className="update-settings__message-container">
          <InfoOutlined />
          <Typography variant="body2">{t('modal.app_settings.update.auto_restart')}</Typography>
        </Row>
      )}
    </Column>
  );
};
