import { type ModalProps } from 'decentraland-ui2/dist/components/Modal/Modal.types';

import { Modal } from '../..';

export function onBackNoop() {}

export function PublishModal(props: React.PropsWithChildren<ModalProps>) {
  const { onBack, ...rest } = props;
  return (
    <Modal
      size="small"
      {...rest}
      onBack={onBack || onBackNoop}
    >
      {props.children}
    </Modal>
  );
}
