import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api/admin';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageHeader from '../../components/PageHeader';

interface SqlItem {
  item_code: string;
  price: number;
}

interface XlsItem {
  item_code: string;
  price: number;
}

interface VerifyResult {
  xlsCount: number;
  sqlCount: number;
  missingFromSql: string[];
  missingFromXls: string[];
  priceMismatches: { item_code: string; xls_price: number; sql_price: number }[];
}

function parseCatalogXls(buffer: ArrayBuffer): XlsItem[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const items: XlsItem[] = [];
  // Row 0 is metadata, Row 1 is headers, data starts at Row 2
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const item_code = row[0] ? String(row[0]).trim() : '';
    const price = row[4];
    if (item_code && item_code !== 'Item Code' && price !== '' && price != null) {
      const parsed = parseFloat(String(price));
      if (!isNaN(parsed)) {
        items.push({ item_code, price: parsed });
      }
    }
  }
  return items;
}

function parseDestinationXls(buffer: ArrayBuffer): { destination: string; items: XlsItem[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const destination = rows[0]?.[0] ? String(rows[0][0]).trim() : '';

  const seen = new Set<string>();
  const items: XlsItem[] = [];

  // Row 1 is headers, data starts at Row 2
  // Col 1 = Item Code, Col 3 = price, skip rows where col 1 is empty (section headers)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const item_code = row[1] ? String(row[1]).trim() : '';
    const price = row[3];
    if (item_code && price !== '' && price != null) {
      const parsed = parseFloat(String(price));
      if (!isNaN(parsed) && !seen.has(item_code)) {
        seen.add(item_code);
        items.push({ item_code, price: parsed });
      }
    }
  }
  return { destination, items };
}

function compare(xlsItems: XlsItem[], sqlItems: SqlItem[]): VerifyResult {
  const xlsMap = new Map<string, number>();
  for (const item of xlsItems) xlsMap.set(item.item_code, item.price);

  const sqlMap = new Map<string, number>();
  for (const item of sqlItems) sqlMap.set(item.item_code, item.price);

  const missingFromSql: string[] = [];
  for (const code of xlsMap.keys()) {
    if (!sqlMap.has(code)) missingFromSql.push(code);
  }

  const missingFromXls: string[] = [];
  for (const code of sqlMap.keys()) {
    if (!xlsMap.has(code)) missingFromXls.push(code);
  }

  const priceMismatches: { item_code: string; xls_price: number; sql_price: number }[] = [];
  for (const [code, xlsPrice] of xlsMap.entries()) {
    if (sqlMap.has(code)) {
      const sqlPrice = sqlMap.get(code)!;
      if (Math.abs(xlsPrice - sqlPrice) > 0.02) {
        priceMismatches.push({ item_code: code, xls_price: xlsPrice, sql_price: sqlPrice });
      }
    }
  }

  return {
    xlsCount: xlsMap.size,
    sqlCount: sqlMap.size,
    missingFromSql: missingFromSql.sort(),
    missingFromXls: missingFromXls.sort(),
    priceMismatches: priceMismatches.sort((a, b) => a.item_code.localeCompare(b.item_code)),
  };
}

function SummaryChips({ result }: { result: VerifyResult }) {
  const allGood =
    result.missingFromSql.length === 0 &&
    result.missingFromXls.length === 0 &&
    result.priceMismatches.length === 0;

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <Chip label={`XLS: ${result.xlsCount} items`} variant="outlined" />
      <Chip label={`SQL: ${result.sqlCount} items`} variant="outlined" />
      {allGood ? (
        <Chip label="All match" color="success" />
      ) : (
        <>
          {result.missingFromSql.length > 0 && (
            <Chip label={`${result.missingFromSql.length} missing from SQL`} color="error" />
          )}
          {result.missingFromXls.length > 0 && (
            <Chip label={`${result.missingFromXls.length} missing from XLS`} color="warning" />
          )}
          {result.priceMismatches.length > 0 && (
            <Chip label={`${result.priceMismatches.length} price mismatches`} color="error" />
          )}
        </>
      )}
    </Box>
  );
}

function ItemList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item Code</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((code) => (
              <TableRow key={code}>
                <TableCell>{code}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function PriceMismatchTable({ mismatches }: { mismatches: VerifyResult['priceMismatches'] }) {
  if (mismatches.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Price Mismatches</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item Code</TableCell>
              <TableCell align="right">XLS Price</TableCell>
              <TableCell align="right">SQL Price</TableCell>
              <TableCell align="right">Difference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mismatches.map((m) => (
              <TableRow key={m.item_code}>
                <TableCell>{m.item_code}</TableCell>
                <TableCell align="right">${m.xls_price.toFixed(2)}</TableCell>
                <TableCell align="right">${m.sql_price.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ color: 'error.main' }}>
                  ${Math.abs(m.xls_price - m.sql_price).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function VerifyPanel({ type }: { type: 'catalog' | 'destination' }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [detectedDestination, setDetectedDestination] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult(null);
    setDetectedDestination('');
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();

      if (type === 'catalog') {
        const xlsItems = parseCatalogXls(buffer);
        if (xlsItems.length === 0) {
          setError('No items found in file. Check that this is a valid Catalog export.');
          setLoading(false);
          return;
        }
        const sqlItems: SqlItem[] = await api.getVerifyCatalog();
        setResult(compare(xlsItems, sqlItems));
      } else {
        const { destination, items: xlsItems } = parseDestinationXls(buffer);
        if (!destination) {
          setError('Could not read destination name from file.');
          setLoading(false);
          return;
        }
        if (xlsItems.length === 0) {
          setError('No items found in file. Check that this is a valid Destination export.');
          setLoading(false);
          return;
        }
        setDetectedDestination(destination);
        const data = await api.getVerifyDestination(destination);
        setResult(compare(xlsItems, data.items));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to process file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ pt: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {type === 'catalog' ? 'Upload Catalog XLS' : 'Upload Destination XLS'}
        </Button>
        {fileName && (
          <Typography variant="body2" color="text.secondary">
            {fileName}
          </Typography>
        )}
        {loading && <CircularProgress size={24} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {result && (
        <>
          {detectedDestination && (
            <Typography variant="h6" gutterBottom>
              Destination: {detectedDestination}
            </Typography>
          )}
          <SummaryChips result={result} />
          <ItemList title="In XLS, Missing from SQL" items={result.missingFromSql} />
          <ItemList title="In SQL, Missing from XLS" items={result.missingFromXls} />
          <PriceMismatchTable mismatches={result.priceMismatches} />
          {result.missingFromSql.length === 0 &&
            result.missingFromXls.length === 0 &&
            result.priceMismatches.length === 0 && (
              <Alert severity="success">Everything matches.</Alert>
            )}
        </>
      )}
    </Box>
  );
}

export default function Verify() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader
        title="Verify Import"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Admin', to: '/admin' },
        ]}
        showNavBar={false}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Catalog" />
        <Tab label="Destination" />
      </Tabs>

      {tab === 0 && <VerifyPanel type="catalog" />}
      {tab === 1 && <VerifyPanel type="destination" />}
    </Container>
  );
}