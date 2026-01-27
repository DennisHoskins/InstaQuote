import { useQuery } from '@tanstack/react-query';
import { Container, Typography, Box, Button, CircularProgress, Alert, TextField } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/admin';
import MetalsTable from '../../components/admin/MetalsTable';
import PaginationControls from '../../components/PaginationControls';

export default function AdminMetals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-metals', page, startDate, endDate],
    queryFn: () => api.getMetals(page, limit, startDate || undefined, endDate || undefined),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const params: Record<string, string> = { page: '1' };
    if (field === 'start_date') {
      if (value) params.start_date = value;
      if (endDate) params.end_date = endDate;
    } else {
      if (startDate) params.start_date = startDate;
      if (value) params.end_date = value;
    }
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
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
        <Alert severity="error">Failed to load metal prices</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
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
          Metal Prices
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => handleDateChange('start_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => handleDateChange('end_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ height: '56px' }}
        />
      </Box>

      <MetalsTable prices={data?.items || []} />

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={data?.total || 0}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}