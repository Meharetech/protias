const Wallet = require('../models/Wallet');
const mongoose = require('mongoose');

/**
 * Handle a wallet transaction for a user
 * @param {string} userId - ID of the user
 * @param {number} amount - Amount to add/subtract
 * @param {string} type - 'credit' or 'debit'
 * @param {string} category - Category like 'referral_signup'
 * @param {string} description - description of transaction
 * @param {ObjectId} referenceId - Associated order or referral ID
 * @param {ClientSession} session - Mongoose session for atomicity
 */
exports.addTransaction = async ({ userId, amount, type, category, description, referenceId, session }) => {
    try {
        let wallet = await Wallet.findOne({ userId }).session(session);

        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        const numericAmount = parseFloat(amount);
        
        // Update balance
        if (type === 'credit') {
            wallet.balance += numericAmount;
            if (['referral_signup', 'referral_purchase', 'signup_bonus'].includes(category)) {
                wallet.totalEarned += numericAmount;
            }
        } else {
            wallet.balance -= numericAmount;
            if (category === 'withdrawal') {
                wallet.totalWithdrawn += numericAmount;
            }
        }

        // Add transaction log
        wallet.transactions.push({
            amount: numericAmount,
            type,
            category,
            description,
            referenceId,
            status: 'completed'
        });

        await wallet.save({ session });
        return wallet;
    } catch (error) {
        console.error('Wallet transaction error:', error);
        throw error;
    }
};

/**
 * Get user wallet and balance
 */
exports.getWallet = async (userId, session = null) => {
    let wallet;
    if (session) {
        wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) {
            wallet = (await Wallet.create([{ userId }], { session }))[0];
        }
    } else {
        wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId });
        }
    }
    return wallet;
};
