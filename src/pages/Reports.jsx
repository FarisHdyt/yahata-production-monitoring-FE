import { useEffect, useMemo, useState } from "react";
import { MACHINES, DOWNTIME_CATEGORIES } from "../config";
import FormingAnalyticsDashboard from "../components/FormingAnalyticsDashboard";
import {
  fetchDowntimeEvents,
  fetchMasters,
  fetchProductionRecords,
  fetchShiftAssignments,
} from "../services/dataService";

const DOWNTIME_STORAGE_KEY = "yahataDowntimeEvents";
const PRODUCTION_STORAGE_KEY = "yahataProductionRecords";
const MASTER_STORAGE_KEY = "yahataMasterProduction";
const SHIFT_PIC_STORAGE_KEY = "yahataShiftPicRecords";

function safeReadArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadDowntime() {
  return safeReadArray(DOWNTIME_STORAGE_KEY);
}

function loadProduction() {
  return safeReadArray(PRODUCTION_STORAGE_KEY);
}

function loadMasters() {
  return safeReadArray(MASTER_STORAGE_KEY);
}

function loadShiftPic() {
  return safeReadArray(SHIFT_PIC_STORAGE_KEY);
}

// Handover Shift 1 ke Shift 2 (14:00 - 14:15) masuk ke Shift 1
function getShift(dateString) {
  if (!dateString) return "Di luar shift";
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "Di luar shift";
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 360 && minutes <= 855) return "Shift 1";
  if (minutes > 855 && minutes < 1380) return "Shift 2";
  return "Di luar shift";
}

function normalizeProductionShift(shiftVal) {
  if (String(shiftVal) === "1" || shiftVal === "Shift 1" || shiftVal === "shift1") {
    return "Shift 1";
  }
  if (String(shiftVal) === "2" || shiftVal === "Shift 2" || shiftVal === "shift2") {
    return "Shift 2";
  }
  return "Di luar shift";
}

function getDuration(start, end) {
  if (!start) return 0;

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  return Math.max(0, Math.floor((endTime - startTime) / 60000));
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining} menit`;
  if (remaining === 0) return `${hours} jam`;
  return `${hours} jam ${remaining} menit`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadCSV(filename, rows) {
  const csvBody = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "").replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const csvWithExcelSep = `sep=,\r\n${csvBody}`;

  const blob = new Blob(["\uFEFF" + csvWithExcelSep], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [downtimeRecords, setDowntimeRecords] = useState([]);
  const [productionRecords, setProductionRecords] = useState([]);
  const [masters, setMasters] = useState([]);
  const [shiftPicRecords, setShiftPicRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");

  const refreshAllData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [dt, prod, mst, pics] = await Promise.all([
        fetchDowntimeEvents(),
        fetchProductionRecords(),
        fetchMasters(),
        fetchShiftAssignments(),
      ]);
      setDowntimeRecords(Array.isArray(dt) ? dt : []);
      setProductionRecords(Array.isArray(prod) ? prod : []);
      setMasters(Array.isArray(mst) ? mst : []);
      setShiftPicRecords(Array.isArray(pics) ? pics : []);
      try {
        localStorage.setItem(DOWNTIME_STORAGE_KEY, JSON.stringify(Array.isArray(dt) ? dt : []));
        localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(Array.isArray(prod) ? prod : []));
        localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(Array.isArray(mst) ? mst : []));
        localStorage.setItem(SHIFT_PIC_STORAGE_KEY, JSON.stringify(Array.isArray(pics) ? pics : []));
      } catch {}
    } catch (err) {
      setLoadError(err?.message || "Gagal memuat data laporan dari backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    const handler = () => refreshAllData();
    window.addEventListener("storage", handler);
    window.addEventListener("yahata-storage-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("yahata-storage-updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecords = useMemo(() => {
    return downtimeRecords
      .filter((item) => {
        const eventDate = item.startAt?.slice(0, 10);
        const eventShift = getShift(item.startAt);

        return (
          (!startDate || eventDate >= startDate) &&
          (!endDate || eventDate <= endDate) &&
          (shiftFilter === "all" || eventShift === shiftFilter) &&
          (machineFilter === "all" || item.machine === machineFilter)
        );
      })
      .sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
  }, [downtimeRecords, startDate, endDate, shiftFilter, machineFilter]);

  const filteredProduction = useMemo(() => {
    return productionRecords
      .filter((item) => {
        const prodDate = item.date;
        const prodShift = normalizeProductionShift(item.shift);

        return (
          (!startDate || prodDate >= startDate) &&
          (!endDate || prodDate <= endDate) &&
          (shiftFilter === "all" || prodShift === shiftFilter) &&
          (machineFilter === "all" || item.machine === machineFilter)
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return String(b.startTime || "").localeCompare(String(a.startTime || ""));
      });
  }, [productionRecords, startDate, endDate, shiftFilter, machineFilter]);

  const totalMinutes = filteredRecords.reduce(
    (total, item) => total + getDuration(item.startAt, item.endAt),
    0
  );

  const activeEvents = filteredRecords.filter((item) => !item.endAt).length;

  const affectedMachines = new Set(
    filteredRecords.map((item) => item.machine)
  ).size;

  const totalProductionOutput = useMemo(
    () =>
      filteredProduction.reduce(
        (sum, item) => sum + Number(item.output || 0),
        0
      ),
    [filteredProduction]
  );

  const activeDatesCount = useMemo(() => {
    const dateSet = new Set([
      ...filteredProduction.map((p) => p.date).filter(Boolean),
      ...filteredRecords.map((d) => d.startAt?.slice(0, 10)).filter(Boolean),
    ]);
    return Math.max(1, dateSet.size);
  }, [filteredProduction, filteredRecords]);

  const machineSummary = useMemo(() => {
    const minutesPerDay =
      shiftFilter === "Shift 1" ? 480 : shiftFilter === "Shift 2" ? 420 : 480;
    const effectiveMinutes = minutesPerDay * activeDatesCount;

    const targetMachines =
      machineFilter === "all" ? MACHINES : [machineFilter];

    return targetMachines
      .map((machine) => {
        const master = masters.find((m) => m.machine === machine);
        const prodList = filteredProduction.filter((p) => p.machine === machine);
        const dtList = filteredRecords.filter((d) => d.machine === machine);

        const actualOutput = prodList.reduce(
          (sum, item) => sum + Number(item.output || 0),
          0
        );
        const dtMinutes = dtList.reduce(
          (sum, item) => sum + getDuration(item.startAt, item.endAt),
          0
        );

        const rpm = Number(master?.rpm || 0);
        const pcsPerRev = Number(master?.pcsPerRev || 1) || 1;
        const targetOutput = rpm > 0 ? Math.round(rpm * pcsPerRev * effectiveMinutes) : 0;

        const productivity =
          targetOutput > 0 ? (actualOutput / targetOutput) * 100 : null;
        const efficiency =
          effectiveMinutes > 0
            ? Math.max(0, ((effectiveMinutes - dtMinutes) / effectiveMinutes) * 100)
            : 100;

        const partNumbers = [
          ...new Set(
            [master?.partNumber, ...prodList.map((p) => p.partNumber)]
              .map((v) => String(v || "").trim())
              .filter(Boolean)
          ),
        ];

        const assignedPics = shiftPicRecords
          .filter(
            (sp) =>
              sp.machine === machine &&
              (!startDate || sp.date >= startDate) &&
              (!endDate || sp.date <= endDate) &&
              (shiftFilter === "all" || sp.shift === shiftFilter)
          )
          .map((sp) => sp.pic);

        const allPics = [
          ...new Set(
            [
              ...assignedPics,
              ...prodList.map((p) => p.pic),
              ...dtList.map((d) => d.pic),
            ]
              .map((v) => String(v || "").trim())
              .filter(Boolean)
          ),
        ];

        return {
          machine,
          partNumber: partNumbers.join(" / ") || "-",
          rpm,
          actualOutput,
          targetOutput,
          productivity,
          dtMinutes,
          dtCount: dtList.length,
          efficiency,
          pic: allPics.join(", ") || "-",
          hasActivity: prodList.length > 0 || dtList.length > 0 || Boolean(master?.partNumber),
        };
      })
      .filter((row) => machineFilter !== "all" || row.hasActivity);
  }, [
    masters,
    filteredProduction,
    filteredRecords,
    shiftPicRecords,
    machineFilter,
    shiftFilter,
    activeDatesCount,
    startDate,
    endDate,
  ]);

  const categorySummary = useMemo(() => {
    return DOWNTIME_CATEGORIES.filter(
      (category) => category !== "Running Production"
    )
      .map((category) => {
        const matching = filteredRecords.filter(
          (item) => item.category === category
        );

        const minutes = matching.reduce(
          (total, item) => total + getDuration(item.startAt, item.endAt),
          0
        );

        return {
          category,
          count: matching.length,
          minutes,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredRecords]);

  const shiftSummary = useMemo(() => {
    return ["Shift 1", "Shift 2"].map((shift) => {
      const matching = filteredRecords.filter(
        (item) => getShift(item.startAt) === shift
      );

      return {
        shift,
        count: matching.length,
        minutes: matching.reduce(
          (total, item) => total + getDuration(item.startAt, item.endAt),
          0
        ),
      };
    });
  }, [filteredRecords]);

  const resetFilters = () => {
    setStartDate(today);
    setEndDate(today);
    setShiftFilter("all");
    setMachineFilter("all");
    refreshAllData();
  };

  const exportDowntime = () => {
    const rows = [
      [
        "Tanggal",
        "Shift",
        "Mesin",
        "Kategori Downtime",
        "Mulai",
        "Selesai",
        "Durasi (Menit)",
        "PIC",
        "Catatan",
        "Status",
      ],
      ...filteredRecords.map((item) => [
        item.startAt ? new Date(item.startAt).toLocaleDateString("id-ID") : "-",
        getShift(item.startAt),
        item.machine,
        item.category,
        item.startAt ? new Date(item.startAt).toLocaleString("id-ID") : "-",
        item.endAt
          ? new Date(item.endAt).toLocaleString("id-ID")
          : "Masih berlangsung",
        getDuration(item.startAt, item.endAt),
        item.pic || "-",
        item.notes || "-",
        item.endAt ? "Selesai" : "Aktif",
      ]),
    ];

    downloadCSV("Yahata_Downtime_Report.csv", rows);
  };

  const exportProduction = () => {
    const rows = [
      [
        "Tanggal",
        "Shift",
        "Mesin",
        "Part Number",
        "Jam Mulai",
        "Jam Selesai",
        "Counter Awal",
        "Counter Akhir",
        "Output Aktual (pcs)",
        "PIC",
        "Catatan",
      ],
      ...filteredProduction.map((item) => [
        item.date || "-",
        normalizeProductionShift(item.shift),
        item.machine,
        item.partNumber || "-",
        item.startTime || "-",
        item.endTime || "-",
        item.counterStart ?? "-",
        item.counterEnd ?? "-",
        Number(item.output || 0),
        item.pic || "-",
        item.notes || "-",
      ]),
      [],
      ["Total Output (pcs)", "", "", "", "", "", "", "", totalProductionOutput, "", ""],
    ];

    downloadCSV("Yahata_Production_Report.csv", rows);
  };

  const exportCategorySummary = () => {
    const rows = [
      ["Kategori Downtime", "Jumlah Kejadian", "Total Durasi (Menit)"],
      ...categorySummary.map((item) => [
        item.category,
        item.count,
        item.minutes,
      ]),
      [],
      ["Total Downtime", filteredRecords.length, totalMinutes],
    ];

    downloadCSV("Yahata_Downtime_Summary.csv", rows);
  };

  const exportCompleteReport = () => {
    const periodLabel = `${startDate || "Awal"} s/d ${endDate || "Akhir"}`;
    const rows = [
      ["LAPORAN LENGKAP PRODUKSI & DOWNTIME - PT YAHATA FASTENER INDONESIA"],
      [
        "Periode",
        periodLabel,
        "Shift",
        shiftFilter === "all" ? "Semua Shift" : shiftFilter,
        "Mesin",
        machineFilter === "all" ? "Semua Mesin" : machineFilter,
      ],
      [],
      ["1. RINGKASAN PERFORMA PER MESIN"],
      [
        "Mesin",
        "Part Number",
        "RPM Standar",
        "Total Output (pcs)",
        "Target Estimasi (pcs)",
        "Productivity (%)",
        "Total Downtime (Menit)",
        "Kejadian Downtime",
        "Efficiency (%)",
        "PIC",
      ],
      ...machineSummary.map((row) => [
        row.machine,
        row.partNumber,
        row.rpm || "-",
        row.actualOutput,
        row.targetOutput || "-",
        row.productivity !== null ? `${row.productivity.toFixed(1)}%` : "-",
        row.dtMinutes,
        row.dtCount,
        `${row.efficiency.toFixed(1)}%`,
        row.pic,
      ]),
      [],
      ["2. DETAIL HASIL PRODUKSI"],
      [
        "Tanggal",
        "Shift",
        "Mesin",
        "Part Number",
        "Jam Mulai",
        "Jam Selesai",
        "Counter Awal",
        "Counter Akhir",
        "Output Aktual (pcs)",
        "PIC",
        "Catatan",
      ],
      ...(filteredProduction.length === 0
        ? [["Tidak ada catatan produksi pada periode ini"]]
        : filteredProduction.map((item) => [
            item.date || "-",
            normalizeProductionShift(item.shift),
            item.machine,
            item.partNumber || "-",
            item.startTime || "-",
            item.endTime || "-",
            item.counterStart ?? "-",
            item.counterEnd ?? "-",
            Number(item.output || 0),
            item.pic || "-",
            item.notes || "-",
          ])),
      [],
      ["3. DETAIL KEJADIAN DOWNTIME"],
      [
        "Tanggal",
        "Shift",
        "Mesin",
        "Kategori Downtime",
        "Mulai",
        "Selesai",
        "Durasi (Menit)",
        "PIC",
        "Catatan",
        "Status",
      ],
      ...(filteredRecords.length === 0
        ? [["Tidak ada catatan downtime pada periode ini"]]
        : filteredRecords.map((item) => [
            item.startAt ? new Date(item.startAt).toLocaleDateString("id-ID") : "-",
            getShift(item.startAt),
            item.machine,
            item.category,
            item.startAt ? new Date(item.startAt).toLocaleString("id-ID") : "-",
            item.endAt
              ? new Date(item.endAt).toLocaleString("id-ID")
              : "Masih berlangsung",
            getDuration(item.startAt, item.endAt),
            item.pic || "-",
            item.notes || "-",
            item.endAt ? "Selesai" : "Aktif",
          ])),
    ];

    const fileDate = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    downloadCSV(`Yahata_Full_Report_${fileDate || "All"}.csv`, rows);
  };

  return (
    <div className="rp-page">
      <div className="rp-heading">
        <div>
          <div className="rp-eyebrow">PRODUCTION MANAGEMENT / ANALYTICS</div>
          <h1>Production Reports</h1>
          <p>Rekap aktivitas produksi, PIC, dan downtime area Forming.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="rp-refresh-btn"
            onClick={refreshAllData}
          >
            ↻ Refresh Data
          </button>

          <button
            className="rp-refresh-btn"
            style={{ background: "#0f2c59", color: "#fff", borderColor: "#0f2c59" }}
            onClick={exportCompleteReport}
          >
            ↓ Export Full Report CSV
          </button>
        </div>
      </div>

      <section className="rp-filter-panel">
        <div className="rp-filter-title">
          <div>
            <h2>Filter Laporan</h2>
            <p>Tentukan periode dan mesin yang ingin dianalisis.</p>
          </div>
        </div>

        <div className="rp-filters">
          <label>
            Dari Tanggal
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            Sampai Tanggal
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <label>
            Shift
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="all">Semua Shift</option>
              <option value="Shift 1">Shift 1</option>
              <option value="Shift 2">Shift 2</option>
            </select>
          </label>

          <label>
            Mesin
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
            >
              <option value="all">Semua Mesin</option>
              {MACHINES.map((machine) => (
                <option key={machine} value={machine}>{machine}</option>
              ))}
            </select>
          </label>

          <button className="rp-reset-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </section>

      <div className="rp-report-caption">
        <span>PERIODE LAPORAN</span>
        <strong>
          {startDate ? formatDate(startDate) : "Awal periode"} —{" "}
          {endDate ? formatDate(endDate) : "Akhir periode"}
        </strong>
      </div>

      <section className="rp-stats">
        <div className="rp-stat-card">
          <div className="rp-stat-icon navy">▤</div>
          <div>
            <span>Total Produksi</span>
            <strong>{formatNumber(totalProductionOutput)} pcs</strong>
            <small>{filteredProduction.length} catatan produksi</small>
          </div>
        </div>

        <div className="rp-stat-card">
          <div className="rp-stat-icon blue">◷</div>
          <div>
            <span>Total Downtime</span>
            <strong>{formatDuration(totalMinutes)}</strong>
            <small>{filteredRecords.length} kejadian tercatat</small>
          </div>
        </div>

        <div className="rp-stat-card">
          <div className="rp-stat-icon orange">!</div>
          <div>
            <span>Downtime Aktif</span>
            <strong>{activeEvents}</strong>
            <small>Belum memiliki waktu selesai</small>
          </div>
        </div>

        <div className="rp-stat-card">
          <div className="rp-stat-icon red">▦</div>
          <div>
            <span>Mesin Terdampak DT</span>
            <strong>{affectedMachines}</strong>
            <small>Dari {MACHINES.length} mesin</small>
          </div>
        </div>
      </section>

      <FormingAnalyticsDashboard
        machineFilter={machineFilter}
        productionRecords={filteredProduction}
        downtimeRecords={filteredRecords}
        masters={masters}
      />

      <section className="rp-panel rp-production-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Machine Performance & Production Summary</h2>
            <p>Rekap gabungan output aktual, target, downtime, dan PIC per mesin.</p>
          </div>
          <button onClick={exportCompleteReport}>↓ Export Semua Data CSV</button>
        </div>

        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>PART NUMBER</th>
                <th>OUTPUT AKTUAL</th>
                <th>TARGET</th>
                <th>PRODUCTIVITY</th>
                <th>DOWNTIME</th>
                <th>EFFICIENCY</th>
                <th>PIC</th>
              </tr>
            </thead>
            <tbody>
              {machineSummary.length === 0 ? (
                <tr>
                  <td colSpan="8" className="rp-empty">
                    Belum ada data produksi maupun downtime pada periode ini.
                  </td>
                </tr>
              ) : (
                machineSummary.map((row) => (
                  <tr key={row.machine}>
                    <td><strong>{row.machine}</strong></td>
                    <td>{row.partNumber}</td>
                    <td><strong>{formatNumber(row.actualOutput)} pcs</strong></td>
                    <td>{row.targetOutput > 0 ? `${formatNumber(row.targetOutput)} pcs` : "—"}</td>
                    <td>{row.productivity !== null ? `${row.productivity.toFixed(1)}%` : "—"}</td>
                    <td>{row.dtMinutes > 0 ? formatDuration(row.dtMinutes) : "0 menit"}</td>
                    <td><strong>{row.efficiency.toFixed(1)}%</strong></td>
                    <td>{row.pic}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Production Record Details</h2>
            <p>Rincian pencatatan hasil produksi berdasarkan filter laporan.</p>
          </div>

          <button onClick={exportProduction}>↓ Export Production CSV</button>
        </div>

        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>TANGGAL</th>
                <th>SHIFT</th>
                <th>MESIN</th>
                <th>PART NUMBER</th>
                <th>PERIODE</th>
                <th>COUNTER</th>
                <th>OUTPUT</th>
                <th>PIC</th>
                <th>CATATAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredProduction.length === 0 ? (
                <tr>
                  <td colSpan="9" className="rp-empty">
                    Tidak ada data produksi untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredProduction.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{normalizeProductionShift(item.shift)}</td>
                    <td><strong>{item.machine}</strong></td>
                    <td>{item.partNumber || "-"}</td>
                    <td>{item.startTime} - {item.endTime}</td>
                    <td>
                      {item.counterEnd !== undefined && item.counterEnd !== null && item.counterEnd !== ""
                        ? `${formatNumber(item.counterStart)} → ${formatNumber(item.counterEnd)}`
                        : "Manual"}
                    </td>
                    <td><strong>{formatNumber(item.output)} pcs</strong></td>
                    <td>{item.pic || "—"}</td>
                    <td>{item.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rp-content-grid">
        <div className="rp-panel">
          <div className="rp-panel-heading">
            <div>
              <h2>Downtime by Category</h2>
              <p>Distribusi durasi berdasarkan kategori.</p>
            </div>
            <button onClick={exportCategorySummary}>Export CSV</button>
          </div>

          {categorySummary.length === 0 ? (
            <div className="rp-empty">
              Belum ada data downtime pada periode ini.
            </div>
          ) : (
            <div className="rp-category-list">
              {categorySummary.map((item) => {
                const percentage = totalMinutes > 0
                  ? (item.minutes / totalMinutes) * 100
                  : 0;

                return (
                  <div className="rp-category-item" key={item.category}>
                    <div className="rp-category-info">
                      <strong>{item.category}</strong>
                      <span>
                        {formatDuration(item.minutes)} · {item.count} kejadian
                      </span>
                    </div>
                    <div className="rp-progress">
                      <div style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rp-panel">
          <div className="rp-panel-heading">
            <div>
              <h2>Downtime by Shift</h2>
              <p>Perbandingan kejadian antarshift.</p>
            </div>
          </div>

          <div className="rp-shift-summary">
            {shiftSummary.map((item) => (
              <div className="rp-shift-item" key={item.shift}>
                <div className="rp-shift-number">
                  <span>{item.shift}</span>
                  <strong>{item.count} kejadian</strong>
                </div>
                <strong className="rp-shift-duration">
                  {formatDuration(item.minutes)}
                </strong>
              </div>
            ))}
          </div>

          <div className="rp-info-note">
            Downtime lintas shift dihitung seluruhnya pada shift ketika
            kejadian dimulai (handover 14:00–14:15 masuk Shift 1).
          </div>
        </div>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Downtime Event Details</h2>
            <p>Rincian kejadian downtime berdasarkan filter laporan.</p>
          </div>

          <button onClick={exportDowntime}>↓ Export Downtime CSV</button>
        </div>

        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>TANGGAL</th>
                <th>SHIFT</th>
                <th>MESIN</th>
                <th>KATEGORI</th>
                <th>MULAI</th>
                <th>SELESAI</th>
                <th>DURASI</th>
                <th>PIC</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="rp-empty">
                    Tidak ada data downtime untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id}>
                    <td>{item.startAt ? formatDate(item.startAt.slice(0, 10)) : "-"}</td>
                    <td>{getShift(item.startAt)}</td>
                    <td><strong>{item.machine}</strong></td>
                    <td>{item.category}</td>
                    <td>
                      {item.startAt
                        ? new Date(item.startAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>
                      {item.endAt
                        ? new Date(item.endAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>{formatDuration(getDuration(item.startAt, item.endAt))}</td>
                    <td>{item.pic || "—"}</td>
                    <td>
                      <span className={`rp-event-status ${item.endAt ? "completed" : "active"}`}>
                        {item.endAt ? "Selesai" : "Aktif"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rp-footer-note">
        <span>YAHATA PRODUCTION MONITORING</span>
        <span>Report generated from backend production, PIC, and downtime records.</span>
      </div>
    </div>
  );
}