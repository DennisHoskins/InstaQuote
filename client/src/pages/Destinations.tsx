import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Container, Typography, Box, CircularProgress, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import PageHeader from '../components/PageHeader';
import FilterInput from '../components/FilterInput';
import ErrorAlert from '../components/ErrorAlert';

export default function Destinations() {
  const [filterText, setFilterText] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: allDestinations, isLoading, error } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api.getDestinations(),
    enabled: isAuthenticated,
  });

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
    return <ErrorAlert message="Failed to load destinations" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Choose a Destination"
        breadcrumbs={[{ label: 'Home', to: '/' }]}
      />

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
                  <Typography variant="h6" sx={{ paddingBottom: '0 !important', marginBottom: '0 !important' }}>
                    {destination}
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