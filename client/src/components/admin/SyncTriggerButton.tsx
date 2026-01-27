import { useState } from 'react';
import { Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import DropboxTokenDialog from './DropboxTokenDialog';

interface SyncTriggerButtonProps {
  title: string;
  buttonText?: string;
  requiresToken: boolean;
  apiCall: (token?: string) => Promise<any>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: { type: 'info' | 'success' | 'error'; message: string } | null) => void;
  disabled?: boolean;
}

export default function SyncTriggerButton({
  title,
  buttonText,
  requiresToken,
  apiCall,
  onSuccess,
  onError,
  onStatusChange,
  disabled = false,
}: SyncTriggerButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: apiCall,
    onMutate: () => {
      // Always show running, regardless of what the server returns
      onStatusChange?.({ type: 'info', message: `${title} is running...` });
    },
    onSuccess: () => {
      // Just refetch queries, don't show any message
      // The page's polling will detect completion
      onSuccess?.();
    },
    onError: (error: Error) => {
      const errorMsg = `Failed to start ${title}: ${error.message}`;
      onStatusChange?.({ type: 'error', message: errorMsg });
      onError?.(error);
    },
  });

  const handleClick = () => {
    if (requiresToken) {
      setDialogOpen(true);
    } else {
      mutation.mutate(undefined);
    }
  };

  const handleConfirm = (token: string) => {
    setDialogOpen(false);
    mutation.mutate(token);
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleClick}
        disabled={mutation.isPending || disabled}
      >
        {mutation.isPending ? 'Running...' : buttonText || `Run ${title}`}
      </Button>

      {requiresToken && (
        <DropboxTokenDialog
          open={dialogOpen}
          title={`Run ${title}`}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
          isLoading={mutation.isPending}
        />
      )}
    </>
  );
}