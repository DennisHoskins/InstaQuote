import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface OrdersStatsCardProps {
  totalOrders: number;
  totalRevenue: number;
  linkTo: string;
  cartsCount: number;
  cartsValue: number;
  cartsLinkTo: string;
}

export default function OrdersStatsCard({
  totalOrders,
  totalRevenue,
  linkTo,
  cartsCount,
  cartsValue,
  cartsLinkTo,
}: OrdersStatsCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Orders
            </Typography>
          </Link>
          <Link to={cartsLinkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              / Carts
            </Typography>
          </Link>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h3">
              {totalOrders.toLocaleString()}
            </Typography>
          </Link>
          <Link to={cartsLinkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h4">
              / {cartsCount.toLocaleString()}
            </Typography>
          </Link>
        </Box>

        <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="caption" color="success.main" gutterBottom display="block">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue
          </Typography>
        </Link>
        <Link to={cartsLinkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="caption" color="success.main" gutterBottom display="block">
            ${cartsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in carts
          </Typography>
        </Link>
      </CardContent>
    </Card>
  );
}