import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Typography, Box, Button, CircularProgress, Grid } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminSkuImage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: mapping, isLoading, error } = useQuery({
    queryKey: ['admin-sku-image', id],
    queryFn: () => api.getSkuImage(parseInt(id!)),
    enabled: isAuthenticated && !!id,
  });
  
  const deleteMutation = useMutation({
    mutationFn: (mappingId: number) => api.deleteSkuImageMapping(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sku-images'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      navigate('/admin/sku-images');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !mapping) {
    return <ErrorAlert message="Failed to load SKU image mapping" />;
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      deleteMutation.mutate(mapping.id);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader 
        title={`Mapping #${mapping.id}`}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'SKU-Images', to: '/admin/sku-images' }
        ]}
        showNavBar={false}
        rightAction={
          <Button 
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Mapping'}
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Link to={`/admin/images/${mapping.image_id}`} style={{ textDecoration: 'none' }}>
            <Box
              sx={{
                width: '100%',
                height: '100%',
                minHeight: 400,
                bgcolor: mapping.shared_link ? 'white' : 'grey.200',
                border: '1px solid',
                borderColor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {mapping.shared_link ? (
                <img
                  src={mapping.shared_link.replace(/(\?dl=0|\?dl=1)$/, '?raw=1').replace(/&dl=0|&dl=1/, '&raw=1')}
                  alt={mapping.file_name}
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
          </Link>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Mapping ID
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {mapping.id}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              SKU
            </Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>
              <Link to={`/admin/skus/${mapping.sku}`} style={{ textDecoration: 'none' }}>
                {mapping.sku}
              </Link>
            </Typography>

            <Typography variant="caption" color="text.secondary">
              File Name
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <Link to={`/admin/images/${mapping.image_id}`} style={{ textDecoration: 'none' }}>
                {mapping.file_name}
              </Link>
            </Typography>

            <Typography variant="caption" color="text.secondary">
              File Type
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <Link to={`/admin/images/${mapping.image_id}`} style={{ textDecoration: 'none' }}>
                {mapping.file_extension.toUpperCase().replace('.', '')}
              </Link>
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Folder Path
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, wordBreak: 'break-all' }}>
              <Link to={`/admin/images/${mapping.image_id}`} style={{ textDecoration: 'none' }}>
                {mapping.folder_path}
              </Link>
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Match Type
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {mapping.match_type.charAt(0).toUpperCase() + mapping.match_type.slice(1)}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Confidence
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {mapping.confidence ? `${(mapping.confidence * 100).toFixed(0)}%` : 'N/A'}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Primary Image
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {mapping.is_primary ? (
                <>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body1">Yes</Typography>
                </>
              ) : (
                <>
                  <CancelIcon color="disabled" fontSize="small" />
                  <Typography variant="body1">No</Typography>
                </>
              )}
            </Box>

          <Typography variant="caption" color="text.secondary">
            Image ID
          </Typography>
          <Typography variant="body1">
            <Link to={`/admin/images/${mapping.image_id}`} style={{ textDecoration: 'none' }}>
              {mapping.image_id}
            </Link>
          </Typography>
          </Box>
        </Grid>
      </Grid>
   </Container>
  );
}