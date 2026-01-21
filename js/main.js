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
    DOM.walletList.innerHTML = state.wallets
      .map((wallet) => {
        const balanceClass = wallet.balance < 0 ? "minus" : "plus";
        const formattedBalance = state.isPrivacyMode
          ? "Rp ••••••"
          : formatRupiah(wallet.balance);
        return `
        <li class="${balanceClass}">
          <div class="li-content">
            <div class="tx-details">
              <span class="tx-name">${wallet.icon} ${wallet.name}</span>
              <span class="tx-amount ${balanceClass}">${formattedBalance}</span>
            </div>
            <div class="tx-actions">
              <button class="tx-edit-btn" onclick="event.stopPropagation(); window.editWallet('${wallet.id}')">✏️</button>
              <button class="tx-delete-btn" onclick="event.stopPropagation(); window.confirmDeleteWallet('${wallet.id}')">🗑️</button>
            </div>
          </div>
        </li>
      `;
      })
      .join("");
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

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
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
   INITIALIZATION
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});
