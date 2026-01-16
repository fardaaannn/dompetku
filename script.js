// --- Security Signature (Do not remove) ---
console.log(
  "\x43\x72\x65\x61\x74\x65\x64\x20\x62\x79\x20\x46\x61\x72\x64\x61\x6E\x20\x41\x7A\x7A\x75\x68\x72\x69"
);

// --- SETUP SOUND EFFECTS ---
const sfxMasuk = new Audio("./pemasukan1.mp3");
const sfxKecil = new Audio("./pengeluaran_under100k.mp3"); // 0 - 100rb
const sfxSedang = new Audio("./pengeluaran_100k-1jt.mp3"); // 100rb - 1jt
const sfxBesar = new Audio("./pengeluaran_1jt++.mp3"); // > 1jt

// Fungsi Pintar Memilih Suara
function playTransactionSound(kategori, jumlah) {
  try {
    // 1. Logika Pemasukan
    if (kategori === "Pemasukan") {
      sfxMasuk.currentTime = 0; // Reset durasi biar bisa di-spam
      sfxMasuk.play().catch((e) => console.log("Gagal memutar audio:", e));
      return;
    }

    // 2. Logika Pengeluaran Berjenjang
    if (kategori === "Pengeluaran") {
      let audioToPlay;

      if (jumlah <= 100000) {
        audioToPlay = sfxKecil;
      } else if (jumlah > 100000 && jumlah <= 1000000) {
        audioToPlay = sfxSedang;
      } else {
        // Di atas 1 Juta
        audioToPlay = sfxBesar;
      }

      // Mainkan suara yang terpilih
      if (audioToPlay) {
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch((e) => console.log("Gagal memutar audio:", e));
      }
    }
  } catch (err) {
    console.warn("Sound error:", err);
  }
}

// --- IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCFPnr_wwe8a3KsWQFyf9Y_hjj81WzOHtU",
  authDomain: "dompet-ku-web.firebaseapp.com",
  projectId: "dompet-ku-web",
  storageBucket: "dompet-ku-web.firebasestorage.app",
  messagingSenderId: "387540289390",
  appId: "1:387540289390:web:529808a041c73242f3637f",
  measurementId: "G-GEJTCBX0DX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.log("Persistence warning:", err.code);
});

// --- DOM ELEMENTS (Centralized) ---
const DOM = {
  loginScreen: document.getElementById("login-screen"),
  appScreen: document.getElementById("app-screen"),
  loginBtn: document.getElementById("login-btn"),
  anonLoginBtn: document.getElementById("anon-login-btn"),
  logoutBtn: document.getElementById("logout-btn"),

  privacyBtn: document.getElementById("privacy-btn"),
  balance: document.getElementById("balance"),
  moneyPlus: document.getElementById("money-plus"),
  moneyMinus: document.getElementById("money-minus"),

  list: document.getElementById("list"),
  form: document.getElementById("form"),
  textInput: document.getElementById("text"),
  amountInput: document.getElementById("amount"),
  filterMonth: document.getElementById("filter-month"),

  chartCtx: document.getElementById("expenseChart"),
  btnDownloadPdf: document.getElementById("btn-download-pdf"),

  // Modals
  alertModal: document.getElementById("ios-alert-modal"),
  alertMessage: document.getElementById("alert-message"),
  alertOkBtn: document.getElementById("alert-ok-btn"),
  deleteModal: document.getElementById("ios-modal"),
  modalCancel: document.getElementById("modal-cancel"),
  modalConfirm: document.getElementById("modal-confirm"),

  // RPG
  healthBar: document.getElementById("health-bar"),
  roastMessage: document.getElementById("roast-message"),
};

// --- STATE MANAGEMENT ---
let state = {
  transactions: [],
  unsubscribe: null,
  chartInstance: null,
  deleteId: null,
  isPrivacyMode: localStorage.getItem("isPrivacyMode") === "true",
};

const RPG_CONFIG = {
  MAX_HEALTH: 5000000,
};

// --- HELPER FUNCTIONS ---
const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

const formatMoneyDisplay = (angka) => {
  if (state.isPrivacyMode) return "Rp ••••••";
  return formatRupiah(angka);
};

const getMonthYear = (timestamp) => {
  if (!timestamp) return "";
  return timestamp
    .toDate()
    .toLocaleString("id-ID", { month: "long", year: "numeric" });
};

// --- UI NOTIFICATIONS (iOS Style) ---
function showIOSAlert(message) {
  DOM.alertMessage.innerText = message;
  DOM.alertModal.classList.remove("hidden");
}

DOM.alertOkBtn.onclick = () => DOM.alertModal.classList.add("hidden");

// --- CORE APP LOGIC ---

// 1. Auth Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userName = user.displayName || "Tamu (Anonymous)";
    console.log("User Logged In:", userName);

    DOM.loginScreen.classList.add("hidden");
    DOM.appScreen.classList.remove("hidden");
    loadTransactions(user.uid);
  } else {
    DOM.loginScreen.classList.remove("hidden");
    DOM.appScreen.classList.add("hidden");
    if (state.unsubscribe) state.unsubscribe();
    state.transactions = [];
    renderApp();
  }
});

// 2. Load Transactions (Realtime)
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

// 3. Add Transaction
async function addTransaction(e) {
  e.preventDefault();
  const textVal = DOM.textInput.value.trim();
  const amountVal = DOM.amountInput.value.trim();

  if (!textVal || !amountVal) {
    showIOSAlert("Aduhh, isi keterangan dan jumlah uangmu dulu lee");
    return;
  }

  try {
    const amountNum = +amountVal;
    await addDoc(collection(db, "transactions"), {
      text: textVal,
      amount: amountNum,
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });

    DOM.textInput.value = "";
    DOM.amountInput.value = "";

    // Trigger Effects
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

// 4. Delete Transaction Logic
window.removeTransaction = (id) => {
  state.deleteId = id;
  DOM.deleteModal.classList.remove("hidden");
};

DOM.modalCancel.onclick = () => {
  DOM.deleteModal.classList.add("hidden");
  state.deleteId = null;
};

DOM.modalConfirm.onclick = async () => {
  if (state.deleteId) {
    await deleteDoc(doc(db, "transactions", state.deleteId));
    DOM.deleteModal.classList.add("hidden");
    state.deleteId = null;
  }
};

// --- RENDER FUNCTIONS ---

function renderApp() {
  DOM.list.innerHTML = "";
  const filtered = getFilteredTransactions();

  // Render List
  filtered.forEach(renderTransactionItem);

  // Calculate Totals
  const amounts = filtered.map((t) => t.amount);
  const total = amounts.reduce((acc, item) => acc + item, 0);
  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => acc + item, 0);
  const expense =
    amounts.filter((item) => item < 0).reduce((acc, item) => acc + item, 0) *
    -1;

  // Update UI Text
  DOM.balance.innerText = formatMoneyDisplay(total);
  DOM.moneyPlus.innerText = state.isPrivacyMode
    ? "+Rp ••••••"
    : `+${formatRupiah(income)}`;
  DOM.moneyMinus.innerText = state.isPrivacyMode
    ? "-Rp ••••••"
    : `-${formatRupiah(expense)}`;

  // Update Modules
  updateChart(income, expense, total);
  updateRPG(total);
  updatePrivacyIcon();
}

function renderTransactionItem(transaction) {
  const sign = transaction.amount < 0 ? "-" : "+";
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");

  let dateString = "Baru saja";
  if (transaction.createdAt) {
    const dateObj = transaction.createdAt.seconds
      ? new Date(transaction.createdAt.seconds * 1000)
      : new Date(transaction.createdAt);

    dateString = dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const amountDisplay = state.isPrivacyMode
    ? "Rp ••••••"
    : formatRupiah(Math.abs(transaction.amount));

  item.innerHTML = `
    <div class="li-content">
      <div class="tx-details">
        <span class="tx-name">${transaction.text}</span>
        <span class="tx-amount">${sign}${amountDisplay}</span>
        <span class="tx-date">${dateString}</span>
      </div>
    </div>
    <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">
      <span class="trash-icon">🗑️</span>
    </button>
  `;

  // Mobile touch handling
  item.addEventListener("click", (e) => {
    if (e.target.closest(".delete-btn")) return;
    document
      .querySelectorAll(".list li")
      .forEach((el) => el.classList.remove("active-mobile"));
    item.classList.add("active-mobile");
  });

  DOM.list.appendChild(item);
}

// --- CHART & GRAPHICS ---
function updateChart(income, expense, total) {
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  state.chartInstance = new Chart(DOM.chartCtx, {
    type: "doughnut",
    plugins: [ChartDataLabels],
    data: {
      labels: ["Pemasukan", "Pengeluaran"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#2ecc71", "#c0392b"],
          borderWidth: 1,
          borderColor: "#ffffff",
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

// --- FILTER LOGIC ---
function populateFilterOptions() {
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

function getFilteredTransactions() {
  const selected = DOM.filterMonth.value;
  if (selected === "all") return state.transactions;
  return state.transactions.filter(
    (t) => getMonthYear(t.createdAt) === selected
  );
}

DOM.filterMonth.addEventListener("change", renderApp);

// --- RPG & GAMIFICATION ---
function updateRPG(totalSaldo) {
  // Health Bar
  let percentage = (totalSaldo / RPG_CONFIG.MAX_HEALTH) * 100;
  percentage = Math.max(0, Math.min(100, percentage)); // Clamp 0-100

  DOM.healthBar.style.width = `${percentage}%`;

  if (percentage < 20) DOM.healthBar.style.background = "#c0392b";
  else if (percentage < 50) DOM.healthBar.style.background = "#f1c40f";
  else DOM.healthBar.style.background = "#2ecc71";

  // Roasting Text
  let text = "🤔 Hmm, uangnya lari kemana aja nih?";
  if (totalSaldo < 0) text = "💀 Udah minus, masih mau gaya? Sadar diri woy!";
  else if (totalSaldo === 0)
    text = "🕸️ Dompet kosong melompong. Laba-laba aja males bersarang.";
  else if (totalSaldo < 100000)
    text = "🤏 Saldo kritis! Jangan beli kopi mahal-mahal.";
  else if (totalSaldo < 500000)
    text = "😐 Lumayan lah, cukup buat bertahan hidup seminggu.";
  else if (totalSaldo < 2000000)
    text = "📈 Nah gitu dong, mulai kelihatan warnanya.";
  else if (totalSaldo >= 5000000) text = "👑 Ampun Sultan! Traktir dong kak!";

  DOM.roastMessage.innerText = text;
}

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#2ecc71", "#f1c40f", "#ecf0f1"],
  });
}

function triggerShakeAnimation() {
  document.body.classList.add("shake-animation");
  setTimeout(() => document.body.classList.remove("shake-animation"), 500);
}

function triggerHealAnimation() {
  DOM.balance.classList.add("heal-animation");
  setTimeout(() => DOM.balance.classList.remove("heal-animation"), 500);
}

// --- PRIVACY MODE ---
function updatePrivacyIcon() {
  DOM.privacyBtn.innerText = state.isPrivacyMode ? "🙈" : "👁️";
}

DOM.privacyBtn.onclick = () => {
  state.isPrivacyMode = !state.isPrivacyMode;
  localStorage.setItem("isPrivacyMode", state.isPrivacyMode);
  renderApp();
};

// --- PDF EXPORT FEATURE ---
DOM.btnDownloadPdf.onclick = async () => {
  const originalText = DOM.btnDownloadPdf.innerHTML;
  DOM.btnDownloadPdf.innerText = "⏳ Otw lee...";
  DOM.btnDownloadPdf.disabled = true;

  try {
    if (!window.jspdf) throw new Error("Library PDF belum siap.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Font Helper
    const fetchFont = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Font error");
      const buff = await res.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buff);
      for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
      return window.btoa(binary);
    };

    // Load Fonts
    let fontName = "helvetica";
    try {
      const reg = await fetchFont(
        "https://cdn.jsdelivr.net/gh/rsms/inter@4.0/font-files/Inter-Regular.ttf"
      );
      const bold = await fetchFont(
        "https://cdn.jsdelivr.net/gh/rsms/inter@4.0/font-files/Inter-Bold.ttf"
      );
      doc.addFileToVFS("Inter-R.ttf", reg);
      doc.addFileToVFS("Inter-B.ttf", bold);
      doc.addFont("Inter-R.ttf", "Inter", "normal");
      doc.addFont("Inter-B.ttf", "Inter", "bold");
      fontName = "Inter";
    } catch (e) {
      console.warn("Pakai font default");
    }

    const data = getFilteredTransactions();
    if (data.length === 0) throw new Error("Tidak ada data transaksi.");

    // Calculations
    const inc = data
      .filter((t) => t.amount > 0)
      .reduce((a, t) => a + t.amount, 0);
    const exp = data
      .filter((t) => t.amount < 0)
      .reduce((a, t) => a + Math.abs(t.amount), 0);
    const total = inc - exp;
    const fmt = (n) => "Rp" + n.toLocaleString("id-ID");
    const bulan = DOM.filterMonth.options[DOM.filterMonth.selectedIndex].text;

    // --- PDF DRAWING ---
    // Header Box
    doc.setFillColor(18, 18, 18);
    doc.roundedRect(14, 10, 182, 25, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(fontName, "bold");
    doc.text("Dompetku", 105, 22.5, { align: "center", baseline: "middle" });

    // User Info
    const uName = auth.currentUser
      ? auth.currentUser.displayName || "Pengguna"
      : "Tamu";
    const uEmail = auth.currentUser ? auth.currentUser.email : "-";

    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, 40, 85, 22, 3, 3, "FD");

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont(fontName, "bold");
    doc.text(uName, 19, 48);
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont(fontName, "normal");
    doc.text(uEmail, 19, 55);

    // Summary Right
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Periode:", 196, 45, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(bulan, 196, 50, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Sisa Saldo:", 196, 56, { align: "right" });
    doc.setFontSize(12);
    doc.setTextColor(0, 170, 19);
    doc.setFont(fontName, "bold");
    doc.text(fmt(total), 196, 62, { align: "right" });

    // Table
    const body = data.map((t) => {
      let dStr = "-";
      if (t.createdAt) {
        const d = t.createdAt.seconds
          ? new Date(t.createdAt.seconds * 1000)
          : new Date(t.createdAt);
        dStr =
          d.toLocaleDateString("id-ID") +
          "\n" +
          d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      }
      return [
        dStr,
        t.text,
        t.amount < 0 ? "Pengeluaran" : "Pemasukan",
        fmt(Math.abs(t.amount)),
      ];
    });

    doc.autoTable({
      startY: 70,
      head: [["Tanggal", "Keterangan", "Tipe", "Nominal"]],
      body: body,
      theme: "grid",
      styles: {
        font: fontName,
        fontSize: 9,
        cellPadding: 5,
        valign: "middle",
        lineColor: [230, 230, 230],
      },
      headStyles: {
        fillColor: [240, 255, 240],
        textColor: [30, 30, 30],
        fontStyle: "bold",
      },
      columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 3) {
          d.cell.styles.textColor =
            body[d.row.index][2] === "Pengeluaran"
              ? [220, 50, 50]
              : [0, 150, 0];
        }
      },
    });

    // Footer
    const pCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text("Dicetak oleh Dompetku", 14, 285);
      doc.text("Halaman " + i, 195, 285, { align: "right" });
    }

    doc.save(`Laporan_Dompetku_${bulan}.pdf`);
  } catch (e) {
    showIOSAlert("PDF Gagal: " + e.message);
  } finally {
    DOM.btnDownloadPdf.innerHTML = originalText;
    DOM.btnDownloadPdf.disabled = false;
  }
};

// --- GENERAL EVENT LISTENERS ---
DOM.loginBtn.onclick = () => signInWithPopup(auth, provider);

DOM.anonLoginBtn.onclick = () => {
  signInAnonymously(auth).catch((e) => alert("Gagal tamu: " + e.message));
};

DOM.logoutBtn.onclick = () => signOut(auth);

DOM.form.addEventListener("submit", addTransaction);

// Input Validation (Numbers Only for Amount)
if (DOM.amountInput) {
  DOM.amountInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9-]/g, "");
  });
}
