import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import ItemsTable from '../../components/admin/ItemsTable';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';

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
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message="Failed to load items" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
    <PageHeader 
      title="Inventory Items"
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Admin', to: '/admin' },
        { label: 'SKUs', to: '/admin/skus' }
      ]}
      showNavBar={false}
      rightAction={
        <Button
          component={Link}
          to='/admin/verify'
          variant="text"
          size="small"
          sx={{ px: 2 }}
        >
          Verify Import
        </Button>
      }
    />

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