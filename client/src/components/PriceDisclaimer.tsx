import { Typography } from '@mui/material';

interface PriceDisclaimerProps {
  variant: 'estimate' | 'historical';
}

export default function PriceDisclaimer({ variant }: PriceDisclaimerProps) {
  return (
    <Typography variant="caption" color="text.secondary" display="block">
      {variant === 'estimate' ? (
        <>
          Please note that all prices are approximate wholesale prices and are subject to change based on current market rates.
          <br /><br />
          Orders received Monday through Friday by 5:00 p.m. EST will be processed the same day; all others will be processed on the next business day.
          <br /><br />
          Please allow up to three weeks for processing and shipping.
        </>
      ) : (
        'Price reflects the estimate at the time this order was placed.'
      )}
    </Typography>
  );
}