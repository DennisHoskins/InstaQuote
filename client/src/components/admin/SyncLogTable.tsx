import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import Table from '../Table';
import type { Column } from '../Table';
import SyncLogEditModal from './SyncLogEditModal';
import { api } from '../../api/admin';

export interface SyncLog {
  id: string;
  sync_type: string;
  user_name: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  items_synced: number;
  status: string;
  error_message: string;
}

interface SyncLogTableProps {
  logs: SyncLog[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const columns: Column[] = [
  { 
    key: 'started_at', 
    label: 'Started',
    format: (value) => formatDate(value)
  },
  { 
    key: 'user_name', 
    label: 'User',
    mobileHide: true
  },
  { 
    key: 'duration_seconds', 
    label: 'Duration',
    format: (value) => `${parseFloat(value).toFixed(1)}s`,
    mobileHide: true
  },
  { 
    key: 'items_synced', 
    label: 'Items Synced',
    align: 'right',
    format: (value) => value?.toLocaleString() ?? ''
  },
  { 
    key: 'status', 
    label: 'Status',
    format: (value) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {value === 'success' ? (
          <CheckCircleIcon color="success" fontSize="small" />
        ) : value === 'running' ? (
          <AutorenewIcon color="info" fontSize="small" />
        ) : (
          <ErrorIcon color="error" fontSize="small" />
        )}
        <Typography
          variant="body2"
          color={value === 'success' ? 'success.main' : 'error.main'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Typography>
      </Box>
    )
  },
  { 
    key: 'error_message', 
    label: 'Error',
    format: (value) => value ? (
      <Typography variant="body2" color="error">
        {value}
      </Typography>
    ) : null,
    mobileHide: true
  },
];

export default function SyncLogTable({ logs }: SyncLogTableProps) {
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const queryClient = useQueryClient();

  const markFailedMutation = useMutation({
    mutationFn: ({ id, errorMessage }: { id: number; errorMessage: string }) =>
      api.markSyncAsFailed(id, errorMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const handleMarkFailed = (id: number, errorMessage: string) => {
    markFailedMutation.mutate({ id, errorMessage });
  };

  return (
    <>
      <Table
        columns={columns}
        data={logs}
        emptyMessage="No sync logs found"
        onRowClick={(row) => setSelectedLog(row as SyncLog)}
      />

      <SyncLogEditModal
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        onMarkFailed={handleMarkFailed}
      />
    </>
  );
}