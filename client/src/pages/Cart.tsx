import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Container, Typography, Box, Button, IconButton, TextField, Paper, Grid, Alert, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NavBar from '../components/NavBar';

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, total, itemCount } = useCart();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');

  const submitOrderMutation = useMutation({
    mutationFn: api.submitOrder,
    onSuccess: (response) => {
      console.log('Order submitted successfully:', response);
      console.log('Mock email notification sent to:', user?.email);
      clearCart();
      navigate(`/order-confirmation/${response.order.id}`, { 
        state: { 
          orderNumber: response.order.order_number,
          customerEmail: user?.email 
        } 
      });
    },
    onError: (error: any) => {
      console.error('Order submission failed:', error);
    },
  });

  const handleSubmitOrder = () => {
    if (!user) {
      alert('You must be logged in to place an order');
      return;
    }

    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    submitOrderMutation.mutate({
      customer_name: user.username,
      customer_email: user.email,
      notes: notes || undefined,
      items: items.map(item => ({
        item_code: item.item_code,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
      })),
    });
  };

  if (items.length === 0) {
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
            <Typography variant="h4">Shopping Cart</Typography>
          </Box>
          <NavBar />
        </Box>

        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your cart is empty
          </Typography>
          <Button 
            variant="contained" 
            component={Link} 
            to="/catalog"
            sx={{ mt: 2 }}
          >
            Browse Catalog
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
          <Typography variant="h4">Shopping Cart ({itemCount})</Typography>
        </Box>
        <NavBar />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant='outlined'>
            {items.map((item) => (
              <Box
                key={item.item_code}
                sx={{
                  p: 2,
                  display: 'flex',
                  gap: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                {/* Image */}
                <Link to={`/item/${item.item_code}`}>
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: item.image_url ? 'white' : 'grey.200',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.description}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No Image
                      </Typography>
                    )}
                  </Box>
                </Link>

                {/* Item Details */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography 
                    variant="h6" 
                    component={Link}
                    to={`/item/${item.item_code}`}
                    sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                  >
                    {item.item_code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Category: {item.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ${Number(item.unit_price).toFixed(2)} each
                  </Typography>
                </Box>

                {/* Quantity & Price */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => removeItem(item.item_code)}
                    >
                      <DeleteIcon />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > 0) {
                          updateQuantity(item.item_code, value);
                        }
                      }}
                      inputProps={{ min: 1, style: { textAlign: 'center' } }}
                      sx={{ width: 80 }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ p: 3, pt: 0, position: 'sticky', top: 20 }}>
            <Typography variant="h5" gutterBottom>
              Order Summary
            </Typography>

            {/* Notes Field */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Notes / Special Instructions (optional)"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
              />
            </Box>

            <Box sx={{ my: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Items:</Typography>
                <Typography variant="body1">{itemCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">${total.toFixed(2)}</Typography>
              </Box>
            </Box>

            <Box sx={{ borderTop: '2px solid', borderColor: 'divider', pt: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h4" color="primary">
                  ${total.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {submitOrderMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to submit order. Please try again.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmitOrder}
              disabled={submitOrderMutation.isPending || items.length === 0}
            >
              {submitOrderMutation.isPending ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  Submitting...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}