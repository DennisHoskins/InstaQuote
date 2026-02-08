import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import SkuImagesTable from '../../components/admin/SkuImagesTable';
import PaginationControls from '../../components/PaginationControls';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminSkuImages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const matchType = searchParams.get('match_type') || '';
  const isPrimary = searchParams.get('is_primary');
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sku-images', page, search, matchType, isPrimary],
    queryFn: () =>
      api.getSkuImages(
        page,
        limit,
        search || undefined,
        matchType || undefined,
        isPrimary === 'true' ? true : isPrimary === 'false' ? false : undefined
      ),
      enabled: isAuthenticated,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    const params: Record<string, string> = { search: value, page: '1' };
    if (matchType) params.match_type = matchType;
    if (isPrimary) params.is_primary = isPrimary;
    setSearchParams(params);
  };

  const handleMatchTypeChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (value) params.match_type = value;
    if (isPrimary) params.is_primary = isPrimary;
    setSearchParams(params);
  };

  const handlePrimaryChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (matchType) params.match_type = matchType;
    if (value) params.is_primary = value;
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    if (matchType) params.match_type = matchType;
    if (isPrimary) params.is_primary = isPrimary;
    setSearchParams(params);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert message="Failed to load SKU image mappings" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title="SKU-Image Matches"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'Images', to: '/admin/images' }
        ]}
        showNavBar={false}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <SearchBar
            initialValue={search}
            onSearch={handleSearch}
            placeholder="Search by SKU..."
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Match Type</InputLabel>
          <Select
            value={matchType}
            label="Match Type"
            onChange={(e) => handleMatchTypeChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="exact">Exact</MenuItem>
            <MenuItem value="contains">Contains</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Primary</InputLabel>
          <Select
            value={isPrimary || ''}
            label="Primary"
            onChange={(e) => handlePrimaryChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Primary Only</MenuItem>
            <MenuItem value="false">Non-Primary</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <SkuImagesTable mappings={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}