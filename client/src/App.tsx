import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Destinations from './pages/Destinations';
import DestinationItems from './pages/DestinationItems';
import ItemDetail from './pages/ItemDetail';
import Admin from './pages/admin/Admin';
import Items from './pages/admin/Items';
import SKUs from './pages/admin/SKUs';
import SKU from './pages/admin/SKU';
import Images from './pages/admin/Images';
import Image from './pages/admin/Image';
import SkuImages from './pages/admin/SkuImages';
import SkuImage from './pages/admin/SkuImage';
import Metals from './pages/admin/Metals';
import SyncLogAccess from './pages/admin/SyncLogAccess';
import SyncLogDropboxCrawl from './pages/admin/SyncLogDropboxCrawl';
import SyncLogDropboxLinks from './pages/admin/SyncLogDropboxLinks';
import SyncLogSkuMapping from './pages/admin/SyncLogSkuMapping';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/destinations/:destination" element={<DestinationItems />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/item/:itemCode" element={<ItemDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/items" element={<Items />} />
        <Route path="/admin/skus/:sku" element={<SKU />} />
        <Route path="/admin/skus" element={<SKUs />} />
        <Route path="/admin/images" element={<Images />} />
        <Route path="/admin/images/:id" element={<Image />} />
        <Route path="/admin/sku-images/:id" element={<SkuImage />} />
        <Route path="/admin/sku-images" element={<SkuImages />} />
        <Route path="/admin/metals" element={<Metals />} />
        <Route path="/admin/sync-log/access" element={<SyncLogAccess />} />
        <Route path="/admin/sync-log/dropbox-crawl" element={<SyncLogDropboxCrawl />} />
        <Route path="/admin/sync-log/dropbox-links" element={<SyncLogDropboxLinks />} />
        <Route path="/admin/sync-log/sku-mapping" element={<SyncLogSkuMapping />} />
      </Routes>
    </HashRouter>
  );
}