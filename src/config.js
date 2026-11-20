
// ==================================================
// YAHATA PRODUCTION MONITORING
// CONFIGURATION - FORMING AREA
// ==================================================

// Daftar 14 mesin di area Forming
export const MACHINES = [
    "BP-450",
    "CBP-105",
    "CBP-106",
    "CBP-136",
    "HBF-823",
    "HBF-823 NEW",
    "HM-552",
    "HM-676",
    "NF-19B",
    "NP-12",
    "PF-860",
    "YDP-136",
    "YH-1552",
    "ZH-30200"
];

// Jadwal shift
export const SHIFTS = [
    {
        id: 1,
        key: "shift1",
        name: "Shift 1",
        start: "06:00",
        end: "15:00",
        schedule: "06:00 - 15:00"
    },
    {
        id: 2,
        key: "shift2",
        name: "Shift 2",
        start: "15:00",
        end: "23:00",
        schedule: "15:00 - 23:00"
    }
];

// Istirahat Jumat
export const FRIDAY_BREAK = {
    start: "11:30",
    end: "12:30"
};

// Kategori downtime
export const DOWNTIME_CATEGORIES = [
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

// LocalStorage keys
export const DOWNTIME_STORAGE_KEY = "yahataDowntimeEvents";
export const SHIFT_PIC_STORAGE_KEY = "yahataShiftPicRecords";
