import { useNavigate } from 'react-router-dom';
import Table from '../Table';
import type { Column } from '../Table';
import { Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export interface SKU {
  sku: string;
  item_count: number;
  image_count: number;
  has_primary_image: boolean;
}

interface SkusTableProps {
  skus: SKU[];
}

const columns: Column[] = [
  {
    key: 'primary_image_url',
    label: 'Preview',
    format: (value) => {
      if (value) {
        return (
          <Box
            component="img"
            src={value.replace(/(\?dl=0|\?dl=1)$/, '?raw=1').replace(/&dl=0|&dl=1/, '&raw=1')}
            alt="SKU preview"
            sx={{
              width: 60,
              height: 60,
              bgcolor: 'white',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        );
      }
      return (
        <Box
          sx={{
            width: 60,
            height: 60,
            bgcolor: 'grey.200',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'text.secondary',
          }}
        >
          No Preview
        </Box>
      );
    },
  },
  { key: 'sku', label: 'SKU' },
  { 
    key: 'item_count', 
    label: 'Items', 
    align: 'right',
    format: (value) => value.toLocaleString()
  },
  { 
    key: 'image_count', 
    label: 'Images', 
    align: 'right',
    format: (value) => value.toLocaleString()
  },
  { 
    key: 'has_primary_image', 
    label: 'Primary Image',
    align: 'center',
    format: (value) => value ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />
  },
];

export default function SkusTable({ skus }: SkusTableProps) {
  const navigate = useNavigate();

  return (
    <Table
      columns={columns}
      data={skus}
      rowKey="sku"
      onRowClick={(sku) => navigate(`/admin/skus/${sku.sku}`)}
      emptyMessage="No SKUs found"
    />
  );
}