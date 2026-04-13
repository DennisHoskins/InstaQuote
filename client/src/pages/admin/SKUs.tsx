import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Box, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import SkusTable from '../../components/admin/SkusTable';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import * as XLSX from 'xlsx';

export default function AdminSKUs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const hasImage = searchParams.get('has_image');
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-skus', page, search, hasImage],
    queryFn: () => api.getSkus(page, limit, search, hasImage === 'true' ? true : hasImage === 'false' ? false : undefined),
    enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    const params: Record<string, string> = { search: value, page: '1' };
    if (hasImage) params.has_image = hasImage;
    setSearchParams(params);
  };

  const handleFilterChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (value) params.has_image = value;
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    if (hasImage) params.has_image = hasImage;
    setSearchParams(params);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message="Failed to load SKUs" />;
  }

  const handleExport = async () => {
    const exportData = await api.getSkusExport(
      search || undefined,
      hasImage === 'true' ? true : hasImage === 'false' ? false : undefined
    );

    const headers = ['SKU', 'Item Count', 'Image Count', 'Has Primary Image', 'Image URL'];
    const ws: XLSX.WorkSheet = {};

    // Write headers
    headers.forEach((h, i) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: i })] = { v: h, t: 's' };
    });

    // Write rows
    exportData.items.forEach((sku: any, rowIdx: number) => {
      const r = rowIdx + 1;
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: sku.sku, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: sku.item_count, t: 'n' };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: sku.image_count, t: 'n' };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: sku.has_primary_image ? 'Yes' : 'No', t: 's' };
      if (sku.primary_image_url) {
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: sku.primary_image_url, t: 's', l: { Target: sku.primary_image_url } };
      } else {
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: '', t: 's' };
      }
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: exportData.items.length, c: headers.length - 1 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SKUs');
    XLSX.writeFile(wb, `skus-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="SKUs"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' }
        ]}
        showNavBar={false}
        rightAction={
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
            <Button variant="outlined" size="small" onClick={handleExport}>
              Export
            </Button>            
            <Button
              component={Link}
              to='/admin/sku-items'
              variant="text"
              size="small"
              sx={{ px: 2 }}
            >
              SKU Items
            </Button>
            <Button
              component={Link}
              to='/admin/items'
              variant="text"
              size="small"
              sx={{ px: 2 }}
            >
              Inventory Items
            </Button>
          </Box>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>

        {/* Desktop: search + filter on one row */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <SearchBar
              initialValue={search}
              onSearch={handleSearch}
              placeholder="Search by SKU..."
              compact
            />
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Image Status</InputLabel>
            <Select
              value={hasImage || ''}
              label="Image Status"
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">With Images</MenuItem>
              <MenuItem value="false">Without Images</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Mobile: search row */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <SearchBar
              initialValue={search}
              onSearch={handleSearch}
              placeholder="Search by SKU..."
              compact
            />
          </Box>
        </Box>

        {/* Mobile: image status + links row */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Image Status</InputLabel>
            <Select
              value={hasImage || ''}
              label="Image Status"
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">With Images</MenuItem>
              <MenuItem value="false">Without Images</MenuItem>
            </Select>
          </FormControl>
          <Button component={Link} to='/admin/sku-items' variant="text" size="small">
            SKU Items
          </Button>
          <Button component={Link} to='/admin/items' variant="text" size="small">
            Items
          </Button>
        </Box>

      </Box>

      <SkusTable skus={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}