import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import SearchBar from '../../components/SearchBar';
import SkuImagesTable from '../../components/admin/SkuImagesTable';
import PaginationControls from '../../components/PaginationControls';

export default function AdminSkuImages() {
  const [searchParams, setSearchParams] = useSearchParams();
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
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load SKU image mappings</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" component={Link} to="/">
            Home
          </Button>
          <Button variant="outlined" component={Link} to="/admin">
            Admin
          </Button>
          <Button variant="outlined" component={Link} to="/admin/images">
            Images
          </Button>
          <Typography variant="h4">SKU-Image Matches</Typography>
        </Box>
      </Box>

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