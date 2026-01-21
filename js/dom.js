/* ============================================
   DOM.JS - DOM Element References
   ============================================ */

// DOM Elements
export const DOM = {
  // Screens
  loginScreen: document.getElementById("login-screen"),
  appScreen: document.getElementById("app-screen"),

  // Auth
  btnGoogle: document.getElementById("login-btn"),
  btnAnon: document.getElementById("anon-login-btn"),

  // Home Page
  balance: document.getElementById("balance"),
  moneyPlus: document.getElementById("money-plus"),
  moneyMinus: document.getElementById("money-minus"),
  list: document.getElementById("list"),
  healthBar: document.getElementById("health-bar"),
  roastMessage: document.getElementById("roast-message"),
  privacyBtn: document.getElementById("privacy-btn"),

  // Transaction Form
  form: document.getElementById("form"),
  textInput: document.getElementById("text"),
  amountInput: document.getElementById("amount"),
  quickBtns: document.querySelectorAll(".quick-btn"),
  typeIncomeBtn: document.getElementById("type-income"),
  typeExpenseBtn: document.getElementById("type-expense"),
  txTypeToggle: document.querySelector(".tx-type-toggle"),
  walletSelect: document.getElementById("wallet-select"),

  // Media Input
  btnCamera: document.getElementById("btn-camera"),
  btnGallery: document.getElementById("btn-gallery"),
  btnVoice: document.getElementById("btn-voice"),
  galleryInput: document.getElementById("gallery-input"),
  cameraInput: document.getElementById("camera-input"),
  ocrPreview: document.getElementById("ocr-preview"),
  ocrImage: document.getElementById("ocr-image"),
  ocrStatusText: document.getElementById("ocr-status-text"),
  ocrProgressFill: document.getElementById("ocr-progress-fill"),
  ocrCancel: document.getElementById("ocr-cancel"),
  voiceIndicator: document.getElementById("voice-indicator"),
  voiceStop: document.getElementById("voice-stop"),

  // Modals
  deleteModal: document.getElementById("delete-modal"),
  modalConfirm: document.getElementById("modal-confirm"),
  modalCancel: document.getElementById("modal-cancel"),

  // Category Modal
  categorySelect: document.getElementById("category-select"),
  addCategoryBtn: document.getElementById("add-category-btn"),
  categoryModal: document.getElementById("category-modal"),
  catTypeIncome: document.getElementById("cat-type-income"),
  catTypeExpense: document.getElementById("cat-type-expense"),
  newCategoryName: document.getElementById("new-category-name"),
  newCategoryEmoji: document.getElementById("new-category-emoji"),
  categoryCancel: document.getElementById("category-cancel"),
  categorySave: document.getElementById("category-save"),

  // Wallet Page
  walletList: document.getElementById("wallet-list"),
  totalAllWallets: document.getElementById("total-all-wallets"),
  btnAddWallet: document.getElementById("btn-add-wallet"),
  walletModal: document.getElementById("wallet-modal"),
  walletModalTitle: document.getElementById("wallet-modal-title"),
  walletNameInput: document.getElementById("wallet-name"),
  walletBalanceInput: document.getElementById("wallet-balance"),
  walletIconPicker: document.getElementById("wallet-icon-picker"),
  walletCancel: document.getElementById("wallet-cancel"),
  walletSave: document.getElementById("wallet-save"),
  walletIconUpload: document.getElementById("wallet-icon-upload"),
  customIconPreview: document.getElementById("custom-icon-preview"),
  customIconImg: document.getElementById("custom-icon-img"),
  removeCustomIcon: document.getElementById("remove-custom-icon"),

  // Statistics Page
  filterMonth: document.getElementById("filter-month"),
  statIncome: document.getElementById("stat-income"),
  statExpense: document.getElementById("stat-expense"),
  statAvgIncome: document.getElementById("stat-avg-income"),
  statAvgExpense: document.getElementById("stat-avg-expense"),
  statCount: document.getElementById("stat-count"),
  avgIncomeLabel: document.getElementById("avg-income-label"),
  avgExpenseLabel: document.getElementById("avg-expense-label"),
  avgDailyBtn: document.getElementById("avg-daily"),
  avgWeeklyBtn: document.getElementById("avg-weekly"),

  // Settings
  settingsEmail: document.getElementById("settings-email"),
  settingsLogout: document.getElementById("settings-logout"),
  exportData: document.getElementById("export-data"),
  privacyToggle: document.getElementById("privacy-toggle"),

  // PDF
  btnDownloadPdf: document.getElementById("btn-download-pdf"),
};
