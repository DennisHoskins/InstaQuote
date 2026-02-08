import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
  Grid,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import ErrorAlert from '../components/ErrorAlert';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { exportOrderPdf } from '../utils/exportPdf';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(parseInt(id!)),
    enabled: isAuthenticated && !!id,
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
    exportOrderPdf(order, items);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <ErrorAlert message="Failed to load order details" />;
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
      <PageHeader 
        title={order.order_number}
        breadcrumbs={[{ label: 'Back to Orders', to: '/orders' }]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Order Items */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Items ({items.length})
            </Typography>

            <Paper variant="outlined">
              {items.map((item: any) => (
                <Box
                  key={item.id}
                  component={Link}
                  to={`/item/${item.item_code}`}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {/* Item Image */}
                  {item.image_url ? (
                    <Box
                      component="img"
                      src={item.image_url}
                      alt={item.description}
                      sx={{
                        width: 60,
                        height: 60,
                        objectFit: 'contain',
                        borderRadius: 1,
                        bgcolor: 'white',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    >
                      No Image
                    </Box>
                  )}

                  {/* Item Details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="h6"
                      sx={{ 
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.item_code}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Box>

                  {/* Quantity and Price */}
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ${item.line_total.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {/* Order Summary */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Chip
                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                color={statusColorMap[order.status] || 'default'}
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Order Date
                </Typography>
                <Typography variant="body2">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Items
                </Typography>
                <Typography variant="body2">
                  {items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ${order.total_amount.toFixed(2)}
              </Typography>
            </Box>

            {order.notes && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2">{order.notes}</Typography>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => reorderMutation.mutate()}
              disabled={reorderMutation.isPending}
              sx={{ mb: 1 }}
            >
              {reorderMutation.isPending ? 'Adding to Cart...' : 'Reorder'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExport}
            >
              Download PDF
            </Button>

            {reorderMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to reorder. Some items may no longer be available.
              </Alert>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}