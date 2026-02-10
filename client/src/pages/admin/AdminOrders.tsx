import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import DownloadIcon from '@mui/icons-material/Download';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import ErrorAlert from '../../components/ErrorAlert';
import PaginationControls from '../../components/PaginationControls';
import { exportOrdersListCsv } from '../../utils/exportCsv';

export default function AdminOrders() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const [localSearch, setLocalSearch] = useState(search);

  // Sync local search with URL param
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', page, search, status, startDate, endDate],
    queryFn: () => api.getOrders(page, limit, search, status, startDate, endDate),
    enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  const handleSearch = () => {
    const params: Record<string, string> = { page: '1' };
    if (localSearch) params.search = localSearch;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleStatusChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (value) params.status = value;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (status) params.status = status;
    if (field === 'start_date') {
      if (value) params.start_date = value;
      if (endDate) params.end_date = endDate;
    } else {
      if (startDate) params.start_date = startDate;
      if (value) params.end_date = value;
    }
    setSearchParams(params);
  };

  const handleExport = () => {
    if (!data || data.items.length === 0) return;
    exportOrdersListCsv(data.items, true);
  };

  const columns: Column[] = [
    { 
      key: 'order_number', 
      label: 'Order Number',
      format: (value) => (
        <Typography variant="body2" fontWeight="medium">
          {value}
        </Typography>
      )
    },
    { key: 'user_name', label: 'Customer' },
    { key: 'user_email', label: 'Email', mobileHide: true },
    { 
      key: 'created_at', 
      label: 'Date',
      format: (value) => new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      mobileHide: true
    },
    { 
      key: 'item_count', 
      label: 'Items',
      align: 'right',
      format: (value) => value.toLocaleString()
    },
    { 
      key: 'total_amount', 
      label: 'Total',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`
    },
    { 
      key: 'status', 
      label: 'Status',
      format: (value) => {
        const colorMap: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
          pending: 'default',
          processing: 'primary',
          completed: 'success',
          cancelled: 'error',
        };
        return (
          <Chip 
            label={value.charAt(0).toUpperCase() + value.slice(1)} 
            color={colorMap[value] || 'default'}
            size="small"
          />
        );
      }
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert message="Failed to load orders" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="Orders"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
        rightAction={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={!data || data.items.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          autoFocus
          placeholder="Search by order number, customer, or email..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          sx={{
            minWidth: 300,
            flexGrow: 1,
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

        <Button
          variant="contained"
          onClick={handleSearch}
        >
          Search
        </Button>

        <FormControl sx={{ minWidth: 100 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
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

      {!data || data.items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No orders found
          </Typography>
        </Paper>
      ) : (
        <>
          <Table
            columns={columns}
            data={data.items}
            onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
            emptyMessage="No orders found"
          />

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={data.total}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </Container>
  );
}