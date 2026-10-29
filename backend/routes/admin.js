const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const { verifyAdmin } = require('../middlewares/auth');

// Admin Auth (Unprotected)
router.post('/login', authController.adminLogin);

// Admin Control endpoints (Protected with verifyAdmin)
router.get('/metrics', verifyAdmin, adminController.getDashboardMetrics);
router.get('/dashboard-metrics', verifyAdmin, adminController.getDashboardMetrics);
router.get('/badge-counts', verifyAdmin, adminController.getBadgeCounts);
router.get('/notifications/badge-counts', verifyAdmin, adminController.getBadgeCounts);

router.get('/users', verifyAdmin, adminController.getUsers);
router.post('/users/update', verifyAdmin, adminController.updateUser);

// Deposit screen approvals
router.get('/deposits/pending', verifyAdmin, adminController.getPendingDeposits);
router.get('/pending-deposits', verifyAdmin, adminController.getPendingDeposits);

router.post('/deposits/approve', verifyAdmin, adminController.approveDeposit);
router.post('/approve-deposit', verifyAdmin, adminController.approveDeposit);

router.post('/deposits/reject', verifyAdmin, adminController.rejectDeposit);
router.post('/reject-deposit', verifyAdmin, adminController.rejectDeposit);

// Withdrawal approvals
router.get('/withdrawals/pending', verifyAdmin, adminController.getPendingWithdrawals);
router.get('/pending-withdrawals', verifyAdmin, adminController.getPendingWithdrawals);

router.post('/withdrawals/approve', verifyAdmin, adminController.approveWithdrawal);
router.post('/approve-withdrawal', verifyAdmin, adminController.approveWithdrawal);

router.post('/withdrawals/reject', verifyAdmin, adminController.rejectWithdrawal);
router.post('/reject-withdrawal', verifyAdmin, adminController.rejectWithdrawal);

// Declare Result and settlement
router.post('/declare-result', verifyAdmin, adminController.declareResult);
router.get('/declare-result/list', verifyAdmin, adminController.getDeclaredResults);
router.post('/declare-result/delete', verifyAdmin, adminController.deleteDeclaredResult);
router.post('/declare-result/preview', verifyAdmin, adminController.previewWinners);
router.post('/reports/bid-history/delete', verifyAdmin, adminController.deleteBidHistory);

// System Settings Management
router.get('/settings', verifyAdmin, adminController.getSettings);
router.post('/settings', verifyAdmin, adminController.updateSettings);
router.post('/settings/update', verifyAdmin, adminController.updateSettings);

router.get('/contact-settings', verifyAdmin, adminController.getSettings);
router.post('/contact-settings', verifyAdmin, adminController.updateContact);
router.post('/settings/contact/update', verifyAdmin, adminController.updateContact);

// Game Rates Management
router.get('/rates', verifyAdmin, adminController.getGameRates);
router.get('/game-rates', verifyAdmin, adminController.getGameRates);

router.post('/rates/update', verifyAdmin, adminController.updateGameRates);
router.post('/update-game-rates', verifyAdmin, adminController.updateGameRates);

// Game Names Management
router.get('/games', verifyAdmin, adminController.getAdminGamesList);
router.get('/admin-games-list', verifyAdmin, adminController.getAdminGamesList);

router.post('/games/add', verifyAdmin, adminController.addGame);
router.post('/add-game', verifyAdmin, adminController.addGame);

router.get('/games/week/:gameName', verifyAdmin, adminController.getGameWeekSchedule);
router.post('/games/week/update', verifyAdmin, adminController.updateGameWeekSchedule);

router.post('/games/delete', verifyAdmin, adminController.deleteGame);
router.post('/delete-game', verifyAdmin, adminController.deleteGame);

// Slider Banners Management
router.get('/sliders', verifyAdmin, adminController.getSliderImages);
router.get('/slider-images', verifyAdmin, adminController.getSliderImages);

router.post('/sliders/add', verifyAdmin, adminController.addSliderImage);
router.post('/add-slider-image', verifyAdmin, adminController.addSliderImage);

router.post('/sliders/status', verifyAdmin, adminController.toggleSliderStatus);
router.post('/toggle-slider-status', verifyAdmin, adminController.toggleSliderStatus);

router.post('/sliders/delete', verifyAdmin, adminController.deleteSliderImage);
router.post('/delete-slider-image', verifyAdmin, adminController.deleteSliderImage);

// Additional PHP Parity Endpoints
router.get('/metrics/ank-bids', verifyAdmin, adminController.getSingleAnkBids);
router.get('/single-ank-bids', verifyAdmin, adminController.getSingleAnkBids);

router.get('/metrics/bid-win-report', verifyAdmin, adminController.getBidWinReport);
router.get('/bid-win-report', verifyAdmin, adminController.getBidWinReport);

router.post('/users/toggle-field', verifyAdmin, adminController.toggleUserField);
router.post('/toggle-user-field', verifyAdmin, adminController.toggleUserField);

router.get('/referrals', verifyAdmin, adminController.getReferralReport);
router.get('/referral-report', verifyAdmin, adminController.getReferralReport);

router.get('/commission/pending', verifyAdmin, adminController.getCommissionReport);
router.get('/commission-report', verifyAdmin, adminController.getCommissionReport);

router.post('/commission/approve', verifyAdmin, adminController.approveCommission);
router.post('/approve-commission', verifyAdmin, adminController.approveCommission);

router.get('/commission/paid', verifyAdmin, adminController.getCommissionPayList);
router.get('/commission-pay-list', verifyAdmin, adminController.getCommissionPayList);

router.get('/auto-deposits', verifyAdmin, adminController.getAutoDeposits);
router.post('/auto-deposits/status', verifyAdmin, adminController.handleAutoDeposit);

// Report Management Endpoints
router.get('/reports/bid-history', verifyAdmin, adminController.getBidHistoryReport);
router.get('/bid-history-report', verifyAdmin, adminController.getBidHistoryReport);

router.post('/reports/bid-history/update', verifyAdmin, adminController.updateBidHistory);
router.post('/update-bid-history', verifyAdmin, adminController.updateBidHistory);

router.get('/reports/customer-sell', verifyAdmin, adminController.getCustomerSellReport);
router.get('/customer-sell-report', verifyAdmin, adminController.getCustomerSellReport);

router.get('/reports/winning', verifyAdmin, adminController.getWinningReport);
router.get('/winning-report', verifyAdmin, adminController.getWinningReport);

router.get('/reports/transfers', verifyAdmin, adminController.getTransferReport);
router.get('/transfer-report', verifyAdmin, adminController.getTransferReport);

router.get('/reports/withdrawals', verifyAdmin, adminController.getWithdrawalReport);
router.get('/withdrawal-report', verifyAdmin, adminController.getWithdrawalReport);

router.get('/reports/add-fund', verifyAdmin, adminController.getAddFundReport);
router.get('/add-fund-report', verifyAdmin, adminController.getAddFundReport);

// Wallet Management Endpoints
router.get('/deposits/requests', verifyAdmin, adminController.getFundRequests);
router.get('/withdrawals/requests', verifyAdmin, adminController.getWithdrawalRequests);

router.post('/wallet/add-fund', verifyAdmin, adminController.addFundToUserWallet);
router.post('/add-fund-user-wallet', verifyAdmin, adminController.addFundToUserWallet);

router.get('/wallet/bid-revert', verifyAdmin, adminController.getBidRevertList);
router.get('/bid-revert-list', verifyAdmin, adminController.getBidRevertList);

router.post('/wallet/bid-revert/execute', verifyAdmin, adminController.executeBidRevert);
router.post('/execute-bid-revert', verifyAdmin, adminController.executeBidRevert);

router.post('/change-password', verifyAdmin, adminController.changePassword);

// User Full Detail & Control Endpoints
router.get('/users/:userId/details', verifyAdmin, adminController.getUserFullDetails);
router.get('/user-details/:userId', verifyAdmin, adminController.getUserFullDetails);

router.post('/users/update-password', verifyAdmin, adminController.updateUserPassword);
router.post('/update-user-password', verifyAdmin, adminController.updateUserPassword);

router.post('/users/adjust-wallet', verifyAdmin, adminController.adjustUserWallet);
router.post('/adjust-user-wallet', verifyAdmin, adminController.adjustUserWallet);

// Payment Gateways & UPI Apps Management
router.get('/payment-gateways', verifyAdmin, paymentController.getAdminGateways);
router.post('/payment-gateways/add', verifyAdmin, paymentController.addUpiApp);
router.post('/payment-gateways/update', verifyAdmin, paymentController.updateUpiApp);
router.post('/payment-gateways/delete', verifyAdmin, paymentController.deleteUpiApp);
router.post('/payment-gateways/toggle', verifyAdmin, paymentController.toggleUpiApp);
router.post('/payment-gateways/set-default', verifyAdmin, paymentController.setDefaultUpi);
router.post('/set-default-upi', verifyAdmin, paymentController.setDefaultUpi);
router.post('/payment-gateways/set-auto-upi', verifyAdmin, paymentController.setAutoUpi);
router.post('/set-auto-upi', verifyAdmin, paymentController.setAutoUpi);
router.post('/payment-gateways/set-active', verifyAdmin, paymentController.setActiveGateway);
router.post('/payment-gateways/set-mode', verifyAdmin, paymentController.setDepositMode);

module.exports = router;
