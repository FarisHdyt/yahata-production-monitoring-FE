
import { useMemo, useState } from "react";
import { MACHINES, SHIFTS } from "../config";

const STORAGE_KEY = "yahataShiftPicRecords";

const emptyForm = () => ({
  date: new Date().toLocaleDateString("en-CA"),
  shift: "Shift 1",
  machine: MACHINES[0] || "",
  pic: "",
  notes: "",
});

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ShiftPic() {
  const [records, setRecords] = useState(loadRecords);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [dateFilter, setDateFilter] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [shiftFilter, setShiftFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");

  const persist = (updated) => {
    setRecords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter((item) =>
        (!dateFilter || item.date === dateFilter) &&
        (shiftFilter === "all" || item.shift === shiftFilter) &&
        (machineFilter === "all" || item.machine === machineFilter)
      )
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.machine.localeCompare(b.machine);
      });
  }, [records, dateFilter, shiftFilter, machineFilter]);

  const todayRecords = records.filter(
    (item) => item.date === new Date().toLocaleDateString("en-CA")
  );

  const shift1Count = todayRecords.filter(
    (item) => item.shift === "Shift 1"
  ).length;

  const shift2Count = todayRecords.filter(
    (item) => item.shift === "Shift 2"
  ).length;

  const assignedMachines = new Set(
    todayRecords.map((item) => item.machine)
  ).size;

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setForm({
      date: item.date,
      shift: item.shift,
      machine: item.machine,
      pic: item.pic,
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (!form.pic.trim()) {
      alert("Nama PIC wajib diisi.");
      return;
    }

    const duplicate = records.some(
      (item) =>
        item.id !== editingId &&
        item.date === form.date &&
        item.shift === form.shift &&
        item.machine === form.machine
    );

    if (duplicate) {
      alert("Mesin ini sudah memiliki penugasan PIC pada tanggal dan shift tersebut.");
      return;
    }

    const record = {
      id: editingId || `PIC-${Date.now()}`,
      date: form.date,
      shift: form.shift,
      machine: form.machine,
      pic: form.pic.trim(),
      notes: form.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    const updated = editingId
      ? records.map((item) => item.id === editingId ? record : item)
      : [...records, record];

    persist(updated);
    closeForm();
  };

  const deleteRecord = (item) => {
    if (!window.confirm(`Hapus penugasan PIC mesin ${item.machine}?`)) return;

    persist(records.filter((record) => record.id !== item.id));
  };

  const resetFilters = () => {
    setDateFilter("");
    setShiftFilter("all");
    setMachineFilter("all");
  };

  const getShiftSchedule = (shiftName) => {
    const shift = SHIFTS.find((item) => item.name === shiftName);
    return shift?.schedule || "-";
  };

  return (
    <div className="sp-page">
      <div className="sp-heading">
        <div>
          <div className="sp-eyebrow">PRODUCTION MANAGEMENT / HUMAN RESOURCES</div>
          <h1>Shift & PIC Management</h1>
          <p>Pengelolaan jadwal kerja dan penugasan PIC mesin area Forming.</p>
        </div>

        <button className="sp-primary-btn" onClick={openNewForm}>
          + Tambah Penugasan
        </button>
      </div>

      <section className="sp-shift-grid">
        <div className="sp-shift-card">
          <div className="sp-shift-top">
            <div className="sp-shift-icon">01</div>
            <span className="sp-shift-label">SHIFT PAGI</span>
          </div>
          <h2>Shift 1</h2>
          <strong className="sp-shift-time">06:00 – 15:00</strong>
          <div className="sp-shift-footer">
            <span>Penugasan hari ini</span>
            <strong>{shift1Count} mesin</strong>
          </div>
        </div>

        <div className="sp-shift-card second">
          <div className="sp-shift-top">
            <div className="sp-shift-icon">02</div>
            <span className="sp-shift-label">SHIFT SORE</span>
          </div>
          <h2>Shift 2</h2>
          <strong className="sp-shift-time">15:00 – 23:00</strong>
          <div className="sp-shift-footer">
            <span>Penugasan hari ini</span>
            <strong>{shift2Count} mesin</strong>
          </div>
        </div>
      </section>

      <section className="sp-stats">
        <div className="sp-stat-card">
          <div className="sp-stat-icon blue">▦</div>
          <div>
            <span>Total Mesin</span>
            <strong>{MACHINES.length}</strong>
            <small>Area Forming</small>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-icon green">✓</div>
          <div>
            <span>Mesin Terjadwal</span>
            <strong>{assignedMachines}</strong>
            <small>Hari ini, lintas shift</small>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-icon orange">!</div>
          <div>
            <span>Belum Terjadwal</span>
            <strong>{MACHINES.length - assignedMachines}</strong>
            <small>Hari ini, lintas shift</small>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-icon navy">♙</div>
          <div>
            <span>Total Penugasan</span>
            <strong>{todayRecords.length}</strong>
            <small>Hari ini</small>
          </div>
        </div>
      </section>

      <section className="sp-schedule-section">
        <div className="sp-section-heading">
          <div>
            <h2>Jadwal Operasional</h2>
            <p>Jam kerja yang digunakan dalam sistem monitoring.</p>
          </div>
        </div>

        <div className="sp-schedule-table">
          <div className="sp-schedule-row header">
            <span>SHIFT</span>
            <span>JAM MULAI</span>
            <span>JAM SELESAI</span>
            <span>DURASI</span>
          </div>
          <div className="sp-schedule-row">
            <strong>Shift 1</strong>
            <span>06:00</span>
            <span>15:00</span>
            <span>9 jam</span>
          </div>
          <div className="sp-schedule-row">
            <strong>Shift 2</strong>
            <span>15:00</span>
            <span>23:00</span>
            <span>8 jam</span>
          </div>
        </div>
        <p className="sp-schedule-note">
          Catatan: jadwal istirahat tidak dimasukkan sebagai pengurangan jam shift.
          Jadwal istirahat Jumat 11:30–12:30 telah diketahui.
        </p>
      </section>

      <section className="sp-history-section">
        <div className="sp-section-heading">
          <div>
            <h2>Penugasan PIC</h2>
            <p>Daftar operator atau penanggung jawab setiap mesin.</p>
          </div>
          <span className="sp-record-count">{filteredRecords.length} RECORDS</span>
        </div>

        <div className="sp-filters">
          <label>
            Tanggal
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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

          <button className="sp-reset-btn" onClick={resetFilters}>
            Reset Filter
          </button>
        </div>

        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>TANGGAL</th>
                <th>SHIFT</th>
                <th>JADWAL</th>
                <th>MESIN</th>
                <th>NAMA PIC</th>
                <th>CATATAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sp-empty">
                    <strong>Belum ada penugasan PIC</strong>
                    <p>Tambahkan data penugasan untuk mulai mengelola PIC mesin.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>
                      <span className={`sp-shift-badge ${item.shift === "Shift 1" ? "morning" : "afternoon"}`}>
                        {item.shift}
                      </span>
                    </td>
                    <td>{getShiftSchedule(item.shift)}</td>
                    <td><strong className="sp-machine">{item.machine}</strong></td>
                    <td><strong>{item.pic}</strong></td>
                    <td>{item.notes || "—"}</td>
                    <td>
                      <div className="sp-actions">
                        <button onClick={() => openEditForm(item)}>Edit</button>
                        <button className="delete" onClick={() => deleteRecord(item)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="sp-modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeForm();
        }}>
          <form className="sp-modal" onSubmit={handleSave}>
            <div className="sp-modal-heading">
              <div>
                <span>PIC ASSIGNMENT</span>
                <h2>{editingId ? "Edit Penugasan" : "Tambah Penugasan PIC"}</h2>
                <p>Masukkan data penanggung jawab mesin.</p>
              </div>
              <button type="button" onClick={closeForm}>×</button>
            </div>

            <div className="sp-modal-body">
              <label>
                Tanggal Penugasan
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>

              <label>
                Shift
                <select
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                >
                  <option value="Shift 1">Shift 1 (06:00–15:00)</option>
                  <option value="Shift 2">Shift 2 (15:00–23:00)</option>
                </select>
              </label>

              <label>
                Mesin
                <select
                  value={form.machine}
                  onChange={(e) => setForm({ ...form, machine: e.target.value })}
                >
                  {MACHINES.map((machine) => (
                    <option key={machine} value={machine}>{machine}</option>
                  ))}
                </select>
              </label>

              <label>
                Nama PIC
                <input
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  placeholder="Masukkan nama operator / PIC"
                  required
                />
              </label>

              <label>
                Catatan
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
                />
              </label>
            </div>

            <div className="sp-modal-footer">
              <button type="button" className="sp-cancel-btn" onClick={closeForm}>
                Batal
              </button>
              <button type="submit" className="sp-primary-btn">
                Simpan Penugasan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
