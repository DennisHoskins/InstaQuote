import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Container, Typography, Box, CircularProgress, Alert, Button } from '@mui/material';
import SearchBar from '../components/SearchBar';
import ItemsTable from '../components/ItemsTable';
import PaginationControls from '../components/PaginationControls';
import NavBar from '../components/NavBar';

export default function DestinationItems() {
  const { destination } = useParams<{ destination: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['destination-items', destination, page, search],
    queryFn: () => api.getDestinationItems(destination!, page, limit, search),
    enabled: !!destination,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    setSearchParams({ search: value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ search, page: newPage.toString() });
  };

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
        <Alert severity="error">Failed to load items for this destination</Alert>
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
          justifyContent: 'space-between'  // Add this
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            component={Link}
            to='/'
           >
            Home
          </Button>
          <Button variant="outlined"
            component={Link}
            to='/destinations'
          >
            Destinations
          </Button>
          <Typography variant="h4">
            {destination}
          </Typography>
        </Box>

        <NavBar />
      </Box>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search items..."
      />

      <ItemsTable items={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}