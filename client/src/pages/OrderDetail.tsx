import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import NavBar from '../components/NavBar';
import { useCart } from '../contexts/CartContext';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(parseInt(id!)),
    enabled: !!id,
  });

  const reorderMutation = useMutation({
    mutationFn: () => api.reorder(parseInt(id!)),
    onSuccess: (response) => {
      // Add all items to cart
      response.cart_items.forEach((cartItem: any) => {
        addItem({
          item_code: cartItem.item_code,
          sku: cartItem.item_details.sku,
          description: cartItem.item_details.description,
          category: cartItem.item_details.category,
          unit_price: cartItem.current_price,
          image_url: cartItem.item_details.image_url,
        }, cartItem.quantity);
      });
      
      // Navigate to cart
      navigate('/cart');
    },
    onError: (error: any) => {
      console.error('Reorder failed:', error);
    },
  });

  const handleExport = () => {
    if (!data) return;

    const { order, items } = data;

    // Create CSV content
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
      `Notes: "${order.notes || ''}"`,
      '',
      headers.join(','),
      ...rows.map((row: string[]) => row.join(',')),
      '',
      `Total:,,,,$${order.total_amount.toFixed(2)}`
    ].join('\n');

    // Download CSV
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

  if (error || !data) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Order not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  const { order, items } = data;

  const statusColorMap: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
    pending: 'default',
    processing: 'primary',
    completed: 'success',
    cancelled: 'error',
  };

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
          <Button variant="outlined" component={Link} to="/orders">
            Back to Orders
          </Button>
          <Typography variant="h4">{order.order_number}</Typography>
        </Box>
        <NavBar />
      </Box>

      <Grid container spacing={3}>
        {/* Order Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Order Details</Typography>
              <Chip 
                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)} 
                color={statusColorMap[order.status] || 'default'}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={6}>
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
              </Grid>

              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1">{order.user_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.user_email}
                </Typography>
              </Grid>

              {order.notes && (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1">{order.notes}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Order Items */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items ({items.length})
            </Typography>
            
            {items.map((item: any) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box>
                  <Typography 
                    variant="body1"
                    component={Link}
                    to={`/item/${item.item_code}`}
                    sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                  >
                    {item.item_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${Number(item.unit_price).toFixed(2)} × {item.quantity}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight="medium">
                  ${Number(item.line_total).toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, position: 'sticky', top: 20 }}>
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

            {reorderMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to reorder. Please try again.
              </Alert>
            )}

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              sx={{ mb: 2 }}
            >
              Export Order
            </Button>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => reorderMutation.mutate()}
              disabled={reorderMutation.isPending}
            >
              {reorderMutation.isPending ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  Loading...
                </>
              ) : (
                'Reorder'
              )}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}