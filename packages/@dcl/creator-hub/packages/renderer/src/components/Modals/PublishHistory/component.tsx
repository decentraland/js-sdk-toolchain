import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { t } from '/@/modules/store/translation/utils';

import { Modal } from '..';

import type { Props } from './types';

import './styles.css';

export function PublishHistory({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      title={t('modal.publish_history.title')}
      onClose={onClose}
      size="tiny"
    >
      <div className="PublishHistory">
        <Deployment />
      </div>
    </Modal>
  );
}

function Deployment() {
  return (
    <div className="Deployment">
      <h3>
        <CloseIcon color="error" /> 12/10/2024 - 5:36 pm
      </h3>
      <div className="rows">
        <div className="row">
          <span>5:36 pm</span>
          <CheckIcon color="success" /> {t('modal.publish_project.deploy.deploying.step.uploading')}
        </div>
        <div className="row">
          <span>6:19 pm</span>
          <CheckIcon color="success" />{' '}
          {t('modal.publish_project.deploy.deploying.step.converting')}
        </div>
        <div className="row">
          <span>6:49 pm</span>
          <CloseIcon color="error" /> {t('modal.publish_project.deploy.deploying.step.optimizing')}
        </div>
      </div>
    </div>
  );
}
