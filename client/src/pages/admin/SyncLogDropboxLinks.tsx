import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import SyncLogTable from '../../components/admin/SyncLogTable';
import PaginationControls from '../../components/PaginationControls';
import SyncTriggerButton from '../../components/admin/SyncTriggerButton';
import StatusMessage from '../../components/StatusMessage';

export default function SyncLogDropboxLinks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') as 'success' | 'failed' | undefined;
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const syncStartedByUser = useRef(false);
  const wasRunning = useRef(false);
  const syncStartTime = useRef<string | null>(null);

  // Check if sync is running
  const { data: syncStatusData } = useQuery({
    queryKey: ['sync-status', 'dropbox_links'],
    queryFn: () => api.getSyncStatus('dropbox_links'),
  });

  // Get missing links count
  const { data: missingLinksData } = useQuery({
    queryKey: ['missing-links-count'],
    queryFn: () => api.getMissingLinksCount(),
  });

  const isRunning = syncStatusData?.isRunning || false;
  const missingLinks = missingLinksData?.missingLinks ?? 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sync-log', 'dropbox_links', page, status, startDate, endDate],
    queryFn: () =>
      api.getSyncLog(
        page,
        limit,
        'dropbox_links',
        undefined,
        status,
        startDate || undefined,
        endDate || undefined
      ),
  });

  // Show running message on initial load if sync is running
  useEffect(() => {
    if (isRunning && !statusMessage) {
      setStatusMessage({ type: 'info', message: 'Link creation is running...' });
      wasRunning.current = true;
      // Set sync start time to now if we're loading into a running sync
      // if (!syncStartTime.current) {
      //   syncStartTime.current = new Date().toISOString();
      // }
    }
  }, [isRunning, statusMessage]);

  // Auto-dismiss success messages after 10 seconds
  useEffect(() => {
    if (statusMessage?.type === 'success') {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Poll for status updates if sync is running
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    wasRunning.current = true;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sync-status', 'dropbox_links'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'dropbox_links'] });
      queryClient.invalidateQueries({ queryKey: ['missing-links-count'] });
    }, 10000);

    return () => clearInterval(interval);
  }, [isRunning, queryClient]);

  // Detect completion: was running, now stopped, and we have a REAL completed entry
  useEffect(() => {
    console.log('[Completion Effect]', {
      wasRunning: wasRunning.current,
      isRunning,
      hasData: !!data?.items?.length,
      mostRecentStatus: data?.items?.[0]?.status,
      syncStartTime: syncStartTime.current
    });
    
    if (!wasRunning.current || isRunning) {
      return;
    }

    const realEntries = data?.items?.filter((item: any) => !String(item.id).startsWith('temp-')) || [];
    const mostRecentEntry = realEntries[0];
    
    console.log('[Completion Effect] Real entries:', realEntries.length, 'Most recent:', mostRecentEntry);
    
    if (!mostRecentEntry || !mostRecentEntry.completed_at) {
      console.log('[Completion Effect] No completed entry yet');
      return;
    }
    
    // Only show success for entries that started AFTER we began watching
    // If syncStartTime is null, we loaded into a running sync, so accept any completed entry
    if (syncStartTime.current && mostRecentEntry.started_at < syncStartTime.current) {
      console.log('[Completion Effect] Ignoring old entry from before sync started', {
        entryStarted: mostRecentEntry.started_at,
        syncStartTime: syncStartTime.current
      });
      return;
    }
    
    console.log('[Completion Effect] Conditions met, checking most recent entry');
    wasRunning.current = false;
    syncStartTime.current = null;
    
    console.log('[Completion Effect] Most recent entry:', mostRecentEntry);
    
    if (mostRecentEntry.status === 'success') {
      console.log('[Completion Effect] Setting success message');
      setStatusMessage({ 
        type: 'success', 
        message: `Create Dropbox Links completed successfully (${mostRecentEntry.items_synced || 0} items)` 
      });
    } else if (mostRecentEntry.status === 'failed') {
      console.log('[Completion Effect] Setting error message');
      setStatusMessage({ 
        type: 'error', 
        message: mostRecentEntry.error_message || 'Sync failed' 
      });
    } else {
      console.log('[Completion Effect] Status is not success or failed:', mostRecentEntry.status);
    }
    
    syncStartedByUser.current = false;
  }, [isRunning, data]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params: Record<string, string> = { page: '1' };

    if (updates.status !== undefined) {
      if (updates.status) params.status = updates.status;
    } else if (status) {
      params.status = status;
    }

    if (updates.start_date !== undefined) {
      if (updates.start_date) params.start_date = updates.start_date;
    } else if (startDate) {
      params.start_date = startDate;
    }

    if (updates.end_date !== undefined) {
      if (updates.end_date) params.end_date = updates.end_date;
    } else if (endDate) {
      params.end_date = endDate;
    }

    setSearchParams(params);
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value });
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    updateParams({ [field]: value || undefined });
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  const handleSyncStatusChange = (statusUpdate: { type: 'info' | 'success' | 'error'; message: string } | null) => {
    if (statusUpdate) {
      setStatusMessage(statusUpdate);
      
      // Mark that user started this sync
      if (statusUpdate.type === 'info') {
        syncStartedByUser.current = true;
        wasRunning.current = true;
        syncStartTime.current = new Date().toISOString();
      }
      
      // If starting a sync (info), add optimistic "running" entry to the table
      if (statusUpdate.type === 'info') {
        queryClient.setQueryData(
          ['admin-sync-log', 'dropbox_links', page, status, startDate, endDate],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            const optimisticEntry = {
              id: 'temp-' + Date.now(),
              sync_type: 'dropbox_links',
              user_name: 'Dennis',
              started_at: new Date().toISOString(),
              completed_at: null,
              duration_seconds: null,
              items_synced: null,
              status: 'running',
              error_message: null,
            };
            
            return {
              ...oldData,
              items: [optimisticEntry, ...oldData.items],
              total: oldData.total + 1,
            };
          }
        );
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load sync log</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" component={Link} to="/">
            Home
          </Button>
          <Button variant="outlined" component={Link} to="/admin">
            Admin
          </Button>
          <Typography variant="h4">Create Dropbox Links Log</Typography>
        </Box>

        <SyncTriggerButton
          title="Create Dropbox Links"
          buttonText={`Create Links (${missingLinks})`}
          requiresToken={true}
          apiCall={(token) => api.triggerCreateLinks('Dennis', token!)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'dropbox_links'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sync-status', 'dropbox_links'] });
            queryClient.invalidateQueries({ queryKey: ['missing-links-count'] });
          }}
          onStatusChange={handleSyncStatusChange}
          disabled={isRunning || missingLinks === 0}
        />
      </Box>

      {statusMessage && (
        <StatusMessage
          type={statusMessage.type}
          message={statusMessage.message}
          onClose={statusMessage.type !== 'info' ? () => setStatusMessage(null) : undefined}
        />
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status || ''}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => handleDateChange('start_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />

        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => handleDateChange('end_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />
      </Box>

      <SyncLogTable logs={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}