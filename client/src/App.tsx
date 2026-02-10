import { HashRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Layout from './layouts/Layout';
import AdminLayout from './layouts/AdminLayout';
import SearchResults from './pages/SearchResults';
import Catalog from './pages/Catalog';
import Destinations from './pages/Destinations';
import DestinationItems from './pages/DestinationItems';
import ItemDetail from './pages/ItemDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderConfirmation from './pages/OrderConfirmation';
import Admin from './pages/admin/Admin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrder from './pages/admin/AdminOrder';
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
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/destinations/:destination" element={<DestinationItems />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/item/:itemCode" element={<ItemDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="items" element={<Items />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrder />} />
            <Route path="skus/:sku" element={<SKU />} />
            <Route path="skus" element={<SKUs />} />
            <Route path="images" element={<Images />} />
            <Route path="images/:id" element={<Image />} />
            <Route path="sku-images/:id" element={<SkuImage />} />
            <Route path="sku-images" element={<SkuImages />} />
            <Route path="metals" element={<Metals />} />
            <Route path="sync-log/access" element={<SyncLogAccess />} />
            <Route path="sync-log/dropbox-crawl" element={<SyncLogDropboxCrawl />} />
            <Route path="sync-log/dropbox-links" element={<SyncLogDropboxLinks />} />
            <Route path="sync-log/sku-mapping" element={<SyncLogSkuMapping />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}