import '@/App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthCallback } from '@/components/AuthCallback';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Plants from '@/pages/Plants';
import Products from '@/pages/Products';
import ShiftIncharges from '@/pages/ShiftIncharges';
import Production from '@/pages/Production';

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/plants" element={
        <ProtectedRoute>
          <Plants />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute>
          <Products />
        </ProtectedRoute>
      } />
      <Route path="/shift-incharges" element={
        <ProtectedRoute>
          <ShiftIncharges />
        </ProtectedRoute>
      } />
      <Route path="/production" element={
        <ProtectedRoute>
          <Production />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Login />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;