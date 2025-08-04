export type Value = {
  name: string;
  path: string;
};

export type Props = {
  open: boolean;
  initialValue: Value;
  onClose(): void;
  onSubmit(value: Value): void;
};
