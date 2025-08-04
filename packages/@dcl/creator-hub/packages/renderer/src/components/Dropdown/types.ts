export type Option = {
  text: string;
  handler: () => unknown;
};

export type Props = {
  options: Option[];
  className?: string;
  selected?: string;
};
