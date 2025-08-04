import { useState } from 'react';
import { Collapse, IconButton, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { Props } from './types';

import './styles.css';

export function ExpandMore({ title, text }: Props) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Box className="ExpandMore">
      <Box
        display="flex"
        alignItems="center"
      >
        <IconButton
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={title || 'show more'}
          sx={{
            transform: !expanded ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: theme =>
              theme.transitions.create('transform', {
                duration: theme.transitions.duration.shortest,
              }),
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
        {title && (
          <Typography
            className="title"
            variant="subtitle1"
          >
            {title}
          </Typography>
        )}
      </Box>
      <Collapse
        in={expanded}
        timeout="auto"
        unmountOnExit
      >
        <Typography
          variant="body2"
          sx={{ mt: 1 }}
        >
          {text}
        </Typography>
      </Collapse>
    </Box>
  );
}
