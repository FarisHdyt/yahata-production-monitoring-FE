
import {
    SHIFTS,
    DOWNTIME_CATEGORIES
} from "./config.js";

// ==================================================
// FORMAT
// ==================================================

const pad = n => String(n).padStart(2, "0");

export const formatNumber = number =>
    Number(number || 0).toLocaleString("id-ID");

export function formatPercent(percent) {
    if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) {
        return "-";
    }

    return Number(percent).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + "%";
}

export const toDateKey = (date = new Date()) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatClock = date =>
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function formatDateID(dateText, options = {}) {
    if (!dateText) return "-";

    return new Date(dateText + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options
    });
}

export function formatDuration(totalMinutes) {
    const safe = Math.max(0, Number(totalMinutes) || 0);
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;

    if (hours === 0) return minutes + " menit";
    if (minutes === 0) return hours + " jam";

    return hours + " jam " + minutes + " menit";
}

export function getStatusClass(percent) {
    if (percent === null || percent === undefined) return "muted";
    if (percent >= 90) return "ok";
    if (percent >= 70) return "warn";
    return "low";
}

export const getCategoryName = code =>
    DOWNTIME_CATEGORIES.find(
        item => Number(item.code) === Number(code)
    )?.name ?? "-";

export const getShift = key =>
    SHIFTS.find(shift => shift.key === key) || null;


// ==================================================
// WAKTU DAN SHIFT
// ==================================================

export function toMinutes(timeText) {
    const [hours, minutes = 0] = String(timeText).split(":").map(Number);
    return hours * 60 + minutes;
}

export function getDurationMinutes(startText, endText, now = new Date()) {
    if (!startText) return 0;

    const start = new Date(startText);
    const end = endText ? new Date(endText) : now;

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return 0;
    }

    return Math.max(0, Math.round((end - start) / 60000));
}

export const eventDate = event =>
    String(event.start || "").slice(0, 10);

// Kategori 1 bukan downtime.
export const isCountedDowntime = event =>
    Number(event.category) !== 1 &&
    getDurationMinutes(event.start, event.end) > 0;

// Shift ditentukan berdasarkan waktu mulai downtime.
export function getDowntimeShiftKey(event) {
    if (!event?.start) return null;

    const date = new Date(event.start);

    if (Number.isNaN(date.getTime())) return null;

    const minute = date.getHours() * 60 + date.getMinutes();

    if (minute >= 6 * 60 && minute < 15 * 60) {
        return "shift1";
    }

    if (minute >= 15 * 60 && minute < 23 * 60) {
        return "shift2";
    }

    return null;
}

export function getCurrentShiftInfo(now = new Date()) {
    const minute = now.getHours() * 60 + now.getMinutes();

    if (minute >= 6 * 60 && minute < 15 * 60) {
        return {
            ...getShift("shift1"),
            label: "Shift 1",
            isHandover: false
        };
    }

    if (minute >= 15 * 60 && minute < 23 * 60) {
        return {
            ...getShift("shift2"),
            label: "Shift 2",
            isHandover: false
        };
    }

    return null;
}

// Status tidak boleh otomatis Running hanya karena tidak ada downtime.
export function getMachineStatus(events = [], now = new Date()) {
    if (!getCurrentShiftInfo(now)) {
        return {
            label: "DI LUAR JADWAL",
            className: "status-stop",
            key: "off_schedule"
        };
    }

    const activeDowntime = events.some(event => {
        if (!isCountedDowntime(event)) return false;

        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : null;

        return (
            start <= now &&
            (!end || now < end)
        );
    });

    if (activeDowntime) {
        return {
            label: "DOWNTIME",
            className: "status-down",
            key: "downtime"
        };
    }

    return {
        label: "BELUM DIKONFIRMASI",
        className: "status-unconfirmed",
        key: "unconfirmed"
    };
}

export function getLastSevenDates(now = new Date()) {
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - (6 - i)
        );

        return toDateKey(date);
    });
}


// ==================================================
// DATA SHIFT DAN PRODUKSI
// ==================================================

export const getShiftRecord = (records, date, shiftKey) =>
    records.find(
        record => record.date === date && record.shift === shiftKey
    ) || null;

export function getValidActual(record) {
    if (
        !record ||
        record.actual === null ||
        record.actual === undefined ||
        record.actual === ""
    ) {
        return null;
    }

    const number = Number(record.actual);

    return Number.isFinite(number) && number >= 0
        ? number
        : null;
}

export const getShiftDowntimeEvents = (events, date, shiftKey) =>
    events.filter(event =>
        eventDate(event) === date &&
        isCountedDowntime(event) &&
        getDowntimeShiftKey(event) === shiftKey
    );

const sumMinutes = events =>
    events.reduce(
        (sum, event) =>
            sum + getDurationMinutes(event.start, event.end),
        0
    );

// Perhitungan sementara tanpa target produksi tetap.
// Target akan ditentukan berdasarkan mesin dan Part Number.
export function calculateShiftMetrics(db, date, shiftKey) {
    const record = getShiftRecord(db.records, date, shiftKey);
    const actual = getValidActual(record);

    const downtimeEvents = getShiftDowntimeEvents(
        db.events,
        date,
        shiftKey
    );

    const downtimeMinutes = sumMinutes(downtimeEvents);

    return {
        record,
        actual,
        target: null,
        productivity: null,
        downtimeCount: downtimeEvents.length,
        downtimeMinutes,
        plannedMinutes: null,
        operatingMinutes: null,
        efficiency: null
    };
}

export function calculateDayMetrics(db, date) {
    const shiftMetrics = SHIFTS.map(shift => ({
        shift,
        ...calculateShiftMetrics(db, date, shift.key)
    }));

    const completed = shiftMetrics.filter(
        item => item.actual !== null
    );

    const totalActual = completed.reduce(
        (sum, item) => sum + item.actual,
        0
    );

    return {
        shiftMetrics,
        completedShiftCount: completed.length,
        plannedShiftCount: shiftMetrics.filter(
            item => item.record
        ).length,
        totalActual,
        totalTarget: null,
        productivity: null,
        downtimeMinutes: shiftMetrics.reduce(
            (sum, item) => sum + item.downtimeMinutes,
            0
        ),
        completedDowntimeMinutes: null,
        plannedMinutes: null,
        operatingMinutes: null,
        efficiency: null
    };
}


// ==================================================
// DOWNTIME SUMMARY
// ==================================================

export function calculateDowntimeSummary(events = [], now = new Date()) {
    const rows = DOWNTIME_CATEGORIES.map(category => ({
        code: category.code,
        name: category.name,
        count: 0,
        minutes: 0
    }));

    let totalCount = 0;
    let totalMinutes = 0;

    events.forEach(event => {
        if (!isCountedDowntime(event)) return;

        const row = rows.find(
            item => Number(item.code) === Number(event.category)
        );

        if (!row) return;

        const minutes = getDurationMinutes(
            event.start,
            event.end,
            now
        );

        row.count++;
        row.minutes += minutes;

        totalCount++;
        totalMinutes += minutes;
    });

    return {
        rows,
        totalCount,
        totalMinutes
    };
}


// ==================================================
// REPORTS
// ==================================================

export function getReportAvailableDates(db) {
    const dates = [
        ...db.records.map(record => record.date),
        ...db.events.map(eventDate)
    ].filter(Boolean);

    return [...new Set(dates)].sort();
}

export function calculateReportData(db, startDate, endDate) {
    const inRange = date =>
        (!startDate || date >= startDate) &&
        (!endDate || date <= endDate);

    const dates = new Set();

    db.records.forEach(record => {
        if (inRange(record.date)) dates.add(record.date);
    });

    db.events.forEach(event => {
        if (inRange(eventDate(event))) {
            dates.add(eventDate(event));
        }
    });

    const dailyRows = [...dates].sort().map(date => ({
        date,
        ...calculateDayMetrics(db, date),
        downtimeCount: db.events.filter(
            event =>
                eventDate(event) === date &&
                isCountedDowntime(event)
        ).length
    }));

    const sum = (list, pick) =>
        list.reduce((total, item) => total + pick(item), 0);

    const totalActual = sum(dailyRows, day => day.totalActual);

    const shiftSummary = SHIFTS.map(shift => {
        const rows = dailyRows.map(day =>
            day.shiftMetrics.find(
                item => item.shift.key === shift.key
            )
        );

        const completed = rows.filter(
            item => item.actual !== null
        );

        return {
            ...shift,
            actual: sum(completed, item => item.actual),
            target: null,
            productivity: null,
            efficiency: null
        };
    });

    const categorySummary = DOWNTIME_CATEGORIES
        .filter(category => category.code !== 1)
        .map(category => {
            const events = db.events.filter(event =>
                Number(event.category) === category.code &&
                inRange(eventDate(event)) &&
                isCountedDowntime(event)
            );

            return {
                ...category,
                count: events.length,
                minutes: sumMinutes(events)
            };
        });

    const totalDowntimeCount = sum(
        dailyRows,
        day => day.downtimeCount
    );

    const totalDowntimeMinutes = sum(
        dailyRows,
        day => day.downtimeMinutes
    );

    return {
        dailyRows,
        shiftSummary,
        categorySummary,
        totalActual,
        totalTarget: null,
        hasActual: dailyRows.some(
            day => day.completedShiftCount > 0
        ),
        productivity: null,
        efficiency: null,
        totalDowntimeCount,
        totalDowntimeMinutes
    };
}

export function buildReportCSV(report) {
    const headers = [
        "Tanggal",
        "Actual Shift 1",
        "Actual Shift 2",
        "Total Actual",
        "Jumlah Downtime",
        "Durasi Downtime (menit)"
    ];

    const rows = report.dailyRows.map(day => [
        day.date,
        day.shiftMetrics.find(
            item => item.shift.key === "shift1"
        )?.actual ?? "",
        day.shiftMetrics.find(
            item => item.shift.key === "shift2"
        )?.actual ?? "",
        day.totalActual,
        day.downtimeCount,
        day.downtimeMinutes
    ]);

    const escape = value =>
        '"' + String(value ?? "").replace(/"/g, '""') + '"';

    return [headers, ...rows]
        .map(row => row.map(escape).join(","))
        .join("\r\n");
}


// ==================================================
// LOCAL STORAGE
// ==================================================

export function loadList(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Gagal membaca " + key, error);
        return [];
    }
}

export function saveList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch (error) {
        console.error("Gagal menyimpan " + key, error);
        alert("Data gagal disimpan di browser.");
    }
}

// Rapikan catatan shift lama.
export function normalizeShiftRecords(source) {
    const byKey = new Map();

    source.forEach(item => {
        if (!item || !item.date || !getShift(item.shift)) {
            return;
        }

        const key = `${item.date}|${item.shift}`;

        const normalized = {
            id: item.id || Date.now() + Math.floor(Math.random() * 1000),
            date: item.date,
            shift: item.shift,
            picName: String(item.picName || "").trim(),
            actual:
                item.actual === "" ||
                item.actual === undefined ||
                item.actual === null
                    ? null
                    : Number(item.actual),
            notes: String(item.notes || "")
        };

        const existing = byKey.get(key);

        byKey.set(
            key,
            !existing
                ? normalized
                : {
                    ...existing,
                    ...normalized,
                    picName: normalized.picName || existing.picName,
                    actual:
                        normalized.actual === null
                            ? existing.actual
                            : normalized.actual,
                    notes: normalized.notes || existing.notes
                }
        );
    });

    return [...byKey.values()];
}

import {
    SHIFTS,
    DOWNTIME_CATEGORIES
} from "./config.js";

// ==================================================
// FORMAT
// ==================================================

const pad = n => String(n).padStart(2, "0");

export const formatNumber = number =>
    Number(number || 0).toLocaleString("id-ID");

export function formatPercent(percent) {
    if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) {
        return "-";
    }

    return Number(percent).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + "%";
}

export const toDateKey = (date = new Date()) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatClock = date =>
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function formatDateID(dateText, options = {}) {
    if (!dateText) return "-";

    return new Date(dateText + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options
    });
}

export function formatDuration(totalMinutes) {
    const safe = Math.max(0, Number(totalMinutes) || 0);
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;

    if (hours === 0) return minutes + " menit";
    if (minutes === 0) return hours + " jam";

    return hours + " jam " + minutes + " menit";
}

export function getStatusClass(percent) {
    if (percent === null || percent === undefined) return "muted";
    if (percent >= 90) return "ok";
    if (percent >= 70) return "warn";
    return "low";
}

export const getCategoryName = code =>
    DOWNTIME_CATEGORIES.find(
        item => Number(item.code) === Number(code)
    )?.name ?? "-";

export const getShift = key =>
    SHIFTS.find(shift => shift.key === key) || null;


// ==================================================
// WAKTU DAN SHIFT
// ==================================================

export function toMinutes(timeText) {
    const [hours, minutes = 0] = String(timeText).split(":").map(Number);
    return hours * 60 + minutes;
}

export function getDurationMinutes(startText, endText, now = new Date()) {
    if (!startText) return 0;

    const start = new Date(startText);
    const end = endText ? new Date(endText) : now;

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return 0;
    }

    return Math.max(0, Math.round((end - start) / 60000));
}

export const eventDate = event =>
    String(event.start || "").slice(0, 10);

// Kategori 1 bukan downtime.
export const isCountedDowntime = event =>
    Number(event.category) !== 1 &&
    getDurationMinutes(event.start, event.end) > 0;

// Shift ditentukan berdasarkan waktu mulai downtime.
export function getDowntimeShiftKey(event) {
    if (!event?.start) return null;

    const date = new Date(event.start);

    if (Number.isNaN(date.getTime())) return null;

    const minute = date.getHours() * 60 + date.getMinutes();

    if (minute >= 6 * 60 && minute < 15 * 60) {
        return "shift1";
    }

    if (minute >= 15 * 60 && minute < 23 * 60) {
        return "shift2";
    }

    return null;
}

export function getCurrentShiftInfo(now = new Date()) {
    const minute = now.getHours() * 60 + now.getMinutes();

    if (minute >= 6 * 60 && minute < 15 * 60) {
        return {
            ...getShift("shift1"),
            label: "Shift 1",
            isHandover: false
        };
    }

    if (minute >= 15 * 60 && minute < 23 * 60) {
        return {
            ...getShift("shift2"),
            label: "Shift 2",
            isHandover: false
        };
    }

    return null;
}

// Status tidak boleh otomatis Running hanya karena tidak ada downtime.
export function getMachineStatus(events = [], now = new Date()) {
    if (!getCurrentShiftInfo(now)) {
        return {
            label: "DI LUAR JADWAL",
            className: "status-stop",
            key: "off_schedule"
        };
    }

    const activeDowntime = events.some(event => {
        if (!isCountedDowntime(event)) return false;

        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : null;

        return (
            start <= now &&
            (!end || now < end)
        );
    });

    if (activeDowntime) {
        return {
            label: "DOWNTIME",
            className: "status-down",
            key: "downtime"
        };
    }

    return {
        label: "BELUM DIKONFIRMASI",
        className: "status-unconfirmed",
        key: "unconfirmed"
    };
}

export function getLastSevenDates(now = new Date()) {
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - (6 - i)
        );

        return toDateKey(date);
    });
}


// ==================================================
// DATA SHIFT DAN PRODUKSI
// ==================================================

export const getShiftRecord = (records, date, shiftKey) =>
    records.find(
        record => record.date === date && record.shift === shiftKey
    ) || null;

export function getValidActual(record) {
    if (
        !record ||
        record.actual === null ||
        record.actual === undefined ||
        record.actual === ""
    ) {
        return null;
    }

    const number = Number(record.actual);

    return Number.isFinite(number) && number >= 0
        ? number
        : null;
}

export const getShiftDowntimeEvents = (events, date, shiftKey) =>
    events.filter(event =>
        eventDate(event) === date &&
        isCountedDowntime(event) &&
        getDowntimeShiftKey(event) === shiftKey
    );

const sumMinutes = events =>
    events.reduce(
        (sum, event) =>
            sum + getDurationMinutes(event.start, event.end),
        0
    );

// Perhitungan sementara tanpa target produksi tetap.
// Target akan ditentukan berdasarkan mesin dan Part Number.
export function calculateShiftMetrics(db, date, shiftKey) {
    const record = getShiftRecord(db.records, date, shiftKey);
    const actual = getValidActual(record);

    const downtimeEvents = getShiftDowntimeEvents(
        db.events,
        date,
        shiftKey
    );

    const downtimeMinutes = sumMinutes(downtimeEvents);

    return {
        record,
        actual,
        target: null,
        productivity: null,
        downtimeCount: downtimeEvents.length,
        downtimeMinutes,
        plannedMinutes: null,
        operatingMinutes: null,
        efficiency: null
    };
}

export function calculateDayMetrics(db, date) {
    const shiftMetrics = SHIFTS.map(shift => ({
        shift,
        ...calculateShiftMetrics(db, date, shift.key)
    }));

    const completed = shiftMetrics.filter(
        item => item.actual !== null
    );

    const totalActual = completed.reduce(
        (sum, item) => sum + item.actual,
        0
    );

    return {
        shiftMetrics,
        completedShiftCount: completed.length,
        plannedShiftCount: shiftMetrics.filter(
            item => item.record
        ).length,
        totalActual,
        totalTarget: null,
        productivity: null,
        downtimeMinutes: shiftMetrics.reduce(
            (sum, item) => sum + item.downtimeMinutes,
            0
        ),
        completedDowntimeMinutes: null,
        plannedMinutes: null,
        operatingMinutes: null,
        efficiency: null
    };
}


// ==================================================
// DOWNTIME SUMMARY
// ==================================================

export function calculateDowntimeSummary(events = [], now = new Date()) {
    const rows = DOWNTIME_CATEGORIES.map(category => ({
        code: category.code,
        name: category.name,
        count: 0,
        minutes: 0
    }));

    let totalCount = 0;
    let totalMinutes = 0;

    events.forEach(event => {
        if (!isCountedDowntime(event)) return;

        const row = rows.find(
            item => Number(item.code) === Number(event.category)
        );

        if (!row) return;

        const minutes = getDurationMinutes(
            event.start,
            event.end,
            now
        );

        row.count++;
        row.minutes += minutes;

        totalCount++;
        totalMinutes += minutes;
    });

    return {
        rows,
        totalCount,
        totalMinutes
    };
}


// ==================================================
// REPORTS
// ==================================================

export function getReportAvailableDates(db) {
    const dates = [
        ...db.records.map(record => record.date),
        ...db.events.map(eventDate)
    ].filter(Boolean);

    return [...new Set(dates)].sort();
}

export function calculateReportData(db, startDate, endDate) {
    const inRange = date =>
        (!startDate || date >= startDate) &&
        (!endDate || date <= endDate);

    const dates = new Set();

    db.records.forEach(record => {
        if (inRange(record.date)) dates.add(record.date);
    });

    db.events.forEach(event => {
        if (inRange(eventDate(event))) {
            dates.add(eventDate(event));
        }
    });

    const dailyRows = [...dates].sort().map(date => ({
        date,
        ...calculateDayMetrics(db, date),
        downtimeCount: db.events.filter(
            event =>
                eventDate(event) === date &&
                isCountedDowntime(event)
        ).length
    }));

    const sum = (list, pick) =>
        list.reduce((total, item) => total + pick(item), 0);

    const totalActual = sum(dailyRows, day => day.totalActual);

    const shiftSummary = SHIFTS.map(shift => {
        const rows = dailyRows.map(day =>
            day.shiftMetrics.find(
                item => item.shift.key === shift.key
            )
        );

        const completed = rows.filter(
            item => item.actual !== null
        );

        return {
            ...shift,
            actual: sum(completed, item => item.actual),
            target: null,
            productivity: null,
            efficiency: null
        };
    });

    const categorySummary = DOWNTIME_CATEGORIES
        .filter(category => category.code !== 1)
        .map(category => {
            const events = db.events.filter(event =>
                Number(event.category) === category.code &&
                inRange(eventDate(event)) &&
                isCountedDowntime(event)
            );

            return {
                ...category,
                count: events.length,
                minutes: sumMinutes(events)
            };
        });

    const totalDowntimeCount = sum(
        dailyRows,
        day => day.downtimeCount
    );

    const totalDowntimeMinutes = sum(
        dailyRows,
        day => day.downtimeMinutes
    );

    return {
        dailyRows,
        shiftSummary,
        categorySummary,
        totalActual,
        totalTarget: null,
        hasActual: dailyRows.some(
            day => day.completedShiftCount > 0
        ),
        productivity: null,
        efficiency: null,
        totalDowntimeCount,
        totalDowntimeMinutes
    };
}

export function buildReportCSV(report) {
    const headers = [
        "Tanggal",
        "Actual Shift 1",
        "Actual Shift 2",
        "Total Actual",
        "Jumlah Downtime",
        "Durasi Downtime (menit)"
    ];

    const rows = report.dailyRows.map(day => [
        day.date,
        day.shiftMetrics.find(
            item => item.shift.key === "shift1"
        )?.actual ?? "",
        day.shiftMetrics.find(
            item => item.shift.key === "shift2"
        )?.actual ?? "",
        day.totalActual,
        day.downtimeCount,
        day.downtimeMinutes
    ]);

    const escape = value =>
        '"' + String(value ?? "").replace(/"/g, '""') + '"';

    return [headers, ...rows]
        .map(row => row.map(escape).join(","))
        .join("\r\n");
}


// ==================================================
// LOCAL STORAGE
// ==================================================

export function loadList(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Gagal membaca " + key, error);
        return [];
    }
}

export function saveList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch (error) {
        console.error("Gagal menyimpan " + key, error);
        alert("Data gagal disimpan di browser.");
    }
}

// Rapikan catatan shift lama.
export function normalizeShiftRecords(source) {
    const byKey = new Map();

    source.forEach(item => {
        if (!item || !item.date || !getShift(item.shift)) {
            return;
        }

        const key = `${item.date}|${item.shift}`;

        const normalized = {
            id: item.id || Date.now() + Math.floor(Math.random() * 1000),
            date: item.date,
            shift: item.shift,
            picName: String(item.picName || "").trim(),
            actual:
                item.actual === "" ||
                item.actual === undefined ||
                item.actual === null
                    ? null
                    : Number(item.actual),
            notes: String(item.notes || "")
        };

        const existing = byKey.get(key);

        byKey.set(
            key,
            !existing
                ? normalized
                : {
                    ...existing,
                    ...normalized,
                    picName: normalized.picName || existing.picName,
                    actual:
                        normalized.actual === null
                            ? existing.actual
                            : normalized.actual,
                    notes: normalized.notes || existing.notes
                }
        );
    });

    return [...byKey.values()];
}
