import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Typography, Box, CircularProgress, Grid } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminSKU() {
  const { sku } = useParams<{ sku: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sku', sku],
    queryFn: () => api.getSkuDetail(sku!),
    enabled: isAuthenticated && !!sku,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <ErrorAlert message="Failed to load SKU" />;
  }

  const itemColumns: Column[] = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', mobileHide: true },
    { key: 'destination', label: 'Destination', mobileHide: true },
    { 
      key: 'total_ws_price', 
      label: 'Price', 
      align: 'right',
      format: (value) => `$${Number(value).toFixed(2)}`
    },
  ];

  const imageColumns: Column[] = [
    {
      key: 'file_name_no_ext',
      label: 'Preview',
      format: (value, row) => {
        if (row.shared_link) {
          return (
            <Box
              component="img"
              src={row.shared_link
                ?.replace(/(\?dl=0|\?dl=1)$/, '?raw=1')
                ?.replace(/&dl=0|&dl=1/, '&raw=1')}
              alt={value}
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'white',
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          );
        }
        return (
          <Box
            sx={{
              width: 60,
              height: 60,
              bgcolor: 'grey.200',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'text.secondary',
            }}
          >
            No Preview
          </Box>
        );
      },
    },
    { key: 'file_name_no_ext', label: 'File Name' },
    { key: 'folder_path', label: 'Folder Path', mobileHide: true },
    { key: 'file_extension', label: 'Type', mobileHide: true },
    { 
      key: 'is_primary', 
      label: 'Primary',
      align: 'center',
      format: (value) => value ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="disabled" fontSize="small" />
    },
    { 
      key: 'confidence', 
      label: 'Confidence',
      align: 'right',
      format: (value) => value ? `${(value * 100).toFixed(0)}%` : '-',
      mobileHide: true
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title={`SKU: ${data.sku}`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'SKUs', to: '/admin/skus' }
        ]}
        showNavBar={false}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Items ({data.items.length})
          </Typography>
          <Table
            columns={itemColumns}
            data={data.items}
            rowKey="item_code"
            onRowClick={(item) => navigate(`/item/${item.item_code}`)}
            emptyMessage="No items found"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Images ({data.images.length})
          </Typography>
          <Table
            columns={imageColumns}
            data={data.images}
            rowKey="mapping_id"
            onRowClick={(image) => navigate(`/admin/images/${image.image_id}`)}
            emptyMessage="No images found"
          />
        </Grid>
      </Grid>
    </Container>
  );
}