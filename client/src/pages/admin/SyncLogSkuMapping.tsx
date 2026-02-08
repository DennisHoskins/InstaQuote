import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  Button,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SyncLogTable from '../../components/admin/SyncLogTable';
import PaginationControls from '../../components/PaginationControls';
import SyncTriggerButton from '../../components/admin/SyncTriggerButton';
import StatusMessage from '../../components/StatusMessage';
import ErrorAlert from '../../components/ErrorAlert';

export default function SyncLogSkuMapping() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
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
    queryKey: ['sync-status', 'sku_mapping'],
    queryFn: () => api.getSyncStatus('sku_mapping'),
    enabled: isAuthenticated,
  });

  const isRunning = syncStatusData?.isRunning || false;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sync-log', 'sku_mapping', page, status, startDate, endDate],
    queryFn: () =>
      api.getSyncLog(
        page,
        limit,
        'sku_mapping',
        undefined,
        status,
        startDate || undefined,
        endDate || undefined
      ),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => fetch(`http://localhost:3001/api/admin/sync/mappings/all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: 'Dennis' }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to delete all mappings');
      return res.json();
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sku-images'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sku-images-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_mapping'] });
      setStatusMessage({ 
        type: 'success', 
        message: `Successfully deleted ${data.mappingsDeleted} SKU image mappings` 
      });
    },
    onError: (error: Error) => {
      setStatusMessage({ 
        type: 'error', 
        message: `Failed to delete mappings: ${error.message}` 
      });
    },
  });

  // Show running message on initial load if sync is running
  useEffect(() => {
    if (isRunning && !statusMessage) {
      setStatusMessage({ type: 'info', message: 'SKU mapping generation is running...' });
      wasRunning.current = true;
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
      queryClient.invalidateQueries({ queryKey: ['sync-status', 'sku_mapping'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_mapping'] });
    }, 10000);

    return () => clearInterval(interval);
  }, [isRunning, queryClient]);

  // Detect completion: was running, now stopped, and we have a REAL completed entry
  useEffect(() => {
    if (!wasRunning.current || isRunning) {
      return;
    }

    const realEntries = data?.items?.filter((item: any) => !String(item.id).startsWith('temp-')) || [];
    const mostRecentEntry = realEntries[0];
    
    if (!mostRecentEntry || !mostRecentEntry.completed_at) {
      return;
    }
    
    // Only show success for entries that started AFTER we began watching
    // If syncStartTime is null, we loaded into a running sync, so accept any completed entry
    if (syncStartTime.current && mostRecentEntry.started_at < syncStartTime.current) {
      return;
    }
    
    wasRunning.current = false;
    syncStartTime.current = null;
    
    if (mostRecentEntry.status === 'success') {
      setStatusMessage({ 
        type: 'success', 
        message: `Generate SKU Mappings completed successfully (${mostRecentEntry.items_synced || 0} items)` 
      });
    } else if (mostRecentEntry.status === 'failed') {
      setStatusMessage({ 
        type: 'error', 
        message: mostRecentEntry.error_message || 'Sync failed' 
      });
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
          ['admin-sync-log', 'sku_mapping', page, status, startDate, endDate],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            const optimisticEntry = {
              id: 'temp-' + Date.now(),
              sync_type: 'sku_mapping',
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

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL SKU image mappings? This cannot be undone.'
    );
    if (confirmed) {
      deleteAllMutation.mutate();
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
    return <ErrorAlert message="Failed to load sync log" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="SKU Mapping Log"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
        rightAction={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending || isRunning}
            >
              {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Mappings'}
            </Button>
            
            <SyncTriggerButton
              title="Generate SKU Mappings"
              buttonText="Generate Matches"
              requiresToken={false}
              apiCall={() => api.triggerGenerateMappings('Dennis')}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_mapping'] });
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['sync-status', 'sku_mapping'] });
              }}
              onStatusChange={handleSyncStatusChange}
              disabled={isRunning}
            />
          </Box>
        }
      />

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