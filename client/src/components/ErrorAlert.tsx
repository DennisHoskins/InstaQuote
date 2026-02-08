import { Container, Alert, Button } from '@mui/material';

interface ErrorAlertProps {
  message?: string;
}

export default function ErrorAlert({ 
  message = 'Something went wrong', 
}: ErrorAlertProps) {
  return (
    <Container sx={{ mt: 4 }}>
      <Alert 
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      >
        {message}
      </Alert>
    </Container>
  );
}