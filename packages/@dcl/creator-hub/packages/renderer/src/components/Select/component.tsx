import { type SelectProps, Select as SelectUI } from 'decentraland-ui2';

import './styles.css';

export function Select<T extends string>(props: SelectProps<T>) {
  return (
    <SelectUI
      className="Select"
      variant="standard"
      value={props.value}
      onChange={props.onChange}
      MenuProps={{
        className: 'SelectMenu',
      }}
    >
      {props.children}
    </SelectUI>
  );
}
