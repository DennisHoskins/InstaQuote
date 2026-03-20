import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  Button,
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
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SyncLogSkuMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') as 'success' | 'failed' | undefined;
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const wasRunning = useRef(false);
  const syncStartedByUser = useRef(false);
  const syncStartTime = useRef<string | null>(null);

  const { data: syncStatusData } = useQuery({
    queryKey: ['sync-status', 'sku_map'],
    queryFn: () => api.getSyncStatus('sku_map'),
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const isRunning = syncStatusData?.isRunning || false;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sync-log', 'sku_map', page, status, startDate, endDate],
    queryFn: () =>
      api.getSyncLog(
        page,
        limit,
        'sku_map' as any,
        undefined,
        status,
        startDate || undefined,
        endDate || undefined
      ),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.deleteAllSkuMappings(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_map'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setStatusMessage({
        type: 'success',
        message: `Successfully deleted ${data.mappingsDeleted} SKU mappings`
      });
    },
    onError: (error: Error) => {
      setStatusMessage({
        type: 'error',
        message: `Failed to delete mappings: ${error.message}`
      });
    },
  });

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete ALL SKU mappings? This cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };  

  useEffect(() => {
    if (isRunning && !statusMessage) {
      setStatusMessage({ type: 'info', message: 'SKU mapping is running...' });
      wasRunning.current = true;
    }
  }, [isRunning, statusMessage]);

  useEffect(() => {
    if (statusMessage?.type === 'success') {
      const timer = setTimeout(() => setStatusMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (!isRunning && wasRunning.current && syncStartedByUser.current) {
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_map'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setStatusMessage({ type: 'success', message: 'SKU mapping completed successfully' });
      wasRunning.current = false;
      syncStartedByUser.current = false;
    }
  }, [isRunning, queryClient]);

  const handleStatusChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (value) params.status = value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (status) params.status = status;
    if (field === 'start_date') { if (value) params.start_date = value; if (endDate) params.end_date = endDate; }
    if (field === 'end_date') { if (startDate) params.start_date = startDate; if (value) params.end_date = value; }
    setSearchParams(params);
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
      if (statusUpdate.type === 'info') {
        syncStartedByUser.current = true;
        wasRunning.current = true;
        syncStartTime.current = new Date().toISOString();
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load sync log" />;

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Map SKUs Log"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
        rightAction={
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending || isRunning}
            >
              {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Mappings'}
            </Button>
            <SyncTriggerButton
              title="Map SKUs"
              buttonText="Map SKUs"
              requiresToken={false}
              apiCall={() => api.triggerMapSkus()}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_map'] });
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['sync-status', 'sku_map'] });
              }}
              onStatusChange={handleSyncStatusChange}
              disabled={isRunning}
            />
          </Box>
        }
      />

      {/* Mobile actions */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleDeleteAll}
          disabled={deleteAllMutation.isPending || isRunning}
        >
          {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All'}
        </Button>
        <SyncTriggerButton
          title="Map SKUs"
          buttonText="Map SKUs"
          requiresToken={false}
          apiCall={() => api.triggerMapSkus()}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'sku_map'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sync-status', 'sku_map'] });
          }}
          onStatusChange={handleSyncStatusChange}
          disabled={isRunning}
        />
      </Box>      

      {statusMessage && (
        <StatusMessage
          type={statusMessage.type}
          message={statusMessage.message}
          onClose={statusMessage.type !== 'info' ? () => setStatusMessage(null) : undefined}
        />
      )}

      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Desktop */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status || ''} label="Status" onChange={(e) => handleStatusChange(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Start Date" type="date" value={startDate}
            onChange={(e) => handleDateChange('start_date', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="End Date" type="date" value={endDate}
            onChange={(e) => handleDateChange('end_date', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
        </Box>

        {/* Mobile */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 2 }}>
          <TextField size="small" label="Start Date" type="date" value={startDate}
            onChange={(e) => handleDateChange('start_date', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
          <TextField size="small" label="End Date" type="date" value={endDate}
            onChange={(e) => handleDateChange('end_date', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        </Box>

        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 2 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status || ''} label="Status" onChange={(e) => handleStatusChange(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Box>

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