// Self-check logika KPI: `npm run check`
import assert from "node:assert/strict";
import {
    calculateShiftMetrics, calculateReportData, getDowntimeShiftKey, formatDuration, normalizeShiftRecords
} from "./lib.js";

const db = {
    records: [{ id: 1, date: "2026-01-05", shift: "shift1", picName: "Budi", actual: 9000, notes: "" }],
    events: [
        { id: 10, category: 5, start: "2026-01-05T14:05", end: "2026-01-05T14:53" }, // briefing → Shift 1
        { id: 11, category: 1, start: "2026-01-05T08:00", end: "2026-01-05T09:00" }  // Running Production, bukan downtime
    ]
};

assert.equal(getDowntimeShiftKey(db.events[0]), "shift1");
assert.equal(formatDuration(48), "48 menit");
assert.equal(formatDuration(125), "2 jam 5 menit");

const s1 = calculateShiftMetrics(db, "2026-01-05", "shift1");
assert.equal(s1.productivity, 90);          // 9000 / 10000
assert.equal(s1.downtimeMinutes, 48);
assert.equal(s1.efficiency, 90);            // (480 - 48) / 480

const s2 = calculateShiftMetrics(db, "2026-01-05", "shift2");
assert.equal(s2.efficiency, null);          // belum ada Actual → belum dihitung

const report = calculateReportData(db, "2026-01-01", "2026-01-31");
assert.equal(report.totalActual, 9000);
assert.equal(report.totalDowntimeCount, 1);
assert.equal(report.categorySummary.find(c => c.code === 5).minutes, 48);

const merged = normalizeShiftRecords([
    { id: 1, date: "2026-01-05", shift: "shift1", picName: "Budi", actual: 500 },
    { id: 2, date: "2026-01-05", shift: "shift1", picName: "", actual: null }
]);
assert.equal(merged.length, 1);
assert.equal(merged[0].picName, "Budi");
assert.equal(merged[0].actual, 500);

console.log("lib.check OK");
