import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import DownloadIcon from '@mui/icons-material/Download';
import Table from '../components/Table';
import type { Column } from '../components/Table';
import PaginationControls from '../components/PaginationControls';
import ErrorAlert from '../components/ErrorAlert';
import { exportOrdersListCsv } from '../utils/exportCsv';

export default function Orders() {
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
    queryKey: ['orders', page, search, status, startDate, endDate],
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
    if (!data || !data.items.length) return;
    exportOrdersListCsv(data.items, false);
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

  if (!data || data.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <PageHeader
          title="My Orders"
          breadcrumbs={[{ label: 'Home', to: '/' }]}
        />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No orders yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your order history will appear here after you place an order.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="My Orders"
        breadcrumbs={[{ label: 'Home', to: '/' }]}
      />

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by order number..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          sx={{ minWidth: 250 }}
        />

        <Button
          variant="contained"
          onClick={handleSearch}
        >
          Search
        </Button>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value)}
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
          size="small"
        />

        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => handleDateChange('end_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          size="small"
        />

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </Box>

      <Table
        columns={columns}
        data={data.items}
        onRowClick={(order) => navigate(`/orders/${order.id}`)}
        emptyMessage="No orders found"
      />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data.total}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}