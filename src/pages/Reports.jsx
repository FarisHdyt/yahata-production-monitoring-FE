
import { useMemo, useState } from "react";
import { MACHINES, DOWNTIME_CATEGORIES } from "../config";

const DOWNTIME_STORAGE_KEY = "yahataDowntimeEvents";

function loadDowntime() {
  try {
    const data = JSON.parse(localStorage.getItem(DOWNTIME_STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function getShift(dateString) {
  const date = new Date(dateString);
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 360 && minutes < 900) return "Shift 1";
  if (minutes >= 900 && minutes < 1380) return "Shift 2";
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
  return `${hours} jam ${remaining} menit`;
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
  const csv = rows
    .map((row) =>
      row.map((cell) => {
        const value = String(cell ?? "").replace(/"/g, '""');
        return `"${value}"`;
      }).join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
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
  const [downtimeRecords, setDowntimeRecords] = useState(loadDowntime);

  const today = new Date().toLocaleDateString("en-CA");

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");

  const filteredRecords = useMemo(() => {
    return downtimeRecords.filter((item) => {
      const eventDate = item.startAt?.slice(0, 10);
      const eventShift = getShift(item.startAt);

      return (
        (!startDate || eventDate >= startDate) &&
        (!endDate || eventDate <= endDate) &&
        (shiftFilter === "all" || eventShift === shiftFilter) &&
        (machineFilter === "all" || item.machine === machineFilter)
      );
    });
  }, [downtimeRecords, startDate, endDate, shiftFilter, machineFilter]);

  const totalMinutes = filteredRecords.reduce(
    (total, item) => total + getDuration(item.startAt, item.endAt),
    0
  );

  const activeEvents = filteredRecords.filter((item) => !item.endAt).length;

  const affectedMachines = new Set(
    filteredRecords.map((item) => item.machine)
  ).size;

  const categorySummary = useMemo(() => {
    return DOWNTIME_CATEGORIES
      .filter((category) => category !== "Running Production")
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
    setDowntimeRecords(loadDowntime());
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
        item.endAt ? new Date(item.endAt).toLocaleString("id-ID") : "Masih berlangsung",
        getDuration(item.startAt, item.endAt),
        item.pic || "-",
        item.notes || "-",
        item.endAt ? "Selesai" : "Aktif",
      ]),
    ];

    downloadCSV("Yahata_Downtime_Report.csv", rows);
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

  return (
    <div className="rp-page">
      <div className="rp-heading">
        <div>
          <div className="rp-eyebrow">PRODUCTION MANAGEMENT / ANALYTICS</div>
          <h1>Production Reports</h1>
          <p>Rekap aktivitas produksi dan downtime area Forming.</p>
        </div>

        <button
          className="rp-refresh-btn"
          onClick={() => setDowntimeRecords(loadDowntime())}
        >
          ↻ Refresh Data
        </button>
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
          <div className="rp-stat-icon blue">◷</div>
          <div>
            <span>Total Downtime</span>
            <strong>{formatDuration(totalMinutes)}</strong>
            <small>Durasi berdasarkan data terpilih</small>
          </div>
        </div>

        <div className="rp-stat-card">
          <div className="rp-stat-icon red">▣</div>
          <div>
            <span>Total Kejadian</span>
            <strong>{filteredRecords.length}</strong>
            <small>Catatan downtime</small>
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
          <div className="rp-stat-icon navy">▦</div>
          <div>
            <span>Mesin Terdampak</span>
            <strong>{affectedMachines}</strong>
            <small>Dari {MACHINES.length} mesin</small>
          </div>
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
            kejadian dimulai, sesuai aturan pencatatan proyek.
          </div>
        </div>
      </section>

      <section className="rp-panel rp-production-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Production Summary</h2>
            <p>Rekap output aktual seluruh mesin pada periode terpilih.</p>
          </div>
          <span className="rp-status-pending">Menunggu integrasi data</span>
        </div>

        <div className="rp-production-empty">
          <div className="rp-production-icon">▤</div>
          <strong>Data produksi belum tersedia untuk laporan</strong>
          <p>
            Halaman Production saat ini belum menyimpan riwayat input secara
            permanen. Setelah penyimpanan data dan integrasi selesai, bagian
            ini dapat menampilkan total output, output per mesin, Part Number,
            dan tren produksi.
          </p>
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
        <span>Report generated from locally stored downtime records.</span>
      </div>
    </div>
  );
}
