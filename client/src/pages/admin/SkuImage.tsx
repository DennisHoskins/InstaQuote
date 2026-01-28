import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Typography, Box, Button, CircularProgress, Alert, Grid, Card, CardContent } from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/admin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export default function AdminSkuImage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: mapping, isLoading, error } = useQuery({
    queryKey: ['admin-sku-image', id],
    queryFn: () => api.getSkuImage(parseInt(id!)),
    enabled: !!id,
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
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">SKU-Image mapping not found</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      deleteMutation.mutate(mapping.id);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Button
            variant="outlined"
            component={Link}
            to='/admin/sku-images'
          >
            SKU-Images
          </Button>
          <Typography variant="h4">
            Mapping #{mapping.id}
          </Typography>
        </Box>

        <Button 
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Mapping'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                SKU Information
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  SKU
                </Typography>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  <Link to={`/admin/skus/${mapping.sku}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {mapping.sku}
                  </Link>
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Match Type
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {mapping.match_type.charAt(0).toUpperCase() + mapping.match_type.slice(1)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Confidence
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {mapping.confidence ? `${(mapping.confidence * 100).toFixed(0)}%` : 'N/A'}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Primary Image
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Image Information
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  File Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {mapping.file_name}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  File Type
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {mapping.file_extension.toUpperCase().replace('.', '')}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Folder Path
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, wordBreak: 'break-all' }}>
                  {mapping.folder_path}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Image ID
                </Typography>
                <Typography variant="body1">
                  {mapping.image_id}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}