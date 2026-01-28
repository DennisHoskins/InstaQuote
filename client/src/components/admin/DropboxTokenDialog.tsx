import { useState } from 'react';
import Link from '@mui/material/Link';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';

interface DropboxTokenDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (token: string) => void;
  isLoading: boolean;
}

export default function DropboxTokenDialog({
  open,
  title,
  onClose,
  onConfirm,
  isLoading,
}: DropboxTokenDialogProps) {
  const [token, setToken] = useState('');

  const handleConfirm = () => {
    if (token) {
      onConfirm(token);
      setToken(''); // Clear after confirm
    }
  };

  const handleClose = () => {
    setToken('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth={true} maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2}}>
          Please enter your Dropbox token to proceed.
          <Link href="https://www.dropbox.com/developers/apps/info/fbwz99qavkci6c2" target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
            Click here to get a fresh token.
          </Link>
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Dropbox Token"
          type="password"
          fullWidth
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter' && token) {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!token || isLoading}
        >
          {isLoading ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}