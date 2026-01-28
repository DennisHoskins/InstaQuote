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
      />
    </Box>
  );
}