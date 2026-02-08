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
  Grid,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import Table from '../../components/Table';
import ErrorAlert from '../../components/ErrorAlert';
import type { Column } from '../../components/Table';
import { exportOrderPdf } from '../../utils/exportPdf';

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
    exportOrderPdf(order, order.items);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return <ErrorAlert message="Failed to load order details" />;
  }

  const items = order.items;

  const itemColumns: Column[] = [
    {
      key: 'image_url',
      label: 'Image',
      format: (value) => {
        if (value) {
          return (
            <Box
              component="img"
              src={value}
              alt="Item"
              sx={{
                width: 50,
                height: 50,
                objectFit: 'contain',
                borderRadius: 1,
                bgcolor: 'white',
              }}
            />
          );
        }
        return (
          <Box
            sx={{
              width: 50,
              height: 50,
              bgcolor: 'grey.200',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'text.secondary',
            }}
          >
            No Image
          </Box>
        );
      },
    },
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
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExport}
              sx={{ mb: 1 }}
            >
              Download PDF
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
                Order updated successfully.
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}