import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Container, Typography, Box, CircularProgress, Alert, Grid, Button } from '@mui/material';
import NavBar from '../components/NavBar';

export default function ItemDetail() {
  const { itemCode } = useParams<{ itemCode: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemCode],
    queryFn: () => api.getItem(itemCode!),
    enabled: !!itemCode,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !item) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Item not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
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
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Typography variant="h4">
           {item.item_code}
          </Typography>
        </Box>

        <NavBar />
      </Box>

      <Grid container spacing={4}>
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            {item.description}
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Category:</strong> {item.category}
            </Typography>

            <Typography variant="body1" gutterBottom>
              <strong>Destination:</strong> {item.destination}
            </Typography>

            <Typography variant="h3" sx={{ mt: 3 }} color="primary" fontWeight="bold">
              ${Number(item.total_ws_price).toFixed(2)}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 4 }}
          >
            Add to Cart (Coming Soon)
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}