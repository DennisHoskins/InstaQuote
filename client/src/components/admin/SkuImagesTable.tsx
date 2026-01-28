import { useNavigate } from 'react-router-dom';
import Table from '../Table';
import type { Column } from '../Table';
import { Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export interface SkuImageMapping {
  id: number;
  sku: string;
  image_id: number;
  match_type: string;
  is_primary: boolean;
  confidence: number;
  file_name_no_ext: string;
  file_name: string;
  folder_path: string;
  file_extension: string;
}

interface SkuImagesTableProps {
  mappings: SkuImageMapping[];
}

const columns: Column[] = [
  {
    key: 'shared_link',
    label: 'Preview',
    format: (value) => {
      if (value) {
        return (
          <Box
            component="img"
            src={value.replace(/(\?dl=0|\?dl=1)$/, '?raw=1').replace(/&dl=0|&dl=1/, '&raw=1')}
            alt="Image preview"
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
    key: 'file_name_no_ext', 
    label: 'Image',
    mobileHide: true
  },
  { 
    key: 'match_type', 
    label: 'Match Type',
    format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    mobileHide: true
  },
  { 
    key: 'is_primary', 
    label: 'Primary',
    align: 'center',
    format: (value) => value ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="disabled" fontSize="small" />
  },
  { 
    key: 'confidence', 
    label: 'Confidence',
    align: 'right',
    format: (value) => value ? `${(value * 100).toFixed(0)}%` : '-',
    mobileHide: true
  },
];

export default function SkuImagesTable({ mappings }: SkuImagesTableProps) {
  const navigate = useNavigate();

  return (
    <Table
      columns={columns}
      data={mappings}
      rowKey="id"
      onRowClick={(mapping) => navigate(`/admin/sku-images/${mapping.id}`)}
      emptyMessage="No SKU-Image mappings found"
    />
  );
}