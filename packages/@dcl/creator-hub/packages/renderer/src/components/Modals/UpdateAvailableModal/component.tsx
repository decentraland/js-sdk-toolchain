import { Box, Button, IconButton, Typography } from 'decentraland-ui2';
import CloseIcon from '@mui/icons-material/Close';
import { InfoOutlined } from '@mui/icons-material';

import { Modal } from '../index';
import { t } from '/@/modules/store/translation/utils';
import InfluencePng from '/assets/images/influence.png';

import './styles.css';
import { Row } from '../../Row';
import { actions } from '/@/modules/store/settings';
import { useDispatch } from '#store';

interface Props {
  open: boolean;
  onClose: () => void;
  version: string;
}

export function UpdateAvailableModal({ open, onClose, version }: Props) {
  const dispatch = useDispatch();
  return (
    <Modal
      size="tiny"
      open={open}
    >
      <Box className="UpdateAvailableModal">
        <div className="CloseButtonContainer">
          <IconButton onClick={onClose}>
            <CloseIcon fontSize="medium" />
          </IconButton>
        </div>
        <Typography variant="h5">{t('modal.app_settings.update.update_available')}</Typography>
        <Typography
          variant="body1"
          className="version"
        >
          {t('modal.app_settings.version.label', { version })}
        </Typography>
        <Box className="ImageButtonContainer">
          <img
            src={InfluencePng}
            alt="Update available"
          />
          <Box className="ButtonContainer">
            <Button
              variant="contained"
              className="actionButton"
              onClick={() => {
                dispatch(actions.installUpdate());
              }}
            >
              {t('modal.app_settings.update.install')}
            </Button>
            <Row className="update-settings__message-container">
              <InfoOutlined />
              <Typography variant="body2">{t('modal.app_settings.update.auto_restart')}</Typography>
            </Row>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
