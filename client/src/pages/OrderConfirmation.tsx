import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Box, Button, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavBar from '../components/NavBar';
import { useEffect } from 'react';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const orderNumber = location.state?.orderNumber;
  const customerEmail = location.state?.customerEmail;

  useEffect(() => {
    // Redirect if no order ID
    if (!orderId) {
      navigate('/');
    }
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
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
          <Typography variant="h4">Order Confirmation</Typography>
        </Box>
        <NavBar />
      </Box>

      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon 
          sx={{ fontSize: 80, color: 'success.main', mb: 2 }} 
        />
        
        <Typography variant="h4" gutterBottom>
          Order Placed Successfully!
        </Typography>

        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order Number:{' '}
          <Link 
            to={`/orders/${orderId}`}
            style={{ 
              color: '#1976d2',
              textDecoration: 'underline',
              fontWeight: 'bold'
            }}
          >
            {orderNumber}
          </Link>
        </Typography>

        <Alert severity="info" sx={{ mt: 3, mb: 3, textAlign: 'left', maxWidth: 'sm', mx: 'auto' }}>
          <Typography variant="body1">
            Thank you for your order! A confirmation email has been sent to: {customerEmail}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          We'll process your order and contact you shortly with shipping details.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            component={Link} 
            to="/orders"
          >
            View Order History
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/catalog"
          >
            Continue Shopping
          </Button>
        </Box>
      </Box>
    </Container>
  );
}