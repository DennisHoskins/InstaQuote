import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';
import { Link } from 'react-router-dom';

interface SkusStatsCardProps {
  totalSkus: number;
  totalItems: number;
  skusWithImages: number;
  coveragePercent: number;
  linkTo: string;
}

export default function SkusStatsCard({
  totalSkus,
  totalItems,
  skusWithImages,
  coveragePercent,
  linkTo,
}: SkusStatsCardProps) {
  const progressColor = coveragePercent >= 80 ? 'success' : coveragePercent >= 50 ? 'warning' : 'error';

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
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              SKUs
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              / Items
            </Typography>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h3">
              {totalSkus.toLocaleString()}
            </Typography>
            <Typography variant="h4">
              / {totalItems.toLocaleString()}
            </Typography>
          </Box>          

          <LinearProgress 
            variant="determinate" 
            value={coveragePercent} 
            color={progressColor}
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />

          <Typography variant="caption" color="success.main" gutterBottom>
            {skusWithImages.toLocaleString()} skus with images / {coveragePercent.toFixed(1)}%
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}