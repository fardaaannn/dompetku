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

// --- HELPER: Mengubah ArrayBuffer ke Base64 (Untuk Load Font) ---
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// --- HELPER: Download Font Inter dari CDN ---
async function fetchFont(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

// --- FITUR DOWNLOAD PDF (VERSI FINAL & MANDIRI) ---
const btnDownloadPdf = document.getElementById("btn-download-pdf");

if (btnDownloadPdf) {
  btnDownloadPdf.addEventListener("click", async () => {
    // 1. Simpan teks asli & Ubah tombol jadi loading
    const originalText = btnDownloadPdf.innerHTML;
    btnDownloadPdf.innerText = "⏳ Memproses...";
    btnDownloadPdf.disabled = true;

    try {
      // 2. Cek apakah Library jsPDF sudah ada
      if (!window.jspdf) {
        throw new Error(
          "Library jsPDF belum dimuat. Pastikan internet lancar lalu refresh halaman."
        );
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // --- FUNGSI PEMBANTU (Ditaruh di dalam agar tidak hilang) ---
      const arrayBufferToBase64 = (buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      const fetchFont = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal download font");
        const buffer = await response.arrayBuffer();
        return arrayBufferToBase64(buffer);
      };

      // --- LOGIKA SMART FONT LOADING ---
      let fontName = "helvetica"; // Default (jika internet error)
      let fontStyleRegular = "normal";
      let fontStyleBold = "bold";

      try {
        // Gunakan URL CDN yang lebih stabil (jsDelivr GitHub)
        const fontRegular = await fetchFont(
          "https://cdn.jsdelivr.net/gh/rsms/inter@4.0/font-files/Inter-Regular.ttf"
        );
        const fontBold = await fetchFont(
          "https://cdn.jsdelivr.net/gh/rsms/inter@4.0/font-files/Inter-Bold.ttf"
        );

        // Daftarkan Font
        doc.addFileToVFS("Inter-Regular.ttf", fontRegular);
        doc.addFileToVFS("Inter-Bold.ttf", fontBold);
        doc.addFont("Inter-Regular.ttf", "Inter", "normal");
        doc.addFont("Inter-Bold.ttf", "Inter", "bold");

        fontName = "Inter"; // Sukses ganti ke Inter
      } catch (fontError) {
        console.warn(
          "Gagal memuat font Inter, menggunakan Helvetica.",
          fontError
        );
        // Kita tidak throw error disini, biar PDF tetap ter-download meski font standar
      }

      // --- MULAI GAMBAR PDF ---
      doc.setFont(fontName, fontStyleRegular);

      // Ambil Data
      // Pastikan fungsi getFilteredTransactions ada di script.js kamu
      if (typeof getFilteredTransactions !== "function") {
        throw new Error("Fungsi getFilteredTransactions tidak ditemukan.");
      }

      const data = getFilteredTransactions();
      if (data.length === 0) {
        showIOSAlert("Tidak ada data transaksi untuk dicetak.");
        btnDownloadPdf.innerHTML = originalText;
        btnDownloadPdf.disabled = false;
        return;
      }

      // Hitung Ringkasan
      const totalIncome = data
        .filter((t) => t.amount > 0)
        .reduce((acc, t) => acc + t.amount, 0);
      const totalExpense = data
        .filter((t) => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
      const grandTotal = totalIncome - totalExpense;
      const formatRupiahPDF = (num) => "Rp" + num.toLocaleString("id-ID");

      // 1. HEADER ATAS (Kotak Hitam Tumpul)
      doc.setFillColor(18, 18, 18);
      doc.roundedRect(14, 10, 182, 25, 4, 4, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(fontName, fontStyleBold);
      doc.text("Dompetku", 20, 26);

      // 2. INFO USER
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(14, 40, 85, 22, 3, 3, "FD");

      const userName = auth.currentUser
        ? auth.currentUser.displayName || "Pengguna"
        : "Tamu";
      const userEmail = auth.currentUser ? auth.currentUser.email : "-";

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont(fontName, fontStyleBold);
      doc.text(userName, 19, 48);

      doc.setFontSize(8);
      doc.setFont(fontName, fontStyleRegular);
      doc.setTextColor(120, 120, 120);
      doc.text(userEmail, 19, 55);

      // 3. PERIODE & SALDO
      const dropdown = document.getElementById("filter-month");
      const bulanPilihan = dropdown.options[dropdown.selectedIndex].text;

      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("Periode Transaksi:", 196, 45, { align: "right" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, fontStyleRegular);
      doc.text(bulanPilihan, 196, 50, { align: "right" });

      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("Sisa Saldo:", 196, 56, { align: "right" });

      doc.setFontSize(12);
      doc.setTextColor(0, 170, 19);
      doc.setFont(fontName, fontStyleBold);
      doc.text(formatRupiahPDF(grandTotal), 196, 62, { align: "right" });

      // TABEL TRANSAKSI
      const tableBody = data.map((t) => {
        let dateStr = "-";
        let timeStr = "";
        if (t.createdAt) {
          const dateObj = t.createdAt.seconds
            ? new Date(t.createdAt.seconds * 1000)
            : new Date(t.createdAt);
          dateStr = dateObj.toLocaleDateString("id-ID");
          timeStr = dateObj.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        const isExpense = t.amount < 0;
        return [
          dateStr + "\n" + timeStr,
          t.text,
          isExpense ? "Pengeluaran" : "Pemasukan",
          formatRupiahPDF(Math.abs(t.amount)),
        ];
      });

      doc.autoTable({
        startY: 70,
        head: [["Tanggal", "Keterangan", "Tipe", "Nominal"]],
        body: tableBody,
        theme: "grid",
        styles: {
          font: fontName,
          fontSize: 9,
          cellPadding: 5,
          valign: "middle",
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
          textColor: [60, 60, 60],
        },
        headStyles: {
          fillColor: [240, 255, 240],
          textColor: [30, 30, 30],
          fontStyle: "bold",
          halign: "left",
          lineWidth: 0,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 30 },
          3: { cellWidth: 40, halign: "right", fontStyle: "bold" },
        },
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index === 3) {
            const rawType = tableBody[data.row.index][2];
            if (rawType === "Pengeluaran") {
              data.cell.styles.textColor = [220, 50, 50];
            } else {
              data.cell.styles.textColor = [0, 150, 0];
            }
          }
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(fontName, fontStyleRegular);
        doc.setTextColor(180, 180, 180);
        doc.text("Dicetak dari Dompetku", 14, 285);
        doc.text("Halaman " + i, 195, 285, { align: "right" });
      }

      doc.save(`Laporan_Dompetku_${bulanPilihan}.pdf`);
    } catch (error) {
      console.error("Error Detail:", error);
      // Tampilkan pesan error yang SPESIFIK agar kita tahu masalahnya
      showIOSAlert("Gagal: " + error.message);
    } finally {
      btnDownloadPdf.innerHTML = originalText;
      btnDownloadPdf.disabled = false;
    }
  });
}

// --- EXPOSE WINDOW ---
window.removeTransaction = removeTransaction;

form.addEventListener("submit", addTransaction);

// --- FITUR: HANYA ANGKA DAN MINUS ---
const inputJumlah = document.getElementById("amount"); // Pastikan ID ini sesuai dengan di HTML kamu

if (inputJumlah) {
  inputJumlah.addEventListener("input", function () {
    // Regular Expression (Regex) untuk mencari karakter SELAIN angka (0-9) dan minus (-)
    // /[^0-9-]/g artinya: cari karakter apa saja yang BUKAN 0-9 dan BUKAN -

    // Ganti karakter terlarang tersebut dengan string kosong (dihapus)
    this.value = this.value.replace(/[^0-9-]/g, "");
  });
}
