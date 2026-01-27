import { useQuery } from '@tanstack/react-query';
import { Container, Typography, Box, Button, CircularProgress, Alert, Grid } from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import Table from '../../components/Table';
import type { Column } from '../../components/Table';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export default function AdminImage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-image', id],
    queryFn: () => api.getImageDetail(parseInt(id!)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Image not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  const { image, mappings } = data;

  const mappingColumns: Column[] = [
    { key: 'sku', label: 'SKU' },
    { 
      key: 'item_count', 
      label: 'Items',
      align: 'right',
      format: (value) => value.toLocaleString()
    },
    { 
      key: 'is_primary', 
      label: 'Primary',
      align: 'center',
      format: (value) => value ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="disabled" fontSize="small" />
    },
    { 
      key: 'match_type', 
      label: 'Match Type',
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
      mobileHide: true
    },
    { 
      key: 'confidence', 
      label: 'Confidence',
      align: 'right',
      format: (value) => value ? `${(value * 100).toFixed(0)}%` : '-',
      mobileHide: true
    },
  ];

  const getDropboxRawLink = (link?: string) => {
    if (!link) return '';
    return link.replace(/([?&])dl=0/, '$1raw=1');
  };

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
        <Button
          variant="outlined"
          component={Link}
          to='/admin/images'
        >
          Images
        </Button>
        <Typography variant="h4">
          {image.file_name}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 400,
              bgcolor: image?.shared_link ? 'white' : 'grey.200',
              border: '1px solid',
              borderColor: 'grey.300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {image.shared_link ? (
              <img
                src={getDropboxRawLink(image.shared_link)}
                alt={image.file_name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Typography variant="h6" color="text.secondary">
                No Preview Available
              </Typography>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              File Name
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {image.file_name}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              File Type
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {image.file_extension.toUpperCase().replace('.', '')}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Folder Path
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, wordBreak: 'break-all' }}>
              {image.folder_path}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Link
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, wordBreak: 'break-all' }}>
              {image.shared_link ? <a href={image.shared_link} target="_blank" rel="noopener noreferrer">{image.shared_link}</a> : 'N/A'}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              File Size
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {(image.file_size / 1024).toFixed(1)} KB
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Modified Date
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {new Date(image.modified_date).toLocaleString()}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Image ID
            </Typography>
            <Typography variant="body1">
              {image.id}
            </Typography>
          </Box>
        </Grid>

        <Grid size={12}>
          <Typography variant="h6" gutterBottom>
            SKU Mappings ({mappings.length})
          </Typography>
          <Table
            columns={mappingColumns}
            data={mappings}
            rowKey="mapping_id"
            onRowClick={(mapping) => navigate(`/admin/skus/${mapping.sku}`)}
            emptyMessage="No SKU mappings found"
          />
        </Grid>
      </Grid>
    </Container>
  );
}