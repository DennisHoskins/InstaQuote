import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Container, Box, CircularProgress, Alert } from '@mui/material';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import ItemsTable from '../components/ItemsTable';
import PaginationControls from '../components/PaginationControls';

export default function DestinationItems() {
  const { destination } = useParams<{ destination: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['destination-items', destination, page, search],
    queryFn: () => api.getDestinationItems(destination!, page, limit, search),
    enabled: isAuthenticated && !!destination,
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
      <PageHeader 
        title={destination}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Destinations', to: '/destinations' }
        ]}
      />

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