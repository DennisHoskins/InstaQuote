import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Typography, Box, Button, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ImagesTable from '../../components/admin/ImagesTable';
import SearchBar from '../../components/SearchBar';
import PaginationControls from '../../components/PaginationControls';

export default function AdminImages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const fileType = searchParams.get('file_type') || '';
  const limit = 25;

  const { data: fileTypes } = useQuery({
    queryKey: ['file-types'],
    queryFn: () => api.getFileTypes(),
    enabled: isAuthenticated,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-images', page, search, fileType],
    queryFn: () => api.getImages(page, limit, search, undefined, fileType || undefined),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (value: string) => {
    const params: Record<string, string> = { search: value, page: '1' };
    if (fileType) params.file_type = fileType;
    setSearchParams(params);
  };

  const handleFileTypeChange = (value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (search) params.search = search;
    if (value) params.file_type = value;
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (search) params.search = search;
    if (fileType) params.file_type = fileType;
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
        <Alert severity="error">Failed to load images</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{ 
          width: '100%', 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            variant="outlined"
            component={Link}
            to='/'
          >
            Home
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to='/admin'
          >
            Admin
          </Button>
          <Typography variant="h4">
            Images
          </Typography>
        </Box>

        <Button
          component={Link}
          to='/admin/sku-images'
          variant="text"
          size="small"
          sx={{ px: 2 }}
        >
          SKU-Image Matches
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <SearchBar
            initialValue={search}
            onSearch={handleSearch}
            placeholder="Search by file name or folder path..."
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>File Type</InputLabel>
          <Select
            value={fileType}
            label="File Type"
            onChange={(e) => handleFileTypeChange(e.target.value)}
            sx={{ height: '56px' }}
          >
            <MenuItem value="">All</MenuItem>
            {fileTypes?.map((type: string) => (
              <MenuItem key={type} value={type}>
                {type.toUpperCase().replace('.', '')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <ImagesTable images={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}