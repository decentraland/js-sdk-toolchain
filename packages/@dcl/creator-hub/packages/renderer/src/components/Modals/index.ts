import { Modal as BaseModal } from 'decentraland-ui2/dist/components/Modal/Modal';
import { styled } from 'decentraland-ui2';

export function onBackNoop() {}

export const Modal = styled(BaseModal)(props => ({
  '& > .MuiPaper-root .MuiBox-root:first-child': {
    paddingBottom: 8,
  },
  '& > .MuiPaper-root .MuiBox-root:first-child h5': {
    lineHeight: '2em',
  },
  '& > .MuiPaper-root > h6': {
    textAlign: 'center',
    color: 'var(--dcl-silver)',
  },
  '& > .MuiBackdrop-root': {
    transition: 'none!important',
  },
  '& > .MuiPaper-root': {
    backgroundImage: 'none',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  '& [aria-label="back"]':
    props.onBack !== onBackNoop
      ? {}
      : {
          opacity: 0,
          cursor: 'default',
        },
}));
