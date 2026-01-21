/* ============================================
   UTILS.JS - Helper Functions & Utilities
   ============================================ */

// Format currency to Indonesian Rupiah
export const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
};

// Format date
export const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Get month/year string from timestamp
export const getMonthYear = (timestamp) => {
  if (!timestamp) return null;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

// Show iOS-style alert
export const showIOSAlert = (message) => {
  const modal = document.getElementById("ios-alert-modal");
  const msgEl = document.getElementById("alert-message");
  const okBtn = document.getElementById("alert-ok-btn");

  if (modal && msgEl) {
    msgEl.textContent = message;
    modal.classList.remove("hidden");

    okBtn.onclick = () => modal.classList.add("hidden");
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    };
  }
};

// Sound Effects
const sfxMasuk = new Audio("./pemasukan1.mp3");
const sfxKecil = new Audio("./pengeluaran_under100k.mp3");
const sfxSedang = new Audio("./pengeluaran_100k-1jt.mp3");
const sfxBesar = new Audio("./pengeluaran_1jt++.mp3");

export const playTransactionSound = (kategori, jumlah) => {
  try {
    if (kategori === "Pemasukan") {
      sfxMasuk.currentTime = 0;
      sfxMasuk.play().catch((e) => console.log("Audio error:", e));
      return;
    }

    if (kategori === "Pengeluaran") {
      let audioToPlay;
      if (jumlah <= 100000) {
        audioToPlay = sfxKecil;
      } else if (jumlah > 100000 && jumlah <= 1000000) {
        audioToPlay = sfxSedang;
      } else {
        audioToPlay = sfxBesar;
      }

      if (audioToPlay) {
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch((e) => console.log("Audio error:", e));
      }
    }
  } catch (err) {
    console.warn("Sound error:", err);
  }
};

// Trigger confetti animation
export const triggerConfetti = () => {
  if (typeof confetti !== "undefined") {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#2ecc71", "#f1c40f", "#ecf0f1"],
    });
  }
};

// Shake animation for expenses
export const triggerShakeAnimation = () => {
  document.body.classList.add("shake-animation");
  setTimeout(() => document.body.classList.remove("shake-animation"), 500);
};

// Heal animation for income
export const triggerHealAnimation = () => {
  const balanceEl = document.getElementById("balance");
  if (balanceEl) {
    balanceEl.classList.add("heal-animation");
    setTimeout(() => balanceEl.classList.remove("heal-animation"), 500);
  }
};
