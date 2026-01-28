import { Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';

interface ImagesStatsCardProps {
  totalImages: number;
  webImages: number;
  linkedWebImages: number;
  webImagesPercent: number;
  linkTo: string;
}

export default function ImagesStatsCard({
  totalImages,
  webImages,
  linkedWebImages,
  webImagesPercent,
  linkTo,
}: ImagesStatsCardProps) {
  const progressColor = webImagesPercent >= 80 ? 'success' : webImagesPercent >= 50 ? 'warning' : 'error';

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
              Images
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              / Files
            </Typography>
          </Box>


          <Box sx={{ mb: 2, display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h3">
              {webImages.toLocaleString()}
            </Typography>
            <Typography variant="h4">
              / {totalImages.toLocaleString()}
            </Typography>
          </Box>          

          <LinearProgress 
            variant="determinate" 
            value={webImagesPercent} 
            color={progressColor}
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />

          <Typography variant="caption" color="success.main" display="block">
            {linkedWebImages.toLocaleString()} linked to SKUs ({webImagesPercent.toFixed(1)}%)
          </Typography>
        </CardContent>
      </Card>
    </Link>
  );
}