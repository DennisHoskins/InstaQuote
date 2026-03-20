import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Container } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';

const columns: Column[] = [
  { 
    key: 'item_code', 
    label: 'Item Code',
    format: (value) => <Link to={`/item/${value}`}>{value}</Link>
  },
  { 
    key: 'sku', 
    label: 'SKU',
    format: (value) => <Link to={`/admin/skus/${value}`}>{value}</Link>
  },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category', mobileHide: true },
  { key: 'destination', label: 'Destination', mobileHide: true },
];

export default function AdminSkuItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sku-items', page, search],
    queryFn: () => api.getSkuItems(page, limit, search),
    enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    setSearchParams({ search: value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    setSearchParams(params);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message="Failed to load SKU item mappings" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="SKU Items"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'SKUs', to: '/admin/skus' }
        ]}
        showNavBar={false}
      />

      <Box sx={{ mb: 2 }}>
        <SearchBar
          initialValue={search}
          onSearch={handleSearch}
          placeholder="Search by item code or SKU..."
          compact
        />
      </Box>

      <Table
        columns={columns}
        data={data?.items || []}
        rowKey="item_code"
        emptyMessage="No mappings found"
      />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}