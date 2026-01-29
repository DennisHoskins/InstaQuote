import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import NavBar from '../components/NavBar';
import Table from '../components/Table';
import type { Column } from '../components/Table';
import PaginationControls from '../components/PaginationControls';

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', page, search, status, startDate, endDate],
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
    const params: Record<string, string> = { page: '1' };
    if (value) params.search = value;
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
    if (!data || !data.items.length) return;

    // CSV headers
    const headers = ['Order Number', 'Date', 'Items', 'Total', 'Status'];
    
    // CSV rows
    const rows = data.items.map((order: any) => [
      order.order_number,
      new Date(order.created_at).toLocaleDateString('en-US'),
      order.item_count,
      `$${Number(order.total_amount).toFixed(2)}`,
      order.status
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
        <Alert severity="error">Failed to load order history</Alert>
      </Container>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{ 
            width: '100%', 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" component={Link} to="/">
              Home
            </Button>
            <Typography variant="h4">Order History</Typography>
          </Box>
          <NavBar />
        </Box>

        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No orders yet
          </Typography>
          <Button 
            variant="contained" 
            component={Link} 
            to="/catalog"
            sx={{ mt: 2 }}
          >
            Start Shopping
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{ 
          width: '100%', 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" component={Link} to="/">
            Home
          </Button>
          <Typography variant="h4">Order History</Typography>
        </Box>
        <NavBar />
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
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