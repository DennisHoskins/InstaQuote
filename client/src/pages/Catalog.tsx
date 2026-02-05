import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Container, Box, CircularProgress, Alert } from '@mui/material';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import ItemsTable from '../components/ItemsTable';
import PaginationControls from '../components/PaginationControls';


export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog', page, search],
    queryFn: () => api.getCatalogItems(page, limit, search),
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
        <Alert severity="error">Failed to load catalog items</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
     <PageHeader 
        title="Catalog Items"
        breadcrumbs={[{ label: 'Home', to: '/' }]}
      />

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search by item code or description..."
      />

      <ItemsTable items={data?.items || []} showPageColumn={true} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}