/* ============================================
   MAIN.JS - Application Entry Point
   ============================================ */

// Security Signature
console.log(
  "\x43\x72\x65\x61\x74\x65\x64\x20\x62\x79\x20\x46\x61\x72\x64\x61\x6E\x20\x41\x7A\x7A\x75\x68\x72\x69"
);

// Imports
import { db, auth, provider, RPG_CONFIG } from "./config.js";
import { state, resetState } from "./state.js";
import { DOM } from "./dom.js";
import {
  formatRupiah,
  formatDate,
  getMonthYear,
  showIOSAlert,
  playTransactionSound,
  triggerConfetti,
  triggerShakeAnimation,
  triggerHealAnimation,
} from "./utils.js";

// Firebase Functions
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ============================================
   AUTHENTICATION
   ============================================ */

// Google Sign In
if (DOM.btnGoogle) {
  DOM.btnGoogle.onclick = () => signInWithPopup(auth, provider);
}

// Anonymous Sign In
if (DOM.btnAnon) {
  DOM.btnAnon.onclick = () => signInAnonymously(auth);
}

// Logout
if (DOM.settingsLogout) {
  DOM.settingsLogout.onclick = () => {
    signOut(auth).then(() => {
      resetState();
      renderApp();
    });
  };
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User Logged In:", user.displayName || "Anonymous");
    DOM.loginScreen.classList.add("hidden");
    DOM.appScreen.classList.remove("hidden");
    loadTransactions(user.uid);
    loadWallets(user.uid);
  } else {
    DOM.loginScreen.classList.remove("hidden");
    DOM.appScreen.classList.add("hidden");
    resetState();
    renderApp();
  }
});

/* ============================================
   TRANSACTIONS
   ============================================ */

function loadTransactions(uid) {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  state.unsubscribe = onSnapshot(q, (snapshot) => {
    state.transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    populateFilterOptions();
    renderApp();
  });
}

async function addTransaction(e) {
  e.preventDefault();
  const textVal = DOM.textInput.value.trim();
  const amountVal = DOM.amountInput.value.trim().replace(/[^0-9]/g, "");
  const walletId = DOM.walletSelect?.value || null;
  const category = DOM.categorySelect?.value || null;

  if (!textVal || !amountVal) {
    showIOSAlert("Isi keterangan dan jumlah uang!");
    return;
  }

  try {
    let amountNum = Math.abs(+amountVal);
    if (state.transactionType === "expense") {
      amountNum = -amountNum;
    }

    await addDoc(collection(db, "transactions"), {
      text: textVal,
      amount: amountNum,
      walletId: walletId,
      category: category,
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });

    // Update wallet balance
    if (walletId) {
      const wallet = state.wallets.find((w) => w.id === walletId);
      if (wallet) {
        const newBalance = (wallet.balance || 0) + amountNum;
        await updateDoc(doc(db, "wallets", walletId), { balance: newBalance });
      }
    }

    DOM.textInput.value = "";
    DOM.amountInput.value = "";

    if (amountNum > 0) {
      triggerConfetti();
      triggerHealAnimation();
      playTransactionSound("Pemasukan", amountNum);
    } else {
      triggerShakeAnimation();
      playTransactionSound("Pengeluaran", Math.abs(amountNum));
    }
  } catch (error) {
    showIOSAlert("Gagal menyimpan: " + error.message);
  }
}

async function deleteTransaction(id) {
  try {
    await deleteDoc(doc(db, "transactions", id));
    DOM.deleteModal.classList.add("hidden");
  } catch (err) {
    showIOSAlert("Gagal menghapus: " + err.message);
  }
}

// Form submit
if (DOM.form) {
  DOM.form.addEventListener("submit", addTransaction);
}

// Delete modal handlers
if (DOM.modalCancel) {
  DOM.modalCancel.onclick = () => DOM.deleteModal.classList.add("hidden");
}

if (DOM.modalConfirm) {
  DOM.modalConfirm.onclick = () => {
    if (state.deleteId) {
      deleteTransaction(state.deleteId);
      state.deleteId = null;
    }
  };
}

/* ============================================
   CATEGORY SYSTEM
   ============================================ */

// Category type state
state.categoryType = "income";

// Open category modal
if (DOM.addCategoryBtn) {
  DOM.addCategoryBtn.addEventListener("click", () => {
    if (DOM.categoryModal) DOM.categoryModal.classList.remove("hidden");
    if (DOM.newCategoryName) DOM.newCategoryName.value = "";
    if (DOM.newCategoryEmoji) DOM.newCategoryEmoji.value = "";
    state.categoryType = "income";
    if (DOM.catTypeIncome) DOM.catTypeIncome.classList.add("active");
    if (DOM.catTypeExpense) DOM.catTypeExpense.classList.remove("active");
  });
}

// Close category modal
if (DOM.categoryCancel) {
  DOM.categoryCancel.addEventListener("click", () => {
    if (DOM.categoryModal) DOM.categoryModal.classList.add("hidden");
  });
}

// Toggle category type
if (DOM.catTypeIncome) {
  DOM.catTypeIncome.addEventListener("click", () => {
    state.categoryType = "income";
    DOM.catTypeIncome.classList.add("active");
    if (DOM.catTypeExpense) DOM.catTypeExpense.classList.remove("active");
  });
}
if (DOM.catTypeExpense) {
  DOM.catTypeExpense.addEventListener("click", () => {
    state.categoryType = "expense";
    DOM.catTypeExpense.classList.add("active");
    if (DOM.catTypeIncome) DOM.catTypeIncome.classList.remove("active");
  });
}

// Save custom category
if (DOM.categorySave) {
  DOM.categorySave.addEventListener("click", () => {
    const name = DOM.newCategoryName?.value.trim();
    const emoji = DOM.newCategoryEmoji?.value.trim() || "📌";
    
    if (!name) {
      showIOSAlert("Nama kategori tidak boleh kosong!");
      return;
    }
    
    // Add to dropdown
    const optgroupId = state.categoryType === "income" ? "income-categories" : "expense-categories";
    const optgroup = document.getElementById(optgroupId);
    
    if (optgroup && DOM.categorySelect) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${emoji} ${name}`;
      optgroup.appendChild(option);
      
      // Select the new category
      DOM.categorySelect.value = name;
    }
    
    // Close modal
    if (DOM.categoryModal) DOM.categoryModal.classList.add("hidden");
    showIOSAlert(`Kategori "${name}" berhasil ditambahkan!`);
  });
}

/* ============================================
   WALLETS
   ============================================ */

function loadWallets(userId) {
  if (state.unsubscribeWallets) state.unsubscribeWallets();

  const q = query(collection(db, "wallets"), where("uid", "==", userId));

  state.unsubscribeWallets = onSnapshot(q, (snapshot) => {
    state.wallets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    state.wallets.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderWallets();
    populateWalletSelect();
  });
}

function renderWallets() {
  if (!DOM.walletList) return;

  if (state.wallets.length === 0) {
    DOM.walletList.innerHTML = `
      <div class="wallet-empty-state">
        <span class="wallet-empty-icon">💳</span>
        <p>Belum ada dompet. Tambahkan dompet pertamamu!</p>
      </div>
    `;
  } else {
    DOM.walletList.innerHTML = "";
    state.wallets.forEach((wallet) => {
      const balanceClass = wallet.balance < 0 ? "minus" : "plus";
      const formattedBalance = state.isPrivacyMode
        ? "Rp ••••••"
        : formatRupiah(wallet.balance);
      
      // Check if icon is base64 image or emoji
      const iconHtml = wallet.icon && wallet.icon.startsWith("data:image")
        ? `<img src="${wallet.icon}" class="wallet-custom-icon" alt="icon">`
        : `<span>${wallet.icon}</span>`;
      
      const li = document.createElement("li");
      li.className = balanceClass;
      li.innerHTML = `
        <div class="li-content">
          <div class="tx-details">
            <span class="tx-name">${iconHtml} ${wallet.name}</span>
            <span class="tx-amount ${balanceClass}">${formattedBalance}</span>
          </div>
        </div>
        <div class="wallet-actions-slide">
          <button class="wallet-edit-btn" data-id="${wallet.id}">✏️</button>
          <button class="wallet-delete-btn" data-id="${wallet.id}">🗑️</button>
        </div>
      `;

      // Edit button handler
      li.querySelector(".wallet-edit-btn").onclick = (e) => {
        e.stopPropagation();
        window.editWallet(wallet.id);
      };

      // Delete button handler
      li.querySelector(".wallet-delete-btn").onclick = (e) => {
        e.stopPropagation();
        window.confirmDeleteWallet(wallet.id);
      };

      // Swipe gesture for mobile
      let startX = 0;
      li.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      });
      li.addEventListener("touchend", (e) => {
        const diff = startX - e.changedTouches[0].clientX;
        if (diff > 50) li.classList.add("active-mobile");
        else li.classList.remove("active-mobile");
      });

      DOM.walletList.appendChild(li);
    });
  }

  updateTotalBalance();
}

function updateTotalBalance() {
  const total = state.wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  if (DOM.totalAllWallets) {
    DOM.totalAllWallets.textContent = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(total);
  }
}

function populateWalletSelect() {
  if (!DOM.walletSelect) return;

  const currentValue = DOM.walletSelect.value;
  DOM.walletSelect.innerHTML = '<option value="">-- Pilih Dompet --</option>';

  state.wallets.forEach((wallet) => {
    const option = document.createElement("option");
    option.value = wallet.id;
    option.textContent = `${wallet.icon} ${wallet.name}`;
    DOM.walletSelect.appendChild(option);
  });

  if (currentValue && state.wallets.find((w) => w.id === currentValue)) {
    DOM.walletSelect.value = currentValue;
  }
}

// Wallet modal functions
function openAddWalletModal() {
  state.editingWalletId = null;
  state.selectedWalletIcon = "🏦";
  if (DOM.walletModalTitle) DOM.walletModalTitle.textContent = "Tambah Dompet";
  if (DOM.walletNameInput) DOM.walletNameInput.value = "";
  if (DOM.walletBalanceInput) DOM.walletBalanceInput.value = "";
  document.querySelectorAll(".wallet-icon-option").forEach((opt) => {
    opt.classList.remove("selected");
    if (opt.dataset.icon === "🏦") opt.classList.add("selected");
  });
  if (DOM.walletModal) DOM.walletModal.classList.remove("hidden");
}

window.editWallet = (walletId) => {
  const wallet = state.wallets.find((w) => w.id === walletId);
  if (!wallet) return;

  state.editingWalletId = walletId;
  state.selectedWalletIcon = wallet.icon;
  if (DOM.walletModalTitle) DOM.walletModalTitle.textContent = "Edit Dompet";
  if (DOM.walletNameInput) DOM.walletNameInput.value = wallet.name;
  if (DOM.walletBalanceInput)
    DOM.walletBalanceInput.value = wallet.balance.toString();

  document.querySelectorAll(".wallet-icon-option").forEach((opt) => {
    opt.classList.remove("selected");
    if (opt.dataset.icon === wallet.icon) opt.classList.add("selected");
  });
  if (DOM.walletModal) DOM.walletModal.classList.remove("hidden");
};

function closeWalletModal() {
  if (DOM.walletModal) DOM.walletModal.classList.add("hidden");
  state.editingWalletId = null;
}

async function saveWallet() {
  const name = DOM.walletNameInput?.value.trim();
  const balanceStr = DOM.walletBalanceInput?.value
    .trim()
    .replace(/[^0-9-]/g, "");
  const balance = parseInt(balanceStr) || 0;

  if (!name) {
    showIOSAlert("Nama dompet tidak boleh kosong!");
    return;
  }

  try {
    if (state.editingWalletId) {
      await updateDoc(doc(db, "wallets", state.editingWalletId), {
        name: name,
        icon: state.selectedWalletIcon,
        balance: balance,
      });
    } else {
      await addDoc(collection(db, "wallets"), {
        name: name,
        icon: state.selectedWalletIcon,
        balance: balance,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    }
    closeWalletModal();
  } catch (error) {
    showIOSAlert("Gagal menyimpan: " + error.message);
  }
}

window.confirmDeleteWallet = (walletId) => {
  state.deleteWalletId = walletId;
  DOM.deleteModal.classList.remove("hidden");
  DOM.modalConfirm.onclick = async () => {
    try {
      await deleteDoc(doc(db, "wallets", walletId));
      DOM.deleteModal.classList.add("hidden");
      state.deleteWalletId = null;
    } catch (error) {
      showIOSAlert("Gagal menghapus: " + error.message);
    }
  };
};

// Wallet button handlers
if (DOM.btnAddWallet) {
  DOM.btnAddWallet.addEventListener("click", openAddWalletModal);
}
if (DOM.walletCancel) {
  DOM.walletCancel.addEventListener("click", closeWalletModal);
}
if (DOM.walletSave) {
  DOM.walletSave.addEventListener("click", saveWallet);
}
if (DOM.walletIconPicker) {
  DOM.walletIconPicker.addEventListener("click", (e) => {
    if (e.target.classList.contains("wallet-icon-option")) {
      document
        .querySelectorAll(".wallet-icon-option")
        .forEach((opt) => opt.classList.remove("selected"));
      e.target.classList.add("selected");
      state.selectedWalletIcon = e.target.dataset.icon;
    }
  });
}
if (DOM.walletBalanceInput) {
  DOM.walletBalanceInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
  });
}

// Custom Icon Upload Handler
if (DOM.walletIconUpload) {
  DOM.walletIconUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      showIOSAlert("Ukuran file terlalu besar! Maksimal 500KB.");
      DOM.walletIconUpload.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      state.selectedWalletIcon = base64;
      
      // Show preview
      if (DOM.customIconImg) DOM.customIconImg.src = base64;
      if (DOM.customIconPreview) DOM.customIconPreview.classList.remove("hidden");
      
      // Deselect emoji icons
      document.querySelectorAll(".wallet-icon-option").forEach((opt) => {
        opt.classList.remove("selected");
      });
    };
    reader.readAsDataURL(file);
  });
}

// Remove Custom Icon
if (DOM.removeCustomIcon) {
  DOM.removeCustomIcon.addEventListener("click", () => {
    DOM.walletIconUpload.value = "";
    if (DOM.customIconPreview) DOM.customIconPreview.classList.add("hidden");
    if (DOM.customIconImg) DOM.customIconImg.src = "";
    
    // Reset to default emoji
    state.selectedWalletIcon = "🏦";
    const defaultIcon = document.querySelector('.wallet-icon-option[data-icon="🏦"]');
    if (defaultIcon) defaultIcon.classList.add("selected");
  });
}

/* ============================================
   RENDERING
   ============================================ */

function renderApp() {
  const filtered = getFilteredTransactions();
  const amounts = filtered.map((t) => t.amount);
  const income = amounts.filter((a) => a > 0).reduce((acc, a) => acc + a, 0);
  const expense = amounts
    .filter((a) => a < 0)
    .reduce((acc, a) => acc + Math.abs(a), 0);
  const total = income - expense;

  // Update balance display
  if (DOM.balance) {
    DOM.balance.innerText = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(total);
    DOM.balance.className = `rpg-balance ${total >= 0 ? "plus" : "minus"}`;
  }

  if (DOM.moneyPlus) {
    DOM.moneyPlus.innerText = state.isPrivacyMode
      ? "+Rp ••••••"
      : `+${formatRupiah(income)}`;
  }

  if (DOM.moneyMinus) {
    DOM.moneyMinus.innerText = state.isPrivacyMode
      ? "-Rp ••••••"
      : `-${formatRupiah(expense)}`;
  }

  // Update chart percentages
  const totalFlow = income + expense;
  if (totalFlow > 0) {
    const incomePct = Math.round((income / totalFlow) * 100);
    const expensePct = Math.round((expense / totalFlow) * 100);
    if (DOM.chartIncomePct) DOM.chartIncomePct.textContent = `${incomePct}%`;
    if (DOM.chartExpensePct) DOM.chartExpensePct.textContent = `${expensePct}%`;
  } else {
    if (DOM.chartIncomePct) DOM.chartIncomePct.textContent = "0%";
    if (DOM.chartExpensePct) DOM.chartExpensePct.textContent = "0%";
  }

  // Render transaction list
  if (DOM.list) {
    DOM.list.innerHTML = "";
    filtered.forEach((transaction) => {
      const sign = transaction.amount < 0 ? "minus" : "plus";
      const item = document.createElement("li");
      item.classList.add(sign);
      item.innerHTML = `
        <div class="li-content">
          <div class="tx-details">
            <span class="tx-name">${transaction.text}</span>
            <span class="tx-amount ${sign}">${
        state.isPrivacyMode ? "Rp ••••••" : formatRupiah(transaction.amount)
      }</span>
          </div>
          <span class="tx-date">${formatDate(transaction.createdAt)}</span>
        </div>
        <button class="delete-btn" data-id="${transaction.id}">
          <span class="trash-icon">🗑️</span>
        </button>
      `;

      // Delete button handler
      item.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        state.deleteId = transaction.id;
        DOM.deleteModal.classList.remove("hidden");
        DOM.modalConfirm.onclick = () => {
          deleteTransaction(state.deleteId);
          state.deleteId = null;
        };
      };

      // Swipe gesture
      let startX = 0;
      item.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      });
      item.addEventListener("touchend", (e) => {
        const diff = startX - e.changedTouches[0].clientX;
        if (diff > 50) item.classList.add("active-mobile");
        else item.classList.remove("active-mobile");
      });

      DOM.list.appendChild(item);
    });
  }

  // Update RPG elements
  updateRPG(total);
  updatePrivacyIcon();
  updateChart(income, expense);
}

function getFilteredTransactions() {
  const selected = DOM.filterMonth?.value || "all";
  if (selected === "all") return state.transactions;
  return state.transactions.filter(
    (t) => getMonthYear(t.createdAt) === selected
  );
}

function populateFilterOptions() {
  if (!DOM.filterMonth) return;
  const currentSelection = DOM.filterMonth.value;
  const months = new Set();

  state.transactions.forEach((t) => {
    if (t.createdAt) months.add(getMonthYear(t.createdAt));
  });

  DOM.filterMonth.innerHTML = '<option value="all">Semua Waktu</option>';
  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.innerText = month;
    DOM.filterMonth.appendChild(option);
  });

  if ([...months].includes(currentSelection)) {
    DOM.filterMonth.value = currentSelection;
  }
}

if (DOM.filterMonth) {
  DOM.filterMonth.addEventListener("change", renderApp);
}

/* ============================================
   RPG & GAMIFICATION
   ============================================ */

function updateRPG(totalSaldo) {
  let percentage = (totalSaldo / RPG_CONFIG.MAX_HEALTH) * 100;
  percentage = Math.max(0, Math.min(100, percentage));

  if (DOM.healthBar) {
    DOM.healthBar.style.width = `${percentage}%`;
    if (percentage < 20) DOM.healthBar.style.background = "#c0392b";
    else if (percentage < 50) DOM.healthBar.style.background = "#f1c40f";
    else DOM.healthBar.style.background = "#2ecc71";
  }

  // Roasting text
  let text = "🤔 Hmm, uangnya lari kemana aja nih?";
  if (totalSaldo < 0)
    text = "💀 Udah minus, masih mau gaya? Sadar diri woy!";
  else if (totalSaldo === 0)
    text = "🕸️ Dompet kosong melompong. Laba-laba aja males bersarang.";
  else if (totalSaldo < 100000)
    text = "🤏 Saldo kritis! Jangan beli kopi mahal-mahal.";
  else if (totalSaldo < 500000)
    text = "😐 Lumayan lah, cukup buat bertahan hidup seminggu.";
  else if (totalSaldo < 2000000)
    text = "📈 Nah gitu dong, mulai kelihatan warnanya.";
  else if (totalSaldo >= 5000000) text = "👑 Ampun Sultan! Traktir dong kak!";

  if (DOM.roastMessage) DOM.roastMessage.innerText = text;
}

/* ============================================
   PRIVACY MODE
   ============================================ */

function updatePrivacyIcon() {
  if (DOM.privacyBtn) {
    DOM.privacyBtn.innerText = state.isPrivacyMode ? "🙈" : "👁️";
  }
}

if (DOM.privacyBtn) {
  DOM.privacyBtn.onclick = () => {
    state.isPrivacyMode = !state.isPrivacyMode;
    localStorage.setItem("isPrivacyMode", state.isPrivacyMode);
    if (DOM.privacyToggle) DOM.privacyToggle.checked = state.isPrivacyMode;
    renderApp();
    renderWallets();
  };
}

/* ============================================
   CHART
   ============================================ */

function updateChart(income, expense) {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  if (state.chartInstance) state.chartInstance.destroy();

  state.chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pemasukan", "Pengeluaran"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#2ecc71", "#e74c3c"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (value) => {
            if (income + expense === 0) return "0%";
            return ((value * 100) / (income + expense)).toFixed(1) + "%";
          },
        },
      },
    },
  });
}

/* ============================================
   STATISTICS
   ============================================ */

function updateStatistics() {
  const filtered = getFilteredTransactions();
  const amounts = filtered.map((t) => t.amount);
  const income = amounts.filter((a) => a > 0).reduce((acc, a) => acc + a, 0);
  const expense = amounts
    .filter((a) => a < 0)
    .reduce((acc, a) => acc + Math.abs(a), 0);
  const count = filtered.length;

  const divisor = state.avgPeriod === "daily" ? 30 : 4;
  const avgIncome = income / divisor;
  const avgExpense = expense / divisor;
  const periodLabel = state.avgPeriod === "daily" ? "/ Hari" : "/ Minggu";

  if (DOM.avgIncomeLabel) {
    DOM.avgIncomeLabel.textContent = `Rata-rata Pemasukan ${periodLabel}`;
  }
  if (DOM.avgExpenseLabel) {
    DOM.avgExpenseLabel.textContent = `Rata-rata Pengeluaran ${periodLabel}`;
  }
  if (DOM.statIncome) {
    DOM.statIncome.textContent = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(income);
  }
  if (DOM.statExpense) {
    DOM.statExpense.textContent = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(expense);
  }
  if (DOM.statAvgIncome) {
    DOM.statAvgIncome.textContent = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(Math.round(avgIncome));
  }
  if (DOM.statAvgExpense) {
    DOM.statAvgExpense.textContent = state.isPrivacyMode
      ? "Rp ••••••"
      : formatRupiah(Math.round(avgExpense));
  }
  if (DOM.statCount) {
    DOM.statCount.textContent = count;
  }
}

function setAvgPeriod(period) {
  state.avgPeriod = period;
  if (DOM.avgDailyBtn)
    DOM.avgDailyBtn.classList.toggle("active", period === "daily");
  if (DOM.avgWeeklyBtn)
    DOM.avgWeeklyBtn.classList.toggle("active", period === "weekly");
  
  // Toggle parent class for slide animation
  const avgToggle = document.querySelector(".avg-toggle");
  if (avgToggle) {
    avgToggle.classList.toggle("weekly-active", period === "weekly");
  }
  
  updateStatistics();
}

if (DOM.avgDailyBtn) {
  DOM.avgDailyBtn.addEventListener("click", () => setAvgPeriod("daily"));
}
if (DOM.avgWeeklyBtn) {
  DOM.avgWeeklyBtn.addEventListener("click", () => setAvgPeriod("weekly"));
}

/* ============================================
   NAVIGATION
   ============================================ */

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");
  
  // Create audio element for click sound
  const clickSound = new Audio("mouse-click-sound.mp3");
  clickSound.volume = 0.3;

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Play click sound
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {}); // Ignore autoplay errors
      
      const pageName = item.dataset.page;

      navItems.forEach((i) => i.classList.remove("active"));
      pages.forEach((p) => p.classList.remove("active"));
      item.classList.add("active");

      const targetPage = document.getElementById(`page-${pageName}`);
      if (targetPage) targetPage.classList.add("active");

      if (pageName === "stats") updateStatistics();
      if (pageName === "settings") updateSettingsPage();
      if (pageName === "wallets") renderWallets();

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function updateSettingsPage() {
  if (DOM.settingsEmail && auth.currentUser) {
    DOM.settingsEmail.textContent =
      auth.currentUser.email || "Anonymous User";
  }
}

/* ============================================
   TRANSACTION TYPE TOGGLE
   ============================================ */

function setTransactionType(type) {
  state.transactionType = type;
  if (DOM.typeIncomeBtn)
    DOM.typeIncomeBtn.classList.toggle("active", type === "income");
  if (DOM.typeExpenseBtn)
    DOM.typeExpenseBtn.classList.toggle("active", type === "expense");
  
  // Toggle parent class for slide animation
  if (DOM.txTypeToggle) {
    DOM.txTypeToggle.classList.toggle("expense-active", type === "expense");
  }
}

if (DOM.typeIncomeBtn) {
  DOM.typeIncomeBtn.addEventListener("click", () =>
    setTransactionType("income")
  );
}
if (DOM.typeExpenseBtn) {
  DOM.typeExpenseBtn.addEventListener("click", () =>
    setTransactionType("expense")
  );
}

// Quick amount buttons
DOM.quickBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (DOM.amountInput) {
      DOM.amountInput.value = btn.dataset.amount;
      DOM.amountInput.focus();
    }
  });
});

// Amount input - numbers only
if (DOM.amountInput) {
  DOM.amountInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
  });
}

/* ============================================
   OCR & MEDIA INPUT
   ============================================ */

// Camera button - triggers camera input
if (DOM.btnCamera) {
  DOM.btnCamera.addEventListener("click", () => {
    if (DOM.cameraInput) DOM.cameraInput.click();
  });
}

// Gallery button - triggers file input
if (DOM.btnGallery) {
  DOM.btnGallery.addEventListener("click", () => {
    if (DOM.galleryInput) DOM.galleryInput.click();
  });
}

// Handle camera/gallery file selection
function handleImageForOCR(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target.result;
    
    // Show preview
    if (DOM.ocrImage) DOM.ocrImage.src = imageData;
    if (DOM.ocrPreview) DOM.ocrPreview.classList.remove("hidden");
    if (DOM.ocrStatusText) DOM.ocrStatusText.textContent = "Memproses gambar...";
    if (DOM.ocrProgressFill) DOM.ocrProgressFill.style.width = "0%";
    
    // Run OCR with Tesseract.js
    runOCR(imageData);
  };
  reader.readAsDataURL(file);
}

if (DOM.cameraInput) {
  DOM.cameraInput.addEventListener("change", (e) => {
    handleImageForOCR(e.target.files[0]);
    e.target.value = ""; // Reset for re-selection
  });
}

if (DOM.galleryInput) {
  DOM.galleryInput.addEventListener("change", (e) => {
    handleImageForOCR(e.target.files[0]);
    e.target.value = ""; // Reset for re-selection
  });
}

// OCR Processing with Tesseract.js
async function runOCR(imageData) {
  if (typeof Tesseract === "undefined") {
    showIOSAlert("Tesseract.js belum dimuat. Refresh halaman.");
    return;
  }

  try {
    if (DOM.ocrStatusText) DOM.ocrStatusText.textContent = "Membaca teks...";
    
    const result = await Tesseract.recognize(imageData, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && DOM.ocrProgressFill) {
          const progress = Math.round(m.progress * 100);
          DOM.ocrProgressFill.style.width = `${progress}%`;
          if (DOM.ocrStatusText) DOM.ocrStatusText.textContent = `Memproses... ${progress}%`;
        }
      },
    });

    const text = result.data.text;
    console.log("OCR Result:", text);

    // Parse Indonesian receipt format
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    let foundAmount = null;
    let foundDescription = null;
    
    // Strategy 1: Look for TOTAL, GRAND TOTAL, SUBTOTAL keywords
    const totalKeywords = ["total", "grand total", "subtotal", "sub total", "jumlah", "bayar", "tunai", "cash"];
    
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      
      for (const keyword of totalKeywords) {
        if (lineLower.includes(keyword)) {
          // Extract numbers from this line - look for Rp prefix or large numbers
          const rpMatch = line.match(/[Rr][Pp]\.?\s*([\d.,\s]+)/);
          if (rpMatch) {
            const numStr = rpMatch[1].replace(/[.,\s]/g, "");
            const num = parseInt(numStr);
            if (!isNaN(num) && num > 0 && (!foundAmount || num > foundAmount)) {
              foundAmount = num;
            }
          } else {
            // Look for large numbers (> 1000)
            const numMatches = line.match(/[\d.,]+/g);
            if (numMatches) {
              for (const numStr of numMatches) {
                const num = parseInt(numStr.replace(/[.,]/g, ""));
                if (!isNaN(num) && num >= 1000 && (!foundAmount || num > foundAmount)) {
                  foundAmount = num;
                }
              }
            }
          }
        }
      }
    }
    
    // Strategy 2: If no total found, look for largest number with Rp prefix
    if (!foundAmount) {
      const rpMatches = text.match(/[Rr][Pp]\.?\s*([\d.,\s]+)/g);
      if (rpMatches) {
        for (const match of rpMatches) {
          const numStr = match.replace(/[Rr][Pp]\.?\s*/g, "").replace(/[.,\s]/g, "");
          const num = parseInt(numStr);
          if (!isNaN(num) && num >= 1000 && (!foundAmount || num > foundAmount)) {
            foundAmount = num;
          }
        }
      }
    }
    
    // Strategy 3: Find largest number >= 1000 (likely price)
    if (!foundAmount) {
      const allNumbers = text.match(/[\d.,]+/g);
      if (allNumbers) {
        const amounts = allNumbers
          .map(n => parseInt(n.replace(/[.,]/g, "")))
          .filter(n => !isNaN(n) && n >= 1000);
        
        if (amounts.length > 0) {
          foundAmount = Math.max(...amounts);
        }
      }
    }
    
    // Extract description - look for store name or item names
    // Usually first few lines contain store name
    if (lines.length > 0) {
      // Skip lines that are mostly numbers or very short
      for (const line of lines.slice(0, 5)) {
        const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
        if (letterCount >= 3 && line.length >= 5 && line.length <= 50) {
          // Good candidate for description
          foundDescription = line.replace(/[^\w\s]/g, "").trim();
          break;
        }
      }
    }
    
    // Apply results
    if (foundAmount) {
      if (DOM.amountInput) DOM.amountInput.value = foundAmount.toString();
      if (DOM.ocrStatusText) {
        DOM.ocrStatusText.textContent = `✅ Ditemukan: Rp ${foundAmount.toLocaleString("id-ID")}`;
      }
    } else {
      if (DOM.ocrStatusText) DOM.ocrStatusText.textContent = "❌ Tidak ada nominal ditemukan";
    }
    
    if (foundDescription && DOM.textInput && !DOM.textInput.value) {
      DOM.textInput.value = foundDescription.substring(0, 50);
    }

  } catch (error) {
    console.error("OCR Error:", error);
    if (DOM.ocrStatusText) DOM.ocrStatusText.textContent = "❌ Gagal membaca gambar";
  }
}

// Cancel OCR preview
if (DOM.ocrCancel) {
  DOM.ocrCancel.addEventListener("click", () => {
    if (DOM.ocrPreview) DOM.ocrPreview.classList.add("hidden");
    if (DOM.ocrImage) DOM.ocrImage.src = "";
    if (DOM.ocrProgressFill) DOM.ocrProgressFill.style.width = "0%";
  });
}

/* ============================================
   VOICE INPUT (Web Speech API)
   ============================================ */

let recognition = null;

if (DOM.btnVoice) {
  DOM.btnVoice.addEventListener("click", () => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Detect Safari/iOS
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isSafari || isIOS) {
      showIOSAlert("⚠️ Voice input tidak tersedia di Safari/iOS. Gunakan Chrome untuk fitur ini.");
      return;
    }
    
    if (!SpeechRecognition) {
      showIOSAlert("Browser tidak mendukung voice input. Gunakan Chrome/Edge.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      if (DOM.voiceIndicator) DOM.voiceIndicator.classList.remove("hidden");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice Result:", transcript);
      
      // Parse the transcript
      // Look for number patterns
      const numbers = transcript.match(/\d+/g);
      const textPart = transcript.replace(/\d+/g, "").trim();
      
      if (numbers && numbers.length > 0) {
        // Use the largest number as amount
        const amount = Math.max(...numbers.map(Number));
        if (DOM.amountInput) DOM.amountInput.value = amount.toString();
      }
      
      if (textPart && DOM.textInput) {
        DOM.textInput.value = textPart;
      } else if (!textPart && transcript && DOM.textInput) {
        // If only numbers, put full transcript in description
        DOM.textInput.value = transcript;
      }

      showIOSAlert(`Terdeteksi: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      if (event.error === "not-allowed") {
        showIOSAlert("Izin mikrofon ditolak. Aktifkan di pengaturan browser.");
      }
    };

    recognition.onend = () => {
      if (DOM.voiceIndicator) DOM.voiceIndicator.classList.add("hidden");
      recognition = null;
    };

    recognition.start();
  });
}

// Stop voice recording
if (DOM.voiceStop) {
  DOM.voiceStop.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
    }
  });
}

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});
