import { Box, Button, Container, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import SearchBar from '../components/SearchBar';

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = (value: string) => {
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >

        <NavBar />

        <Typography variant="h2" component="h1">
          New! InstaQuote Ordering
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 800 }}>
          InstaQuote makes browsing and ordering from our full product catalog faster and easier than ever. 
          Search, filter, and view real-time pricing across thousands of items, build a quote in minutes, 
          and submit your order directly online. InstaQuote is fully integrated with your account, ensuring 
          up-to-date availability, accurate pricing, and a streamlined ordering experience from start to finish.
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to='/catalog'
            sx={{ minWidth: 200, py: 2 }}
          >
            Browse Catalog
          </Button>

          <Button
            variant="contained"
            size="large"
            component={Link}
            to='/destinations'
            sx={{ minWidth: 200, py: 2 }}
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
      </Box>
    </Container>
  );
}