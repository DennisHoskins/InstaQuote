import { Box, Button, Container, Typography } from '@mui/material';
import { usePricesLastSync } from '../hooks/usePricesLastSync';
import EmbedNavBar from './EmbedNavBar';
import SearchBar from '../components/SearchBar';

const APP_BASE = 'https://destinationjewelry.com/instaquote/#';

export default function EmbedHome() {
  const { syncedAtLabel } = usePricesLastSync();

  const handleSearch = (value: string) => {
    if (value.trim()) {
      window.location.href = `${APP_BASE}/search?q=${encodeURIComponent(value)}`;
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: '25px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={{ fontSize: { xs: '2rem', sm: '3.75rem' }, textAlign: 'center' }}
        >
          New! InstaQuote<br />Pricing and Ordering
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 800 }}>
          InstaQuote makes browsing and ordering from our full product catalog and destination collections faster and easier than ever. 
          Search, filter, and view real-time pricing across thousands of items, build a quote in minutes, 
          and submit your order directly online. InstaQuote is fully integrated with your account, ensuring 
          up-to-date availability, accurate pricing, and a streamlined ordering experience from start to finish.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <EmbedNavBar />
        </Box>        

        <Box sx={{ display: 'flex', gap: 3, width: '100%', px: { xs: 2, sm: 0 } }}>
          <Button
            component="a"
            href={`${APP_BASE}/catalog`}
            variant="contained"
            size="large"
            sx={{ flex: 1, py: 2, textAlign: 'center' }}
          >
            Browse Catalog
          </Button>

          <Button
            component="a"
            href={`${APP_BASE}/destinations`}
            variant="contained"
            size="large"
            sx={{ flex: 1, py: 2, textAlign: 'center' }}
          >
            Choose Destination
          </Button>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 600 }}>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search by SKU, item code, description, or destination..."
          />
        </Box>

        {syncedAtLabel && (
          <Typography variant="caption" color="text.secondary">
            Prices last updated {syncedAtLabel}
          </Typography>
        )}
      </Box>
    </Container>
  );
}