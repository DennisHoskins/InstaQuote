import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Container, Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import ItemsTable from '../components/ItemsTable';
import PaginationControls from '../components/PaginationControls';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('q') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', search, page],
    queryFn: () => api.searchAllItems(search, page, limit),
    enabled: isAuthenticated && !!search,
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
      <PageHeader 
        title="Search Results"
        breadcrumbs={[{ label: 'Home', to: '/' }]}
      />

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