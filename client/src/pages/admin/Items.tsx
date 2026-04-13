import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import ItemsTable from '../../components/admin/ItemsTable';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import * as XLSX from 'xlsx';

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

  const handleExport = async () => {
    const exportData = await api.getItemsExport(search || undefined);

    const headers = ['Item Code', 'SKU', 'Description', 'Category', 'Destination', 'Page', 'Page Order', 'Price', 'Inactive', 'Image URL'];
    const ws: XLSX.WorkSheet = {};

    // Write headers
    headers.forEach((h, i) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: i })] = { v: h, t: 's' };
    });

    // Write rows
    exportData.items.forEach((item: any, rowIdx: number) => {
      const r = rowIdx + 1;
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.item_code, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.sku || '', t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: item.description, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: item.category, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: item.destination, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: item.cat_page || '', t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: item.cat_page_order || '', t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: item.total_ws_price, t: 'n' };
      ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: item.inactive ? 'Yes' : 'No', t: 's' };
      if (item.primary_image_url) {
        ws[XLSX.utils.encode_cell({ r, c: 9 })] = { v: item.primary_image_url, t: 's', l: { Target: item.primary_image_url } };
      } else {
        ws[XLSX.utils.encode_cell({ r, c: 9 })] = { v: '', t: 's' };
      }
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: exportData.items.length, c: headers.length - 1 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, `items-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
            <Button variant="outlined" size="small" onClick={handleExport}>
              Export
            </Button>            
            <Button
              component={Link}
              to='/admin/verify'
              variant="text"
              size="small"
            >
              Verify Import
            </Button>
          </Box>
        }
      />

      <Box sx={{ mb: 2 }}>
        <SearchBar
          initialValue={search}
          onSearch={handleSearch}
          placeholder="Search by item code or description..."
          compact
        />
      </Box>
      
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