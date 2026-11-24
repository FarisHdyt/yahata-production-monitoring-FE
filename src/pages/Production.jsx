
import { useEffect, useMemo, useState } from "react";
import { MACHINES, SHIFTS } from "../config";

const PRODUCTION_STORAGE_KEY = "yahataProductionRecords";
const MASTER_STORAGE_KEY = "yahataMasterProduction";
const SHIFT_PIC_STORAGE_KEY = "yahataShiftPicRecords";

const DEFAULT_SHIFT1_PIC = {
  "NF-19B": "Iis Iskandar",
  "BP-450": "Iis Iskandar",
  "YDP-136": "Iis Iskandar",
  "PF-860": "Iis Iskandar",
  "CBP-105": "Achmad Syaiful",
  "CBP-136": "Achmad Syaiful",
  "HBF-823": "Achmad Syaiful",
  "YH-1552": "Achmad Syaiful",
  "CBP-106": "Nanda Ferry C",
  "NP-12": "Nanda Ferry C",
  "HBF-823 NEW": "Nanda Ferry C",
  "HM-676": "Nanda Ferry C",
  "ZH-30200": "Jason",
  "HM-552": "Jason",
};

const DEFAULT_SHIFT2_PIC = {
  "NF-19B": "Fiki Firmansyah",
  "BP-450": "Yossi Tera P",
  "YDP-136": "Fiki Firmansyah",
  "PF-860": "Fiki Firmansyah",
  "CBP-105": "Yossi Tera P",
  "CBP-136": "Yossi Tera P",
  "HBF-823": "Wakyudi",
  "YH-1552": "Jason",
  "CBP-106": "Fiki Firmansyah",
  "NP-12": "Wakyudi",
  "HBF-823 NEW": "Wakyudi",
  "HM-676": "Yossi Tera P",
  "ZH-30200": "Jason",
  "HM-552": "Jason",
};

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

function safeReadArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMinutes(hhmm) {
  if (!hhmm || !String(hhmm).includes(":")) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatNumber(val) {
  return Number(val || 0).toLocaleString("id-ID");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeShiftLabel(shiftVal) {
  if (
    String(shiftVal) === "1" ||
    shiftVal === "Shift 1" ||
    shiftVal === "shift1"
  ) {
    return "Shift 1";
  }

  if (
    String(shiftVal) === "2" ||
    shiftVal === "Shift 2" ||
    shiftVal === "shift2"
  ) {
    return "Shift 2";
  }

  return String(shiftVal || "-");
}

export default function Production() {
  const [records, setRecords] = useState(() =>
    safeReadArray(PRODUCTION_STORAGE_KEY)
  );

  const [masters, setMasters] = useState(() =>
    safeReadArray(MASTER_STORAGE_KEY)
  );

  const [shiftPicRecords, setShiftPicRecords] = useState(() =>
    safeReadArray(SHIFT_PIC_STORAGE_KEY)
  );

  const [date, setDate] = useState(getToday);
  const [shift, setShift] = useState("Shift 1");
  const [machine, setMachine] = useState(MACHINES[0] || "NF-19B");
  const [partNumber, setPartNumber] = useState("");
  const [rpm, setRpm] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");

  const [useCounterMode, setUseCounterMode] = useState(false);
  const [counterStart, setCounterStart] = useState("");
  const [counterEnd, setCounterEnd] = useState("");
  const [manualOutput, setManualOutput] = useState("");

  const [pic, setPic] = useState("");
  const [notes, setNotes] = useState("");
  const [filterMachine, setFilterMachine] = useState("all");

  const [feedback, setFeedback] = useState(null);

  // Toast otomatis hilang setelah 3,5 detik
  useEffect(() => {
    if (!feedback) return;

    const timer = setTimeout(() => {
      setFeedback(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [feedback]);

  const showNotification = (message, type = "success") => {
    setFeedback({
      type,
      message,
      id: Date.now(),
    });
  };

  const reloadAll = () => {
    setRecords(safeReadArray(PRODUCTION_STORAGE_KEY));
    setMasters(safeReadArray(MASTER_STORAGE_KEY));
    setShiftPicRecords(safeReadArray(SHIFT_PIC_STORAGE_KEY));
  };

  useEffect(() => {
    window.addEventListener("storage", reloadAll);
    window.addEventListener("yahata-storage-updated", reloadAll);

    return () => {
      window.removeEventListener("storage", reloadAll);
      window.removeEventListener("yahata-storage-updated", reloadAll);
    };
  }, []);

  const currentMaster = useMemo(
    () => masters.find((m) => m.machine === machine) || null,
    [masters, machine]
  );

  useEffect(() => {
    if (currentMaster) {
      setPartNumber(currentMaster.partNumber || "");
      setRpm(Number(currentMaster.rpm || 0));
    } else {
      setPartNumber("");
      setRpm(0);
    }
  }, [currentMaster]);

  useEffect(() => {
    const shiftMatch = shiftPicRecords.find(
      (sp) =>
        sp.date === date &&
        sp.shift === shift &&
        sp.machine === machine
    );

    if (shiftMatch?.pic) {
      setPic(shiftMatch.pic);
      return;
    }

    if (shift === "Shift 1") {
      setPic(currentMaster?.picShift1 || DEFAULT_SHIFT1_PIC[machine] || "");
    } else {
      setPic(currentMaster?.picShift2 || DEFAULT_SHIFT2_PIC[machine] || "");
    }
  }, [date, shift, machine, shiftPicRecords, currentMaster]);

  const computedOutput = useMemo(() => {
    if (useCounterMode) {
      const startVal = Number(counterStart);
      const endVal = Number(counterEnd);

      if (
        counterStart === "" ||
        counterEnd === "" ||
        !Number.isFinite(startVal) ||
        !Number.isFinite(endVal)
      ) {
        return 0;
      }

      return Math.max(0, endVal - startVal);
    }

    const num = Number(manualOutput);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [useCounterMode, counterStart, counterEnd, manualOutput]);

  const persistRecords = (nextList) => {
    try {
      localStorage.setItem(
        PRODUCTION_STORAGE_KEY,
        JSON.stringify(nextList)
      );

      setRecords(nextList);
      window.dispatchEvent(new Event("yahata-storage-updated"));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan data produksi:", error);
      showNotification("Data produksi gagal disimpan ke LocalStorage.", "error");
      return false;
    }
  };

  const handlePartDropdownChange = (selectedPartNo) => {
    setPartNumber(selectedPartNo);

    const matchedOption = currentMaster?.partOptions?.find(
      (opt) => opt.partNo === selectedPartNo
    );

    if (matchedOption && matchedOption.rpm !== undefined) {
      setRpm(Number(matchedOption.rpm || 0));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (!date || !machine || !partNumber.trim()) {
      showNotification(
        "Tanggal, Mesin, dan Part Number wajib diisi.",
        "error"
      );
      return;
    }

    if (
      startMin === null ||
      endMin === null ||
      endMin <= startMin
    ) {
      showNotification(
        "Jam selesai harus lebih besar dari jam mulai.",
        "error"
      );
      return;
    }

    if (
      shift === "Shift 1" &&
      (startMin < 360 || endMin > 900)
    ) {
      showNotification(
        "Untuk Shift 1, rentang waktu harus berada di antara 06:00 hingga 15:00.",
        "error"
      );
      return;
    }

    if (
      shift === "Shift 2" &&
      (startMin < 900 || endMin > 1380)
    ) {
      showNotification(
        "Untuk Shift 2, rentang waktu harus berada di antara 15:00 hingga 23:00.",
        "error"
      );
      return;
    }

    // Validasi bentrok jadwal pada mesin dan tanggal yang sama
    const hasOverlap = records.some((item) => {
      if (item.date !== date || item.machine !== machine) {
        return false;
      }

      const itemStart = toMinutes(item.startTime);
      const itemEnd = toMinutes(item.endTime);

      if (itemStart === null || itemEnd === null) {
        return false;
      }

      return startMin < itemEnd && endMin > itemStart;
    });

    if (hasOverlap) {
      showNotification(
        `Jadwal produksi ${machine} bertabrakan dengan catatan yang sudah ada pada ${date}. Periksa kembali jam mulai dan selesai.`,
        "error"
      );
      return;
    }

    if (useCounterMode) {
      if (counterStart === "" || counterEnd === "") {
        showNotification(
          "Counter Awal dan Counter Akhir wajib diisi pada mode counter.",
          "error"
        );
        return;
      }

      if (Number(counterEnd) < Number(counterStart)) {
        showNotification(
          "Counter Akhir tidak boleh lebih kecil dari Counter Awal.",
          "error"
        );
        return;
      }

      if (Number(counterEnd) === Number(counterStart)) {
        showNotification(
          "Counter Akhir sama dengan Counter Awal. Pastikan nilai counter sudah benar.",
          "warning"
        );
        return;
      }
    } else if (computedOutput <= 0) {
      showNotification(
        "Output produksi harus lebih besar dari 0 pcs.",
        "error"
      );
      return;
    }

    const newRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      shift,
      machine,
      partNumber: partNumber.trim(),
      rpm: Number(rpm) || 0,
      startTime,
      endTime,
      counterStart: useCounterMode ? Number(counterStart) : null,
      counterEnd: useCounterMode ? Number(counterEnd) : null,
      output: computedOutput,
      pic: pic.trim() || "-",
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextList = [newRecord, ...records];

    const saved = persistRecords(nextList);
    if (!saved) return;

    setManualOutput("");
    setCounterStart(
      useCounterMode && counterEnd !== "" ? String(counterEnd) : ""
    );
    setCounterEnd("");
    setNotes("");

    showNotification(
      `Catatan produksi ${machine} (${formatNumber(computedOutput)} pcs) berhasil disimpan.`,
      "success"
    );
  };

  const handleDelete = (id) => {
    const nextList = records.filter((item) => item.id !== id);

    const saved = persistRecords(nextList);
    if (!saved) return;

    showNotification("Catatan produksi berhasil dihapus.", "success");
  };

  const visibleRecords = useMemo(() => {
    return records
      .filter((item) => {
        const dateOk = !date || item.date === date;
        const machineOk =
          filterMachine === "all" || item.machine === filterMachine;

        return dateOk && machineOk;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return String(b.startTime || "").localeCompare(
          String(a.startTime || "")
        );
      });
  }, [records, date, filterMachine]);

  const totalDisplayedOutput = useMemo(
    () =>
      visibleRecords.reduce(
        (sum, item) => sum + Number(item.output || 0),
        0
      ),
    [visibleRecords]
  );

  return (
    <div className="rp-page">
      {/* Toast Notification */}
      {feedback && (
        <div
          key={feedback.id}
          className={`prod-toast ${feedback.type}`}
          role="alert"
        >
          <div className="prod-toast-icon">
            {feedback.type === "success"
              ? "✓"
              : feedback.type === "error"
              ? "!"
              : "⚠"}
          </div>

          <div className="prod-toast-content">
            <strong>
              {feedback.type === "success"
                ? "Berhasil"
                : feedback.type === "error"
                ? "Gagal"
                : "Peringatan"}
            </strong>

            <span>{feedback.message}</span>
          </div>

          <button
            type="button"
            className="prod-toast-close"
            onClick={() => setFeedback(null)}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}

      <div className="rp-heading">
        <div>
          <div className="rp-eyebrow">DAILY PRODUCTION ENTRY</div>
          <h1>Production Input</h1>
          <p>
            Pencatatan hasil produksi per mesin dengan auto-fill Part
            Number, RPM, dan PIC.
          </p>
        </div>
      </div>

      <section className="rp-filter-panel">
        <form onSubmit={handleSubmit} className="rp-filters">
          <label>
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            Shift
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              {SHIFTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.start}–{s.end})
                </option>
              ))}
            </select>
          </label>

          <label>
            Mesin
            <select
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
            >
              {MACHINES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          {currentMaster?.partOptions?.length > 0 && (
            <label>
              Preset Part ({machine})
              <select
                value={partNumber}
                onChange={(e) =>
                  handlePartDropdownChange(e.target.value)
                }
              >
                {currentMaster.partOptions.map((opt, idx) => (
                  <option
                    key={`${opt.partNo}-${idx}`}
                    value={opt.partNo}
                  >
                    {opt.partNo} ({opt.rpm} RPM)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Part Number
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Part Number"
            />
          </label>

          <label>
            RPM Standar
            <input
              type="number"
              min="0"
              value={rpm}
              onChange={(e) => setRpm(e.target.value)}
            />
          </label>

          <label>
            Jam Mulai
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>

          <label>
            Jam Selesai
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>

          <label>
            Mode Input
            <select
              value={useCounterMode ? "counter" : "manual"}
              onChange={(e) =>
                setUseCounterMode(e.target.value === "counter")
              }
            >
              <option value="manual">
                Input Output Langsung (pcs)
              </option>
              <option value="counter">Counter Kumulatif</option>
            </select>
          </label>

          {useCounterMode ? (
            <>
              <label>
                Counter Awal
                <input
                  type="number"
                  min="0"
                  value={counterStart}
                  onChange={(e) => setCounterStart(e.target.value)}
                  placeholder="0"
                />
              </label>

              <label>
                Counter Akhir
                <input
                  type="number"
                  min="0"
                  value={counterEnd}
                  onChange={(e) => setCounterEnd(e.target.value)}
                  placeholder="0"
                />
              </label>
            </>
          ) : (
            <label>
              Output Aktual (pcs)
              <input
                type="number"
                min="0"
                value={manualOutput}
                onChange={(e) => setManualOutput(e.target.value)}
                placeholder="Contoh: 120"
              />
            </label>
          )}

          <label>
            PIC / Operator
            <input
              type="text"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              placeholder="Nama PIC"
            />
          </label>

          <label>
            Catatan
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </label>

          <button type="submit" className="prod-submit-btn">
            Simpan ({formatNumber(computedOutput)} pcs)
          </button>
        </form>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Production History ({formatDate(date)})</h2>
            <p>
              Total tampil:{" "}
              <strong>
                {formatNumber(totalDisplayedOutput)} pcs
              </strong>{" "}
              ({visibleRecords.length} catatan)
            </p>
          </div>

          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
          >
            <option value="all">
              Semua Mesin ({MACHINES.length})
            </option>

            {MACHINES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>TANGGAL</th>
                <th>SHIFT</th>
                <th>MESIN</th>
                <th>PART NUMBER</th>
                <th>WAKTU</th>
                <th>OUTPUT</th>
                <th>PIC</th>
                <th>CATATAN</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="rp-empty">
                    Belum ada catatan produksi untuk filter ini.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{normalizeShiftLabel(item.shift)}</td>
                    <td>
                      <strong>{item.machine}</strong>
                    </td>
                    <td>{item.partNumber || "-"}</td>
                    <td>
                      {item.startTime} – {item.endTime}
                    </td>
                    <td>
                      <strong>
                        {formatNumber(item.output)} pcs
                      </strong>
                    </td>
                    <td>{item.pic || "-"}</td>
                    <td>{item.notes || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="prod-delete-btn"
                        onClick={() => handleDelete(item.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
