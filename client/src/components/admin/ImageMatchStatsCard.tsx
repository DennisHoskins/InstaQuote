import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface ImageMatchStatsCardProps {
  totalMappings: number;
  skusWithImages: number;
  linkTo: string;
}

export default function ImageMatchStatsCard({
  totalMappings,
  skusWithImages,
  linkTo,
}: ImageMatchStatsCardProps) {
  return (
    <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h5" color="text.secondary">
              SKU-Image Matches
            </Typography>
          </Box>

          <Typography variant="h3" sx={{ mb: 2 }}>
            {totalMappings.toLocaleString()}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            {skusWithImages.toLocaleString()} SKUs matched to images
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}