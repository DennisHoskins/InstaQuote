import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
} from '@mui/material';

interface SyncLogEditModalProps {
  log: any;
  open: boolean;
  onClose: () => void;
  onMarkFailed: (id: number, errorMessage: string) => void;
}

export default function SyncLogEditModal({ log, open, onClose, onMarkFailed }: SyncLogEditModalProps) {
  const [errorMessage, setErrorMessage] = useState('');

  if (!log) return null;

  const handleMarkFailed = () => {
    onMarkFailed(log.id, errorMessage || 'Manually marked as failed');
    setErrorMessage('');
    onClose();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 100000 }}>
      <DialogTitle>Sync Log Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">ID</Typography>
            <Typography>{log.id}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Type</Typography>
            <Typography sx={{ textTransform: 'capitalize' }}>
              {log.sync_type?.replace(/_/g, ' ')}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">User</Typography>
            <Typography>{log.user_name}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Started</Typography>
            <Typography>{formatDate(log.started_at)}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Completed</Typography>
            <Typography>{formatDate(log.completed_at)}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Duration</Typography>
            <Typography>{formatDuration(log.duration_seconds)}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Items Synced</Typography>
            <Typography>{log.items_synced ?? 'N/A'}</Typography>
          </Box>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography 
              sx={{ 
                color: log.status === 'success' ? 'success.main' : 
                       log.status === 'failed' ? 'error.main' : 
                       'info.main',
                fontWeight: 'bold',
                textTransform: 'capitalize'
              }}
            >
              {log.status}
            </Typography>
          </Box>
          
          {log.error_message && (
            <Box>
              <Typography variant="caption" color="text.secondary">Error Message</Typography>
              <Typography color="error">{log.error_message}</Typography>
            </Box>
          )}

          {log.status === 'running' && (
            <TextField
              fullWidth
              label="Error Message"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Server restarted during sync"
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {log.status === 'running' && (
          <Button onClick={handleMarkFailed} color="warning" variant="contained">
            Mark as Failed
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}