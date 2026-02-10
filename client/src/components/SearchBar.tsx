import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Button } from '@mui/material';

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search...', initialValue = '' }: SearchBarProps) {
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
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3, display: 'flex', gap: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
      <Button variant="contained" type="submit" sx={{ px: 4 }}>
        Search
      </Button>
    </Box>
  );
}