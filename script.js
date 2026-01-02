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
// Import modul Authentication
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURASI (PASTIKAN API KEY INI BENAR SESUAI PROJECTMU) ---
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

// Selector baru untuk Grafik
const ctx = document.getElementById("expenseChart");

let transactions = [];
let unsubscribe;
let myChart = null; // Variabel untuk menyimpan instance grafik

// --- EVENT LOGIN & LOGOUT ---

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

// --- MONITOR STATUS USER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // USER LOGIN
    console.log("User masuk:", user.displayName);
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const q = query(
      collection(db, "transactions"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        transactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        init();
      },
      (error) => {
        console.error("Error mengambil data: ", error);
      }
    );
  } else {
    // USER LOGOUT
    console.log("User keluar");
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");

    if (unsubscribe) unsubscribe();
    transactions = [];
    init();
  }
});

// --- FUNGSI TRANSAKSI ---

async function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Mohon isi keterangan dan jumlah uang");
  } else {
    const user = auth.currentUser;
    if (!user) return;

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
  const confirmed = confirm("Apakah Anda yakin ingin menghapus transaksi ini?");
  if (confirmed) {
    await deleteDoc(doc(db, "transactions", id));
  }
}

// --- FUNGSI TAMPILAN & GRAFIK ---

function addTransactionDOM(transaction) {
  const sign = transaction.amount < 0 ? "-" : "+";
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");
  item.innerHTML = `
    ${transaction.text} <span>${sign}Rp ${Math.abs(transaction.amount)}</span>
    <button class="delete-btn" onclick="window.removeTransaction('${
      transaction.id
    }')">x</button>
  `;
  list.appendChild(item);
}

function updateValues() {
  const amounts = transactions.map((transaction) => transaction.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => (acc += item), 0);
  const expense =
    amounts.filter((item) => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1;

  balance.innerText = `Rp ${total}`;
  money_plus.innerText = `+Rp ${income}`;
  money_minus.innerText = `-Rp ${expense}`;

  // Update Grafik setiap kali nilai berubah
  renderChart(income, expense);
}

function renderChart(income, expense) {
  // Jika grafik sudah ada sebelumnya, hancurkan dulu agar tidak menumpuk (error glitch)
  if (myChart) {
    myChart.destroy();
  }

  // Buat grafik baru
  myChart = new Chart(ctx, {
    type: "doughnut", // Jenis grafik: donat
    data: {
      labels: ["Pemasukan", "Pengeluaran"],
      datasets: [
        {
          label: "Jumlah (Rp)",
          data: [income, expense],
          backgroundColor: [
            "#2ecc71", // Warna Hijau (sesuai CSS)
            "#c0392b", // Warna Merah (sesuai CSS)
          ],
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Agar mengikuti tinggi container di CSS
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function init() {
  list.innerHTML = "";
  transactions.forEach(addTransactionDOM);
  updateValues();
}

// Expose fungsi ke window agar bisa dipanggil dari HTML (onclick)
window.removeTransaction = removeTransaction;
form.addEventListener("submit", addTransaction);
