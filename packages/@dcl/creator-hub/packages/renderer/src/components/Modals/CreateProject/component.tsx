import { useCallback, useState } from 'react';
import {
  Box,
  IconButton,
  OutlinedInput,
  Typography,
  FormGroup,
  InputAdornment,
  CircularProgress as Loader,
} from 'decentraland-ui2';
import FolderIcon from '@mui/icons-material/Folder';

import { t } from '/@/modules/store/translation/utils';

import { useWorkspace } from '/@/hooks/useWorkspace';

import { PublishModal as Modal } from '../PublishProject/PublishModal';
import { Button } from '../../Button';

import type { Props, Value } from './types';

import './styles.css';

export function CreateProject({ open, initialValue, onClose, onSubmit }: Props) {
  const { validateProjectPath, selectNewProjectPath } = useWorkspace();
  const [value, setValue] = useState<Value>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = useCallback(async () => {
    setLoading(true);
    const valid = await validateProjectPath(`${value.path}/${value.name}`);
    if (!valid) setError(t('modal.create_project.errors.path_exists'));
    setLoading(false);
    return valid;
  }, [value, validateProjectPath]);

  const handleChange = useCallback(
    (key: keyof Value) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValue(prev => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleOpenFolder = useCallback(async () => {
    setError(null);
    setLoading(true);
    const folder = await selectNewProjectPath();
    setLoading(false);
    if (folder) setValue({ ...value, path: folder });
  }, [value]);

  const handleSubmit = useCallback(async () => {
    const valid = await validate();
    if (valid) onSubmit(value);
  }, [onSubmit, value, validate, error]);

  return (
    <Modal
      open={open}
      title={t('modal.create_project.title')}
      onClose={onClose}
      size="medium"
      actions={
        <>
          <Button
            color="secondary"
            onClick={onClose}
          >
            {t('modal.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !!error}
          >
            {loading ? <Loader size={20} /> : t('modal.create_project.actions.create')}
          </Button>
        </>
      }
    >
      <Box className="CreateProjectModal">
        <FormGroup className="CreateProjectFormControl">
          <Typography variant="body1">{t('modal.create_project.fields.name')}</Typography>
          <OutlinedInput
            color="secondary"
            value={value.name}
            onChange={handleChange('name')}
          />
          <Typography variant="body1">{t('modal.create_project.fields.path')}</Typography>
          <OutlinedInput
            color="secondary"
            value={value.path}
            onChange={handleChange('path')}
            onBlur={validate}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={handleOpenFolder}
                  edge="end"
                >
                  <FolderIcon />
                </IconButton>
              </InputAdornment>
            }
          />
          {error && (
            <Typography
              variant="body1"
              className="error"
            >
              {error}
            </Typography>
          )}
        </FormGroup>
      </Box>
    </Modal>
  );
}
