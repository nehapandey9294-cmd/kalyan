import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import UserLayout from './components/layout/UserLayout';

// User Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AddBank from './pages/AddBank';
import AddFund from './pages/AddFund';
import Withdraw from './pages/Withdraw';
import DepositRequestStatus from './pages/DepositRequestStatus';
import WalletHistory from './pages/WalletHistory';
import WithdrawHistory from './pages/WithdrawHistory';
import WinHistory from './pages/WinHistory';
import BidHistory from './pages/BidHistory';
import GameRate from './pages/GameRate';
import HowToPlay from './pages/HowToPlay';
import Support from './pages/Support';
import PlayGame from './pages/PlayGame';
import GameTypes from './pages/GameTypes';
import Chart from './pages/Chart';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import DeclareResult from './pages/admin/DeclareResult';
import { getAdminSessionStatus, clearAdminSession } from './utils/adminSession';

function App() {
  const [auth, setAuth] = useState(!!localStorage.getItem('token'));
  const [adminAuth, setAdminAuth] = useState(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return false;
    const status = getAdminSessionStatus();
    if (status.isExpired) {
      clearAdminSession();
      return false;
    }
    return true;
  });

  useEffect(() => {
    const checkAuth = () => {
      setAuth(!!localStorage.getItem('token'));
      const token = localStorage.getItem('admin_token');
      if (token) {
        const status = getAdminSessionStatus();
        if (status.isExpired) {
          clearAdminSession();
          setAdminAuth(false);
          return;
        }
        setAdminAuth(true);
      } else {
        setAdminAuth(false);
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const isUserAuth = auth && !!localStorage.getItem('token');
  const isAdminAuth = adminAuth && !!localStorage.getItem('admin_token') && !getAdminSessionStatus().isExpired;

  // Helper wrapper for Protected User Routes with UserLayout
  const renderUserPage = (Component, props = {}) => {
    return isUserAuth ? (
      <UserLayout setAuth={setAuth}>
        <Component {...props} setAuth={setAuth} />
      </UserLayout>
    ) : (
      <Navigate to="/login" replace />
    );
  };

  return (
    <Router>
      <Routes>
        {/* User Routes */}
        <Route path="/" element={renderUserPage(Dashboard)} />
        <Route path="/profile" element={renderUserPage(Profile)} />
        <Route path="/add-bank" element={renderUserPage(AddBank)} />
        <Route path="/add-fund" element={renderUserPage(AddFund)} />
        <Route path="/withdraw" element={renderUserPage(Withdraw)} />
        <Route path="/deposit-request-status" element={renderUserPage(DepositRequestStatus)} />
        <Route path="/wallet" element={renderUserPage(WalletHistory)} />
        <Route path="/wallet-history" element={renderUserPage(WalletHistory)} />
        <Route path="/withdraw-history" element={renderUserPage(WithdrawHistory)} />
        <Route path="/win-history" element={renderUserPage(WinHistory)} />
        <Route path="/bid-history" element={renderUserPage(BidHistory)} />
        <Route path="/game-rate" element={renderUserPage(GameRate)} />
        <Route path="/how-to-play" element={renderUserPage(HowToPlay)} />
        <Route path="/support" element={renderUserPage(Support)} />
        <Route path="/game-types" element={renderUserPage(GameTypes)} />
        <Route path="/play-game" element={renderUserPage(PlayGame)} />
        <Route path="/chart" element={renderUserPage(Chart)} />

        {/* User Auth Routes */}
        <Route
          path="/login"
          element={!isUserAuth ? <Login setAuth={setAuth} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/signup"
          element={!isUserAuth ? <Signup setAuth={setAuth} /> : <Navigate to="/" replace />}
        />

        {/* Admin Routes */}
        <Route
          path="/admin/login"
          element={!isAdminAuth ? <AdminLogin setAdminAuth={setAdminAuth} /> : <Navigate to="/admin" replace />}
        />
        <Route
          path="/admin"
          element={isAdminAuth ? <AdminDashboard setAdminAuth={setAdminAuth} /> : <Navigate to="/admin/login" replace />}
        />
        <Route
          path="/admin/declare-result"
          element={isAdminAuth ? <DeclareResult /> : <Navigate to="/admin/login" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
