import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Container, Typography, Box, CircularProgress, Alert, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import PageHeader from '../components/PageHeader';
import FilterInput from '../components/FilterInput';

export default function Destinations() {
  const [filterText, setFilterText] = useState('');
  const { isAuthenticated } = useAuth();

  const PRESERVE_UPPERCASE = [
    // States
    'NC', 'SC', 'FL', 'MD', 'VA', 'NJ', 'DE', 'TX', 'WY', 'OH', 'WI', 'TN', 'KY',
    'CO', 'ID', 'MI', 'RI', 'HI', 'NY', 'MA', 'DC', 'CA',
    // Other
    'ABC', 'BBQ', 'US', 'USVI', 'SXM', 'JD', 'OC', 'LBI', 'KW', 'II', 'B&O',
  ];

  const WORD_REPLACEMENTS: Record<string, string> = {
    'ST': 'St.',
    'FT': 'Ft.',
    'MT': 'Mt.',
  };

  const US_STATE_REGEX = /\b([A-Za-z\s]+?)[,\s]+([A-Za-z]{2})$/;

  const formatDestination = (destination: string) => {
    const trimmed = destination.trim();

    const stateMatch = trimmed.match(US_STATE_REGEX);

    if (stateMatch) {
      const cityRaw = stateMatch[1];
      const stateRaw = stateMatch[2];

      const city = cityRaw
        .split(' ')
        .map(word => {
          const upper = word.toUpperCase();
          if (WORD_REPLACEMENTS[upper]) {
            return WORD_REPLACEMENTS[upper];
          }
          if (PRESERVE_UPPERCASE.includes(upper)) {
            return upper;
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');

      return `${city}, ${stateRaw.toUpperCase()}`;
    }

    return trimmed
      .split(' ')
      .map(word => {
        const upper = word.toUpperCase();
        if (WORD_REPLACEMENTS[upper]) {
          return WORD_REPLACEMENTS[upper];
        }
        if (PRESERVE_UPPERCASE.includes(upper)) {
          return upper;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

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
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load destinations</Alert>
      </Container>
    );
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
                  <Typography variant="h6">
                    {formatDestination(destination)}
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
