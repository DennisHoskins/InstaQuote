import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminCart() {
  const { user_id } = useParams<{ user_id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-cart', user_id],
    queryFn: () => api.getCart(parseInt(user_id!)),
    enabled: isAuthenticated && !!user_id,
  });

  const columns: Column[] = [
    {
      key: 'image_url',
      label: '',
      format: (value) => {
        if (value) {
          const src = value
            .replace(/(\?dl=0|\?dl=1)$/, '?raw=1')
            .replace(/(&dl=0|&dl=1)/, '&raw=1');
          return (
            <Box
              component="img"
              src={src}
              alt="Item"
              sx={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 1, bgcolor: 'white', display: 'block' }}
            />
          );
        }
        return (
          <Box sx={{ width: 50, height: 50, bgcolor: 'grey.200', borderRadius: 1 }} />
        );
      },
    },
    { key: 'item_code', label: 'Item Code' },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'right',
    },
    {
      key: 'unit_price',
      label: 'Unit Price',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: 'line_total',
      label: 'Subtotal',
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: 'added_at',
      label: 'Added',
      mobileHide: true,
      format: (value) => new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
  ];

  if (isLoading) return <LoadingSpinner />;
  if (error || !data) return <ErrorAlert message="Failed to load cart" />;

  const total = data.items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
  const totalQty = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title={data.user_name}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'Carts', to: '/admin/carts' },
        ]}
        showNavBar={false}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Table
            columns={columns}
            data={data.items}
            rowKey="item_code"
            onRowClick={(item) => navigate(`/item/${item.item_code}`)}
            emptyMessage="Cart is empty"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Customer</Typography>
              <Typography variant="body2">{data.user_name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body2">{data.user_email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Items</Typography>
              <Typography variant="body2">{data.items.length}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Qty</Typography>
              <Typography variant="body2">{totalQty}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="success.main">
                ${total.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}