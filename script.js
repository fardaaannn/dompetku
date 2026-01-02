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

// --- KONFIGURASI (JANGAN LUPA ISI INI DENGAN KODEMU LAGI) ---
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
const auth = getAuth(app); // Inisialisasi Auth
const provider = new GoogleAuthProvider(); // Provider Google

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

let transactions = [];
let unsubscribe; // Variabel untuk mematikan langganan data saat logout

// --- EVENT LOGIN & LOGOUT ---

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

// --- MONITOR STATUS USER (Inti Aplikasi) ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // USER LOGIN
    console.log("User masuk:", user.displayName);
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    // Ambil data KHUSUS milik user ini (filter by 'uid')
    // Perhatikan bagian: where("uid", "==", user.uid)
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
        // Jika error index muncul, lihat console browser untuk link perbaikan
      }
    );
  } else {
    // USER LOGOUT
    console.log("User keluar");
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");

    // Hentikan pengambilan data jika ada
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
    // Tambahkan data dengan UID user yang sedang login
    const user = auth.currentUser;
    if (!user) return; // Jaga-jaga kalau belum login

    await addDoc(collection(db, "transactions"), {
      text: text.value,
      amount: +amount.value,
      createdAt: serverTimestamp(),
      uid: user.uid, // PENTING: Menandai ini data milik siapa
    });

    text.value = "";
    amount.value = "";
  }
}

async function removeTransaction(id) {
  await deleteDoc(doc(db, "transactions", id));
}

// --- FUNGSI TAMPILAN (Sama seperti sebelumnya) ---

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
}

function init() {
  list.innerHTML = "";
  transactions.forEach(addTransactionDOM);
  updateValues();
}

window.removeTransaction = removeTransaction;
form.addEventListener("submit", addTransaction);
