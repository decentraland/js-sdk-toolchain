import { type Project } from '/shared/types/projects';

export type Props = {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSubmit: (project: Project) => void;
};
