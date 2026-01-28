import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Container, Typography, Box, Button, CircularProgress, Alert, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import FilterInput from '../components/FilterInput';
import NavBar from '../components/NavBar';

export default function Destinations() {
  const [filterText, setFilterText] = useState('');

  // Fetch all destinations once (no search param)
  const { data: allDestinations, isLoading, error } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api.getDestinations(),
  });

  // Filter client-side
  const filteredDestinations = useMemo(() => {
    if (!allDestinations) return [];
    if (!filterText) return allDestinations;
    
    return allDestinations.filter((dest: string) =>
      dest.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [allDestinations, filterText]);

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
        <Alert severity="error">Failed to load destinations</Alert>
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
          <Button
            variant='outlined' 
            component={Link}
            to='/'
          >
            Home
          </Button>
          <Typography variant="h4">
              Choose a Destination
          </Typography>
        </Box>

        <NavBar />
      </Box>

      <FilterInput
        onFilter={setFilterText}
        onEnter={() => {
          if (filteredDestinations.length === 1) {
            const destination = filteredDestinations[0];
            window.location.href = `/destinations/${encodeURIComponent(destination)}`;
          }
        }}
        placeholder="Filter destinations..."
      />

      <Grid container spacing={2}>
        {filteredDestinations.map((destination: string) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={destination}>
            <Card 
              variant="outlined"
              sx={{
                '&:hover': {
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea 
                component={Link} 
                to={`/destinations/${encodeURIComponent(destination)}`}
                sx={{ textDecoration: 'none', color: 'inherit' }}
              >
                <CardContent>
                  <Typography variant="h6">
                    {destination
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredDestinations.length === 0 && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No destinations found
        </Typography>
      )}
    </Container>
  );
}