import { useQuery } from '@tanstack/react-query';
import { Container, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import SearchBar from '../components/SearchBar';
import ItemsTable from '../components/ItemsTable';
import PaginationControls from '../components/PaginationControls';
import NavBar from '../components/NavBar';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('q') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', search, page],
    queryFn: () => api.searchAllItems(search, page, limit),
    enabled: !!search,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    setSearchParams({ q: value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: search, page: newPage.toString() });
  };

  if (!search) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">Please enter a search term</Alert>
      </Container>
    );
  }

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
        <Alert severity="error">Failed to search items</Alert>
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
            variant="outlined"
            component={Link}
            to='/'
          >
            Home
          </Button>
          <Typography variant="h4">
            Search Results
          </Typography>
        </Box>

        <NavBar />
      </Box>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search by SKU, item code, description, or destination..."
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