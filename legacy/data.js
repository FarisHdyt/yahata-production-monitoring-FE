// ==================================================
// KONFIGURASI YAHATA PRODUCTION MONITORING
// ==================================================
// Data awal produksi dan downtime sengaja kosong.
// Semua catatan operasional dimasukkan melalui dashboard dan disimpan di LocalStorage.

const MACHINE_NAME = "Header 01";

const SHIFTS = [
    {
        id: 1,
        key: "shift1",
        name: "Shift 1",
        start: 6,
        end: 15,
        schedule: "06:00 - 15:00"
    },
    {
        id: 2,
        key: "shift2",
        name: "Shift 2",
        start: 14,
        end: 23,
        schedule: "14:00 - 23:00"
    }
];

// Ketentuan dari PIC/area produksi: 60 menit break, 480 menit efektif.
const BREAK_MINUTES_PER_SHIFT = 60;
const EFFECTIVE_MINUTES_PER_SHIFT = 480;

// Jadwal shift overlap 14:00–15:00. Downtime yang mulai di interval ini
// dimasukkan ke Shift 1 sesuai arahan PIC produksi.
const HANDOVER = {
    start: "14:00",
    end: "15:00",
    briefingStart: "14:00",
    briefingEnd: "14:15",
    downtimeAssignedTo: "shift1"
};

// Target 1.250 pcs/jam masih target sementara dari prototype sebelumnya.
// Target per shift = 1.250 × (480/60) = 10.000 pcs.
// Konfirmasi angka target ini ke PIC sebelum dipakai sebagai KPI aktual.
const HOURLY_TARGET = 1250;
const SHIFT_TARGET = HOURLY_TARGET * (EFFECTIVE_MINUTES_PER_SHIFT / 60);

const DOWNTIME_CATEGORIES = [
    { code: 1, name: "Running Production" },
    { code: 2, name: "Dandori (lepas dan pasang tools)" },
    { code: 3, name: "Dandori (setting dan adjustment)" },
    { code: 4, name: "QC Check (inspection part)" },
    { code: 5, name: "Trouble Machine" },
    { code: 6, name: "Trouble Tooling" },
    { code: 7, name: "Ganti Tooling" },
    { code: 8, name: "Ganti Material" },
    { code: 9, name: "Mesin Stop" },
    { code: 10, name: "Delay Material" },
    { code: 11, name: "Delay Tooling" },
    { code: 12, name: "Delay Job Order" },
    { code: 13, name: "No Plan" }
];

// Tidak ada downtime contoh agar dashboard tidak menampilkan kejadian fiktif.
const downtimeEvents = [];
