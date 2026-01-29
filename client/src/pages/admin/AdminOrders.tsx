import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import PaginationControls from '../../components/PaginationControls';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', page, search, status, startDate, endDate],
    queryFn: () => api.getOrders(page, limit, search, status, startDate, endDate),
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

  const handleSearch = (value: string) => {
    const params: Record<string, string> = { search: value, page: '1' };
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    setSearchParams(params);
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

    const headers = ['Order Number', 'Customer', 'Email', 'Date', 'Items', 'Total', 'Status'];
    const rows = data.items.map((order: any) => [
      order.order_number,
      `"${order.user_name.replace(/"/g, '""')}"`,
      order.user_email,
      new Date(order.created_at).toLocaleDateString(),
      order.item_count,
      order.total_amount.toFixed(2),
      order.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load orders</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" component={Link} to="/">
          Home
        </Button>
        <Button variant="outlined" component={Link} to="/admin">
          Admin
        </Button>
        <Typography variant="h4">Orders</Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by order number, customer, or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 300 }}
        />

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
          disabled={!data || data.items.length === 0}
        >
          Export CSV
        </Button>
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