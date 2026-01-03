// --- Security Signature (Do not remove) ---
console.log(
  "\x43\x72\x65\x61\x74\x65\x64\x20\x62\x79\x20\x46\x61\x72\x64\x61\x6E\x20\x41\x7A\x7A\x75\x68\x72\x69"
);

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

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCFPnr_wwe8a3KsWQFyf9Y_hjj81WzOHtU",
  authDomain: "dompet-ku-web.firebaseapp.com",
  projectId: "dompet-ku-web",
  storageBucket: "dompet-ku-web.firebasestorage.app",
  messagingSenderId: "387540289390",
  appId: "1:387540289390:web:529808a041c73242f3637f",
  measurementId: "G-GEJTCBX0DX",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// --- AKTIFKAN DATABASE OFFLINE ---
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == "failed-precondition") {
    console.log("Persistence gagal: Mungkin tab lain sedang terbuka.");
  } else if (err.code == "unimplemented") {
    console.log("Browser tidak mendukung offline persistence.");
  }
});
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- SELECTOR DOM ---
const alertModal = document.getElementById("ios-alert-modal");
const alertMessage = document.getElementById("alert-message");
const alertOkBtn = document.getElementById("alert-ok-btn");
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginBtn = document.getElementById("login-btn");
const anonLoginBtn = document.getElementById("anon-login-btn");
const logoutBtn = document.getElementById("logout-btn");

// UPDATE: SELECTOR TOMBOL PRIVASI
const privacyBtn = document.getElementById("privacy-btn");
// Simpan status sensor (default: false jika belum ada)
let isPrivacyMode = localStorage.getItem("isPrivacyMode") === "true";

const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const ctx = document.getElementById("expenseChart");

// Fungsi untuk memunculkan notifikasi ala iPhone
function showIOSAlert(pesan) {
  alertMessage.innerText = pesan; // Ubah teks pesan
  alertModal.classList.remove("hidden"); // Munculkan modal
}

// Tutup modal saat tombol OKE ditekan
alertOkBtn.onclick = () => {
  alertModal.classList.add("hidden");
};

// TAMBAHAN SELECTOR MODAL IPHONE
const iosModal = document.getElementById("ios-modal");
const modalCancelBtn = document.getElementById("modal-cancel");
const modalConfirmBtn = document.getElementById("modal-confirm");

const filterMonth = document.getElementById("filter-month");

let transactions = [];
let unsubscribe;
let myChart = null;

// --- FUNGSI FORMATTING ---
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// UPDATE: Fungsi Helper untuk Sensor Nominal
function formatMoneyDisplay(angka) {
  if (isPrivacyMode) {
    return "Rp ••••••"; // Tampilan sensor
  }
  return formatRupiah(angka); // Tampilan asli
}

function getMonthYear(firebaseTimestamp) {
  if (!firebaseTimestamp) return "";
  const date = firebaseTimestamp.toDate();
  return date.toLocaleString("id-ID", { month: "long", year: "numeric" });
}

function formatFullDate(firebaseTimestamp) {
  if (!firebaseTimestamp) return "Baru saja...";
  const date = firebaseTimestamp.toDate();
  return date.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// --- EVENT LOGIN & LOGOUT ---
loginBtn.onclick = () => signInWithPopup(auth, provider);

// Tambahan untuk Login Anonymous
anonLoginBtn.onclick = () => {
  signInAnonymously(auth)
    .then(() => {
      console.log("Berhasil masuk sebagai tamu");
    })
    .catch((error) => {
      console.error("Gagal login tamu:", error);
      alert("Gagal masuk: " + error.message);
    });
};

logoutBtn.onclick = () => signOut(auth);

// --- MONITOR STATUS USER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // --- UPDATE: Menangani Nama User (Google vs Tamu) ---
    const namaUser = user.displayName ? user.displayName : "Tamu (Anonymous)";
    console.log("User masuk:", namaUser);

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const q = query(
      collection(db, "transactions"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      transactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      populateFilterOptions();
      init();
    });
  } else {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    if (unsubscribe) unsubscribe();
    transactions = [];
    init();
  }
});

// --- LOGIKA FILTER ---
function populateFilterOptions() {
  const currentSelection = filterMonth.value;
  const months = new Set();
  transactions.forEach((t) => {
    if (t.createdAt) {
      months.add(getMonthYear(t.createdAt));
    }
  });

  filterMonth.innerHTML = '<option value="all">Semua Waktu</option>';
  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.innerText = month;
    filterMonth.appendChild(option);
  });

  if ([...months].includes(currentSelection) || currentSelection === "all") {
    filterMonth.value = currentSelection;
  } else {
    filterMonth.value = "all";
  }
}

function getFilteredTransactions() {
  const selectedMonth = filterMonth.value;
  if (selectedMonth === "all") {
    return transactions;
  }
  return transactions.filter((t) => {
    return t.createdAt && getMonthYear(t.createdAt) === selectedMonth;
  });
}

filterMonth.addEventListener("change", init);

// --- FUNGSI TAMBAH TRANSAKSI ---
async function addTransaction(e) {
  e.preventDefault();

  const textValue = text.value.trim();
  const amountValue = amount.value.trim();

  // --- VALIDASI INPUT ---
  if (textValue === "" && amountValue === "") {
    showIOSAlert("Aduhh, isi keterangan dan jumlah uangmu dulu lee");
    return;
  }
  if (textValue !== "" && amountValue === "") {
    showIOSAlert("Aduhh, isi jumlah uangmu dulu lee");
    return;
  }
  if (textValue === "" && amountValue !== "") {
    showIOSAlert("Aduhh, isi keteranganmu dulu lee");
    return;
  }

  // --- SIMPAN KE FIREBASE ---
  const transaction = {
    text: textValue,
    amount: +amountValue,
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "transactions"), transaction);
    text.value = "";
    amount.value = "";
  } catch (error) {
    console.error("Error menambah dokumen: ", error);
    showIOSAlert("Gagal menyimpan data: " + error.message);
  }
}

// --- VARIABEL UNTUK MENYIMPAN ID TRANSAKSI SEMENTARA ---
let deleteId = null;

function removeTransaction(id) {
  deleteId = id;
  iosModal.classList.remove("hidden");
}

modalCancelBtn.onclick = () => {
  iosModal.classList.add("hidden");
  deleteId = null;
};

modalConfirmBtn.onclick = async () => {
  if (deleteId) {
    await deleteDoc(doc(db, "transactions", deleteId));
    iosModal.classList.add("hidden");
    deleteId = null;
  }
};

// --- TAMPILAN DOM & CHART ---
function addTransactionDOM(transaction) {
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

  // UPDATE: LOGIKA SENSOR DI LIST TRANSAKSI
  const amountDisplay = isPrivacyMode
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

  item.addEventListener("click", (e) => {
    if (e.target.closest(".delete-btn")) return;
    const isActive = item.classList.contains("active-mobile");
    document.querySelectorAll(".list li").forEach((el) => {
      el.classList.remove("active-mobile");
    });
    if (!isActive) {
      item.classList.add("active-mobile");
    }
  });

  list.appendChild(item);
}

// --- UPDATE VALUES (HITUNG SALDO) ---
function updateValues(dataTransaksi) {
  const amounts = dataTransaksi.map((transaction) => transaction.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => (acc += item), 0);
  const expense =
    amounts.filter((item) => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1;

  // --- UPDATE: LOGIKA SENSOR DI SALDO UTAMA, PEMASUKAN, PENGELUARAN ---

  // Saldo Utama
  balance.innerText = formatMoneyDisplay(total);

  // Pemasukan
  const signPlus = income > 0 ? "+" : "";
  money_plus.innerText = isPrivacyMode
    ? "+Rp ••••••"
    : `${signPlus}${formatRupiah(income)}`;

  // Pengeluaran
  const signMinus = expense > 0 ? "-" : "";
  money_minus.innerText = isPrivacyMode
    ? "-Rp ••••••"
    : `${signMinus}${formatRupiah(Math.abs(expense))}`;

  renderChart(income, expense);
}

function renderChart(income, expense) {
  if (myChart) {
    myChart.destroy();
  }
  const total = income + expense;

  myChart = new Chart(ctx, {
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
            if (total === 0) return "0%";
            return ((value * 100) / total).toFixed(1) + "%";
          },
        },
      },
    },
  });
}

function init() {
  list.innerHTML = "";
  const filteredData = getFilteredTransactions();
  filteredData.forEach(addTransactionDOM);
  updateValues(filteredData);
}

// --- LOGIKA TOMBOL PRIVASI / SENSOR ---
function updatePrivacyIcon() {
  // Ganti ikon mata terbuka (lihat) / monyet (tutup mata)
  privacyBtn.innerText = isPrivacyMode ? "🙈" : "👁️";
}

privacyBtn.onclick = () => {
  isPrivacyMode = !isPrivacyMode; // Balik status
  localStorage.setItem("isPrivacyMode", isPrivacyMode); // Simpan di browser

  updatePrivacyIcon();
  init(); // Render ulang semua data
};

// Panggil sekali saat start agar ikon sesuai status terakhir
updatePrivacyIcon();

// --- EXPOSE WINDOW ---
window.removeTransaction = removeTransaction;

form.addEventListener("submit", addTransaction);
