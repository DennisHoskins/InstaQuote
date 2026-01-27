import { Box, Pagination, Typography } from '@mui/material';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {totalItems} items total
      </Typography>
      
      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, value) => onPageChange(value)}
        color="primary"
      />
    </Box>
  );
}