import { Box } from '@mui/material';
import Table from '../Table';
import type { Column } from '../Table';
import { useNavigate } from 'react-router-dom';

export interface DropboxImage {
  id: number;
  file_name: string;
  file_name_no_ext: string;
  file_extension: string;
  folder_path: string;
  file_size: number;
  modified_date: string;
  shared_link: string | null;
}

interface ImagesTableProps {
  images: DropboxImage[];
}

const columns: Column[] = [
  {
    key: 'preview',
    label: 'Preview',
    format: (value, row) => {
      if (row.shared_link) {
        return (
          <Box
            component="img"
            src={row.shared_link
              ?.replace(/(\?dl=0|\?dl=1)$/, '?raw=1')
              ?.replace(/&dl=0|&dl=1/, '&raw=1')}
            alt={value}
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
  { key: 'file_name_no_ext', label: 'File Name' },
  { key: 'file_extension', label: 'Type', mobileHide: true },
  { key: 'folder_path', label: 'Folder Path', mobileHide: true },
  { 
    key: 'file_size', 
    label: 'Size', 
    align: 'right',
    format: (value) => `${(value / 1024).toFixed(1)}KB`,
    mobileHide: true
  },
  { 
    key: 'modified_date', 
    label: 'Modified',
    format: (value) => new Date(value).toLocaleDateString(),
    mobileHide: true
  },
];

export default function ImagesTable({ images }: ImagesTableProps) {
  const navigate = useNavigate();  

  return (
    <Table 
      columns={columns} 
      data={images}
      rowKey="id"
      onRowClick={(image) => navigate(`/admin/images/${image.id}`)}
      emptyMessage="No images found" 
    />
  );
}