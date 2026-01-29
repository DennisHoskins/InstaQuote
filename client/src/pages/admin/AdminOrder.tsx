import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';

export default function AdminOrder() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => api.getOrder(parseInt(id!)),
    enabled: isAuthenticated && !!id,
  });

  useEffect(() => {
    if (order) {
      setEditStatus(order.status);
      setEditNotes(order.notes || '');
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: (updates: { status?: string; notes?: string }) =>
      api.updateOrder(parseInt(id!), updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteOrder(parseInt(id!)),
    onSuccess: () => {
      navigate('/admin/orders');
    },
  });

  const handleSave = () => {
    const updates: { status?: string; notes?: string } = {};
    
    if (editStatus !== order?.status) {
      updates.status = editStatus;
    }
    
    if (editNotes !== (order?.notes || '')) {
      updates.notes = editNotes;
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleExport = () => {
    if (!order) return;

    const items = order.items;

    const headers = ['Item Code', 'Description', 'Quantity', 'Unit Price', 'Subtotal'];
    const rows = items.map((item: any) => [
      item.item_code,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.quantity,
      item.unit_price.toFixed(2),
      (item.quantity * item.unit_price).toFixed(2),
    ]);

    const csvContent = [
      `Order Number: ${order.order_number}`,
      `Order Date: ${new Date(order.created_at).toLocaleDateString()}`,
      `Customer: ${order.user_name}`,
      `Email: ${order.user_email}`,
      `Status: ${order.status}`,
      `Notes: "${(order.notes || '').replace(/"/g, '""')}"`,
      '',
      headers.join(','),
      ...rows.map((row: string[]) => row.join(',')),
      '',
      `Total:,,,,$${order.total_amount.toFixed(2)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.order_number}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Order not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  const items = order.items;

  const itemColumns: Column[] = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { 
      key: 'unit_price', 
      label: 'Unit Price',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`
    },
    { 
      key: 'line_total', 
      label: 'Subtotal',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`
    },
  ];

  const hasChanges = editStatus !== order.status || editNotes !== (order.notes || '');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title={order.order_number}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'Orders', to: '/admin/orders' }
        ]}
        showNavBar={false}
      />

      <Grid container spacing={3}>
        {/* Order Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Order Items */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Items ({items.length})
            </Typography>
            <Table
              columns={itemColumns}
              data={items}
              emptyMessage="No items in this order"
              onRowClick={(item) => navigate(`/item/${item.item_code}`)}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>

          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ${Number(order.total_amount).toFixed(2)}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              sx={{ mb: 1 }}
            >
              Export Order
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Order'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">
                Order Date
              </Typography>
              <Typography variant="body1">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">
                Customer
              </Typography>
              <Typography variant="body1">{order.user_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {order.user_email}
              </Typography>
            </Box>

            {order.updated_at && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {new Date(order.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            )}
          </Box>


          {/* Edit Form Sidebar */}
          <Box sx={{ mt: 4 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editStatus}
                label="Status"
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            {updateMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to update order. Please try again.
              </Alert>
            )}

            {updateMutation.isSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Order updated successfully
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              sx={{ mb: 1 }}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}