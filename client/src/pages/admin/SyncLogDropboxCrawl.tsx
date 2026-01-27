import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import DropboxTokenDialog from '../../components/admin/DropboxTokenDialog';
import { useState } from 'react';

export default function SyncLogDropboxCrawl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') as 'success' | 'failed' | undefined;
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sync-log', 'dropbox_crawl', page, status, startDate, endDate],
    queryFn: () =>
      api.getSyncLog(
        page,
        limit,
        'dropbox_crawl',
        undefined,
        status,
        startDate || undefined,
        endDate || undefined
      ),
  });

  const crawlMutation = useMutation({
    mutationFn: (token: string) => api.triggerDropboxCrawl('Dennis', token),
    onSuccess: () => {
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-sync-log', 'dropbox_crawl'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

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

  const handleRunSync = (token: string) => {
    crawlMutation.mutate(token);
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
          <Typography variant="h4">Crawl Dropbox Log</Typography>
        </Box>

        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
          disabled={crawlMutation.isPending}
        >
          {crawlMutation.isPending ? 'Running...' : 'Crawl Dropbox'}
        </Button>
      </Box>

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

      <DropboxTokenDialog
        open={dialogOpen}
        title="Run Crawl Dropbox"
        onClose={() => setDialogOpen(false)}
        onConfirm={handleRunSync}
        isLoading={crawlMutation.isPending}
      />
    </Container>
  );
}