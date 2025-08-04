import type { PopperProps } from '@mui/material/Popper';

export type Props = PopperProps & {
  onClose: () => void;
};
