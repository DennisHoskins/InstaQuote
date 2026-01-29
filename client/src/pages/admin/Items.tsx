import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import SearchBar from '../../components/SearchBar';
import ItemsTable from '../../components/admin/ItemsTable';
import PaginationControls from '../../components/PaginationControls';

export default function AdminItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-items', page, search],
    queryFn: () => api.getItems(page, limit, search),
    enabled: isAuthenticated,
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
        <Alert severity="error">Failed to load items</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button 
          variant="outlined"
          component={Link}
          to='/'
        >
          Home
        </Button>
        <Button
          variant="outlined"
          component={Link}
          to='/admin'
        >
          Admin
        </Button>
        <Button
          variant="outlined"
          component={Link}
          to='/admin/skus'
        >
          SKUs
        </Button>
        <Typography variant="h4">
          Inventory Items
        </Typography>
      </Box>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search by item code or description..."
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