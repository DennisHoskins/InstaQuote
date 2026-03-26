import { Dialog, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        sx={{ zIndex: 999999 }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'visible',
            },
          },
        }}
      >
        <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: -16,
          right: -16,
          bgcolor: 'white',
          '&:hover': { bgcolor: 'grey.100' },
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          display: 'block',
          borderRadius: 1,
        }}
      />
    </Dialog>
  );
}