/* ============================================
   STATE.JS - Application State Management
   ============================================ */

// Application State
export const state = {
  transactions: [],
  wallets: [],
  unsubscribe: null,
  unsubscribeWallets: null,
  chartInstance: null,
  deleteId: null,
  deleteWalletId: null,
  editingWalletId: null,
  selectedWalletIcon: "🏦",
  isPrivacyMode: localStorage.getItem("isPrivacyMode") === "true",
  avgPeriod: "daily",
  transactionType: "income",
};

// Reset state on logout
export const resetState = () => {
  state.transactions = [];
  state.wallets = [];
  if (state.unsubscribe) state.unsubscribe();
  if (state.unsubscribeWallets) state.unsubscribeWallets();
  state.unsubscribe = null;
  state.unsubscribeWallets = null;
};
