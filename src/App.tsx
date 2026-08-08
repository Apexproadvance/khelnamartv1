import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { ToastProvider } from '@/lib/toast-context';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import BrowsePage from '@/pages/BrowsePage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import AuthPage from '@/pages/AuthPage';
import OrdersPage from '@/pages/OrdersPage';
import WishlistPage from '@/pages/WishlistPage';
import SellerLayout from '@/pages/seller/SellerLayout';
import SellerRegisterPage from '@/pages/seller/SellerRegisterPage';
import CustomerProfilePage from '@/pages/CustomerProfilePage';
import SellerPayouts from '@/pages/seller/SellerPayouts';
import SellerDashboard from '@/pages/seller/SellerDashboard';
import SellerProducts from '@/pages/seller/SellerProducts';
import SellerOrders from '@/pages/seller/SellerOrders';
import SellerStorePage from '@/pages/SellerStorePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/store/:slug" element={<SellerStorePage />} />
                <Route path="/profile" element={<CustomerProfilePage />} />
                <Route path="/seller" element={<SellerLayout />} />
                <Route path="/seller/register" element={<SellerRegisterPage />} />
                <Route path="/seller/dashboard" element={<SellerDashboard />} />
                <Route path="/seller/products" element={<SellerProducts />} />
                <Route path="/seller/orders" element={<SellerOrders />} />
                <Route path="/seller/payouts" element={<SellerPayouts />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
