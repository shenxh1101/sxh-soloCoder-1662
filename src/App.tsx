import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import OrderList from '@/pages/OrderList';
import OrderNew from '@/pages/OrderNew';
import OrderDetail from '@/pages/OrderDetail';
import CustomerSelect from '@/pages/CustomerSelect';
import QueryPage from '@/pages/QueryPage';
import Statistics from '@/pages/Statistics';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/orders" element={<OrderList />} />
      <Route path="/orders/new" element={<OrderNew />} />
      <Route path="/orders/:id" element={<OrderDetail />} />
      <Route path="/select/:token" element={<CustomerSelect />} />
      <Route path="/query" element={<QueryPage />} />
      <Route path="/statistics" element={<Statistics />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
