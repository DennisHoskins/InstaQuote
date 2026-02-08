import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';
import { Container, Typography, Box, CircularProgress, Grid, Button, Alert } from '@mui/material';
import PageHeader from '../components/PageHeader';
import ErrorAlert from '../components/ErrorAlert';

export default function ItemDetail() {
  const { itemCode } = useParams<{ itemCode: string }>();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemCode],
    queryFn: () => api.getItem(itemCode!),
    enabled: isAuthenticated && !!itemCode,
  });

  const handleAddToCart = () => {
    if (!item) return;

    addItem({
      item_code: item.item_code,
      sku: item.sku,
      description: item.description,
      category: item.category,
      unit_price: item.total_ws_price,
      image_url: item.image_url,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !item) {
    return <ErrorAlert message="Failed to load item details" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title={item.item_code}
        breadcrumbs={[{ label: 'Back', to: '..' }]}
      />

      {showSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Added to cart!
        </Alert>
      )}

      <Grid container spacing={4} sx={{ display: 'flex' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              width: '100%',
              height: 400,
              bgcolor: item.image_url ? 'white' : 'grey.200',
              border: '1px solid',
              borderColor: 'grey.300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
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
              <Typography variant="h6" color="text.secondary">
                No Image Available
              </Typography>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ flexGrow: 1,  display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom>
            {item.description}
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Category:</strong> {item.category}
            </Typography>

            <Typography variant="body1" gutterBottom>
              <strong>Destination:</strong> {item.destination}
            </Typography>

          </Box>

          <Typography variant="h3" sx={{ mt: 3 }} color="primary" fontWeight="bold">
            ${Number(item.total_ws_price).toFixed(2)}
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 4, alignSelf: 'flex-end' }}
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}