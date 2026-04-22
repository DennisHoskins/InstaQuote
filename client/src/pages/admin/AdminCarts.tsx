import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Box } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import ErrorAlert from '../../components/ErrorAlert';
import PaginationControls from '../../components/PaginationControls';

export default function AdminCarts() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-carts', page, search],
    queryFn: () => api.getCarts(page, limit, search),
    enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (value) params.search = value;
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    setSearchParams(params);
  };

  const columns: Column[] = [
    { key: 'user_name', label: 'Customer' },
    { key: 'user_email', label: 'Email', mobileHide: true },
    {
      key: 'item_count',
      label: 'Items',
      align: 'right',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'total_qty',
      label: 'Qty',
      align: 'right',
      format: (value) => value.toLocaleString(),
    },
    {
      key: 'total_value',
      label: 'Value',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: 'last_updated',
      label: 'Last Updated',
      mobileHide: true,
      format: (value) => new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
  ];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load carts" />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Active Carts"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
        ]}
        showNavBar={false}
      />

      <Box sx={{ mb: 2 }}>
        <SearchBar
          initialValue={search}
          onSearch={handleSearch}
          placeholder="Search by email..."
          compact
        />
      </Box>

      <Table
        columns={columns}
        data={data?.items || []}
        rowKey="user_id"
        onRowClick={(cart) => navigate(`/admin/carts/${cart.user_id}`)}
        emptyMessage="No active carts"
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