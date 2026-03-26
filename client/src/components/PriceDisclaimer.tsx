import { Typography } from '@mui/material';

interface PriceDisclaimerProps {
  variant: 'estimate' | 'historical';
}

export default function PriceDisclaimer({ variant }: PriceDisclaimerProps) {
  return (
    <Typography variant="caption" color="text.secondary" display="block">
      {variant === 'estimate'
        ? 'Prices are estimates based on current material costs and are subject to change at the time of invoicing.'
        : 'Price reflects the estimate at the time this order was placed.'}
    </Typography>
  );
}