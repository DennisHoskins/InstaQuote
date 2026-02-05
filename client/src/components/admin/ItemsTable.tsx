import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Table from '../Table';
import type { Column } from '../Table';

export interface Item {
  item_code: string;
  description: string;
  category: string;
  destination: string;
  total_ws_price: number;
  inactive: boolean;
  is_catalog?: boolean;
}

interface ItemsTableProps {
  items: Item[];
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
            alt="Item preview"
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
  { key: 'item_code', label: 'Item Code' },
  { key: 'sku', label: 'SKU' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category', mobileHide: true },
  { key: 'destination', label: 'Destination', mobileHide: true },
  { key: 'cat_page', label: 'Page', mobileHide: true },
  { key: 'cat_page_order', label: 'Order', mobileHide: true },
  { 
    key: 'total_ws_price', 
    label: 'Price', 
    align: 'right',
    format: (value) => `$${Number(value).toFixed(2)}`
  },
];

export default function ItemsTable({ items }: ItemsTableProps) {
  const navigate = useNavigate();

  return (
    <Table
      columns={columns}
      data={items}
      rowKey="item_code"
      onRowClick={(item) => navigate(`/item/${item.item_code}`)}
      emptyMessage="No items found"
    />
  );
}