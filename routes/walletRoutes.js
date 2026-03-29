const express = require('express');
const router = express.Router();
const { getWallet, getReferralStats } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

// All wallet routes are protected
router.use(protect);

router.get('/', getWallet);
router.get('/referrals', getReferralStats);

module.exports = router;
