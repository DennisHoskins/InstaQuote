import { useNavigate } from 'react-router-dom';
import Table from './Table';
import type { Column } from './Table';

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
  showPageColumn?: boolean;
}

const columns: Column[] = [
  { key: 'item_code', label: 'Item Code' },
  { key: 'cat_page', label: 'Page', align: 'center', mobileHide: true },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category', mobileHide: true },
  { 
    key: 'total_ws_price', 
    label: 'Price', 
    align: 'right',
    format: (value) => `$${Number(value).toFixed(2)}`
  },
];

export default function ItemsTable({ items, showPageColumn = false }: ItemsTableProps) {
  const navigate = useNavigate();

  const filteredColumns = showPageColumn ? columns : columns.filter(col => col.key !== 'cat_page');

  return (
    <Table
      columns={filteredColumns}
      data={items}
      rowKey="item_code"
      onRowClick={(item) => navigate(`/item/${item.item_code}`)}
      emptyMessage="No items found"
    />
  );
}