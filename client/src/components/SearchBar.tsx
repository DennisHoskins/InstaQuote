import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Button } from '@mui/material';

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  compact?: boolean;
}

export default function SearchBar({ onSearch, placeholder = 'Search...', initialValue = '', compact = false }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: compact ? 0 : 3, display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputRef={inputRef}
        slotProps={{ htmlInput: { style: { padding: '0 14px', height: compact ? '36px' : '54px' } } }}
      />
      <Button variant="contained" type="submit" sx={{ px: compact ? undefined : 4, height: compact ? '37px' : '56px' }}>
        Search
      </Button>
    </Box>
  );
}