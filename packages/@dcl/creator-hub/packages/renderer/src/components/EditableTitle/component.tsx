import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import type { Props } from './types';

import './styles.css';

export function EditableTitle({ initialValue, onChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSpanClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    onChange(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        setValue(initialValue);
      } else if (e.key === 'Enter') {
        setIsEditing(false);
        onChange(value);
      }
    },
    [initialValue, value],
  );

  return (
    <div className="EditableTitle">
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span onClick={handleSpanClick}>{value}</span>
      )}
    </div>
  );
}

export default EditableTitle;
