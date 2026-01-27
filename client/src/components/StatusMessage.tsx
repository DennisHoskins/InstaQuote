import { Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';

interface StatusMessageProps {
  type: AlertColor;
  message: string;
  onClose?: () => void;
  sx?: object;
}

export default function StatusMessage({ type, message, onClose, sx }: StatusMessageProps) {
  return (
    <Alert 
      severity={type}
      onClose={onClose}
      sx={{ mb: 3, ...sx }}
    >
      {message}
    </Alert>
  );
}