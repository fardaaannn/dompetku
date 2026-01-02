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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURASI ---
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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- SELECTOR DOM ---
// (Selector kategori sudah dihapus)
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const ctx = document.getElementById("expenseChart");

const filterMonth = document.getElementById("filter-month");

let transactions = [];
let unsubscribe;
let myChart = null;

// --- FUNGSI FORMAT RUPIAH ---
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// --- FUNGSI TANGGAL (UNTUK FILTER) ---
function getMonthYear(firebaseTimestamp) {
  if (!firebaseTimestamp) return "";
  const date = firebaseTimestamp.toDate();
  return date.toLocaleString("id-ID", { month: "long", year: "numeric" });
}

// --- FUNGSI TANGGAL LENGKAP (UNTUK TAMPILAN) ---
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
logoutBtn.onclick = () => signOut(auth);

// --- MONITOR STATUS USER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User masuk:", user.displayName);
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

// --- FUNGSI FILTER ---
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

// --- FUNGSI TRANSAKSI ---
async function addTransaction(e) {
  e.preventDefault();
  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Mohon isi keterangan dan jumlah uang");
  } else {
    const user = auth.currentUser;
    if (!user) return;

    // [UBAH] Tidak lagi menyimpan field 'category'
    await addDoc(collection(db, "transactions"), {
      text: text.value,
      amount: +amount.value,
      createdAt: serverTimestamp(),
      uid: user.uid,
    });

    text.value = "";
    amount.value = "";
  }
}

async function removeTransaction(id) {
  if (confirm("Hapus transaksi ini?")) {
    await deleteDoc(doc(db, "transactions", id));
  }
}

// --- FUNGSI TAMPILAN & GRAFIK ---

function addTransactionDOM(transaction) {
  const sign = transaction.amount < 0 ? "-" : "+";
  const item = document.createElement("li");

  const fullDateStr = formatFullDate(transaction.createdAt);

  item.classList.add(transaction.amount < 0 ? "minus" : "plus");

  item.innerHTML = `
    <div style="display: flex; flex-direction: column;">
        <span style="font-weight: bold; font-size: 16px; word-wrap: break-word;">
            ${transaction.text}
        </span>
        
        <small style="color: #888; font-size: 11px; margin-top: 4px; font-style: italic;">
           ${fullDateStr}
        </small>
    </div>

    <span class="amount-text">
        ${sign} ${formatRupiah(Math.abs(transaction.amount))}
    </span>
    
    <button class="delete-btn" onclick="window.removeTransaction('${
      transaction.id
    }')">x</button>
  `;
  list.appendChild(item);
}

// [UBAH] Tampilan disederhanakan (Hapus Kategori)
// Tanggal langsung ditaruh di bawah Nama Transaksi
item.innerHTML = `
    <div style="display: flex; flex-direction: column;">
        <span style="font-weight: bold; font-size: 16px;">${
          transaction.text
        }</span>
        
        <small style="color: #888; font-size: 11px; margin-top: 4px; font-style: italic;">
           ${fullDateStr}
        </small>
    </div>

    <span>${sign} ${formatRupiah(Math.abs(transaction.amount))}</span>
    
    <button class="delete-btn" onclick="window.removeTransaction('${
      transaction.id
    }')">x</button>
  `;
list.appendChild(item);

function updateValues(currentTransactions) {
  const amounts = currentTransactions.map((transaction) => transaction.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => (acc += item), 0);
  const expense =
    amounts.filter((item) => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1;

  balance.innerText = `${formatRupiah(total)}`;
  money_plus.innerText = `+${formatRupiah(income)}`;
  money_minus.innerText = `-${formatRupiah(expense)}`;

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

window.removeTransaction = removeTransaction;
form.addEventListener("submit", addTransaction);
