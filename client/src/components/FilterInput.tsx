import { useRef, useEffect } from 'react';
import { TextField, Box } from '@mui/material';

interface FilterInputProps {
  onFilter: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
}

export default function FilterInput({ onFilter, onEnter, placeholder = 'Filter...' }: FilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        onChange={(e) => onFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& input': {
              boxSizing: 'content-box',
              height: '1.4375em',
              padding: '16.5px 14px',
              border: 0,
              background: 'none',
            },
            '& fieldset': {
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
          },
        }}
      />
    </Box>
  );
}