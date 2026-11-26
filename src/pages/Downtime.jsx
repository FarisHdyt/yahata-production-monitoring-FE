import { useEffect, useMemo, useState } from "react";
import { MACHINES, SHIFTS } from "../config";
import {
  createDowntimeEvent,
  deleteDowntimeEvent,
  fetchDowntimeEvents,
  fetchProductionRecords,
  fetchShiftAssignments,
  finishDowntimeEvent,
  updateDowntimeEvent,
} from "../services/dataService";

const CATEGORIES = [
  "Dandori (lepas dan pasang tools)",
  "Dandori (setting dan adjustment)",
  "QC Check (inspection part)",
  "Trouble Machine",
  "Trouble Tooling",
  "Ganti Tooling",
  "Ganti Material",
  "Mesin Stop",
  "Delay Material",
  "Delay Tooling",
  "Delay Job Order",
  "No Plan",
];

const emptyForm = () => ({
  machine: MACHINES[0] || "",
  category: CATEGORIES[0],
  startAt: "",
  endAt: "",
  pic: "",
  notes: "",
});

function getMinutes(start, end) {
  if (!start) return 0;
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || endTime <= startTime) return 0;
  return Math.floor((endTime - startTime) / 60000);
}

function formatDuration(minutes) {
  if (!minutes) return "0 menit";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} menit`;
  if (!remaining) return `${hours} jam`;
  return `${hours} jam ${remaining} menit`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Handover Shift 1 ke Shift 2 (14:00 - 14:15) masuk ke Shift 1
function getShift(dateValue) {
  if (!dateValue) return "Di luar shift";
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return "Di luar shift";
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 360 && minutes <= 855) return "Shift 1";
  if (minutes > 855 && minutes < 1380) return "Shift 2";

  return "Di luar shift";
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toLocalDateString(dateValue) {
  const d = new Date(dateValue);
  if (!Number.isFinite(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function findAssignedPicForDowntime(shiftPicList, startAtText, machine) {
  if (!startAtText || !machine) return "";
  const d = new Date(startAtText);
  if (!Number.isFinite(d.getTime())) return "";
  const localDate = toLocalDateString(d);
  const shiftName = getShift(startAtText);
  if (shiftName !== "Shift 1" && shiftName !== "Shift 2") return "";

  const found = shiftPicList.find(
    (item) => item.date === localDate && item.machine === machine && item.shift === shiftName
  );
  return found?.pic || "";
}

export default function Downtime() {
  const [events, setEvents] = useState([]);
  const [shiftPicList, setShiftPicList] = useState([]);
  const [productionList, setProductionList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [picTouched, setPicTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [dateFilter, setDateFilter] = useState(() => toLocalDateString(new Date()));
  const [shiftFilter, setShiftFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");

  // Hanya muat data 31 hari sampai tanggal filter (bukan seluruh riwayat) agar tetap cepat saat data menumpuk.
  const buildRange = () => {
    if (!dateFilter) return {};
    const from = new Date(`${dateFilter}T00:00:00`);
    from.setDate(from.getDate() - 31);
    return { startDate: toLocalDateString(from), endDate: dateFilter };
  };

  const syncExternal = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const range = buildRange();
      const [ev, pics, prods] = await Promise.all([
        fetchDowntimeEvents(range),
        fetchShiftAssignments(range),
        fetchProductionRecords(range),
      ]);
      setEvents(ev || []);
      setShiftPicList(pics || []);
      setProductionList(prods || []);
      try {
        localStorage.setItem("yahataDowntimeEvents", JSON.stringify(ev || []));
        localStorage.setItem("yahataShiftPicRecords", JSON.stringify(pics || []));
        localStorage.setItem("yahataProductionRecords", JSON.stringify(prods || []));
      } catch {}
    } catch (err) {
      setNotice(`Gagal memuat data downtime: ${err?.message || "unknown error"}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    syncExternal(true);
    const handler = () => syncExternal(false);
    window.addEventListener("storage", handler);
    window.addEventListener("yahata-storage-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("yahata-storage-updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const knownPics = useMemo(() => {
    const list = [
      ...shiftPicList.map((r) => r.pic),
      ...events.map((r) => r.pic),
      ...productionList.map((r) => r.pic),
    ]
      .map((p) => String(p || "").trim())
      .filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, "id"));
  }, [shiftPicList, events, productionList]);

  useEffect(() => {
    if (!showForm || picTouched || editingId) return;
    const autoPic = findAssignedPicForDowntime(shiftPicList, form.startAt, form.machine);
    if (autoPic) {
      setForm((prev) => (prev.pic === autoPic ? prev : { ...prev, pic: autoPic }));
    }
  }, [showForm, shiftPicList, form.startAt, form.machine, picTouched, editingId]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = event.startAt ? toLocalDateString(event.startAt) : "";
        const shift = getShift(event.startAt);
        return (
          (!dateFilter || eventDate === dateFilter) &&
          (shiftFilter === "all" || shift === shiftFilter) &&
          (machineFilter === "all" || event.machine === machineFilter)
        );
      })
      .sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
  }, [events, dateFilter, shiftFilter, machineFilter]);

  const downtimeEvents = filteredEvents.filter((event) => CATEGORIES.includes(event.category));
  const totalMinutes = downtimeEvents.reduce((total, event) => total + getMinutes(event.startAt, event.endAt), 0);
  const activeEvents = downtimeEvents.filter((event) => !event.endAt);
  const affectedMachines = new Set(downtimeEvents.map((event) => event.machine)).size;

  const categorySummary = CATEGORIES.map((category) => {
    const matching = downtimeEvents.filter((event) => event.category === category);
    return {
      category,
      count: matching.length,
      minutes: matching.reduce((sum, event) => sum + getMinutes(event.startAt, event.endAt), 0),
    };
  })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const openNewForm = () => {
    const nowText = toLocalInputValue(new Date());
    const defaultMachine = MACHINES[0] || "";
    const autoPic = findAssignedPicForDowntime(shiftPicList, nowText, defaultMachine);
    setEditingId(null);
    setPicTouched(false);
    setForm({ ...emptyForm(), machine: defaultMachine, startAt: nowText, pic: autoPic });
    setShowForm(true);
  };

  const openEditForm = (event) => {
    setEditingId(event.id);
    setPicTouched(true);
    setForm({
      machine: event.machine,
      category: event.category,
      startAt: toLocalInputValue(new Date(event.startAt)),
      endAt: event.endAt ? toLocalInputValue(new Date(event.endAt)) : "",
      pic: event.pic || "",
      notes: event.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPicTouched(false);
    setForm(emptyForm());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setNotice("");

    const start = new Date(form.startAt);
    const end = form.endAt ? new Date(form.endAt) : null;

    if (!form.startAt || !Number.isFinite(start.getTime())) {
      alert("Waktu mulai wajib diisi.");
      return;
    }
    if (end && end <= start) {
      alert("Waktu selesai harus setelah waktu mulai.");
      return;
    }
    if (
      events.some((event) => event.id !== editingId && event.machine === form.machine && !event.endAt) &&
      !end
    ) {
      alert("Mesin ini masih memiliki downtime aktif.");
      return;
    }

    const hasOverlap = events.some((event) => {
      if (event.id === editingId || event.machine !== form.machine) return false;
      const existingStart = new Date(event.startAt).getTime();
      const existingEnd = event.endAt ? new Date(event.endAt).getTime() : Date.now();
      const newStart = start.getTime();
      const newEnd = end ? end.getTime() : Date.now();
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      alert("Waktu downtime bertabrakan dengan catatan mesin yang sudah ada.");
      return;
    }

    const payload = {
      machine: form.machine,
      category: form.category,
      startAt: start.toISOString(),
      endAt: end ? end.toISOString() : null,
      pic: form.pic.trim(),
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDowntimeEvent(editingId, payload);
      } else {
        await createDowntimeEvent(payload);
      }
      await syncExternal(false);
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
      closeForm();
    } catch (err) {
      alert(err?.message || "Gagal menyimpan downtime.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinishDowntime = async (event) => {
    if (!window.confirm(`Selesaikan downtime mesin ${event.machine}?`)) return;
    setSaving(true);
    try {
      await finishDowntimeEvent(event.id);
      await syncExternal(false);
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
    } catch (err) {
      alert(err?.message || "Gagal menyelesaikan downtime.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Hapus catatan downtime ${event.machine}?`)) return;
    setSaving(true);
    try {
      await deleteDowntimeEvent(event.id);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
    } catch (err) {
      alert(err?.message || "Gagal menghapus downtime.");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setDateFilter("");
    setShiftFilter("all");
    setMachineFilter("all");
  };

  return (
    <div className="dt-page">
      <div className="dt-heading">
        <div>
          <div className="dt-eyebrow">PRODUCTION MANAGEMENT / MONITORING</div>
          <h1>Downtime Monitoring</h1>
          <p>Pemantauan waktu berhenti dan gangguan produksi area Forming.</p>
        </div>

        <button className="dt-primary-btn" onClick={openNewForm} disabled={loading || saving}>
          + Tambah Downtime
        </button>
      </div>

      {(loading || notice) && (
        <div className="rp-info-note" style={{ marginBottom: 12 }}>
          {loading ? "Memuat data downtime dari backend..." : notice}
        </div>
      )}

      <section className="dt-filter">
        <div className="dt-filter-title">Filter Data</div>
        <div className="dt-filter-controls">
          <label>
            Tanggal
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </label>

          <label>
            Shift
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
              <option value="all">Semua Shift</option>
              {SHIFTS.map((shift) => (
                <option key={shift.id} value={shift.name}>{shift.name}</option>
              ))}
            </select>
          </label>

          <label>
            Mesin
            <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}>
              <option value="all">Semua Mesin</option>
              {MACHINES.map((machine) => (
                <option key={machine} value={machine}>{machine}</option>
              ))}
            </select>
          </label>

          <button className="dt-reset-btn" onClick={resetFilters}>Reset Filter</button>
        </div>
      </section>

      <section className="dt-stats">
        <div className="dt-stat-card">
          <div className="dt-stat-icon blue">◷</div>
          <div>
            <span>Total Downtime</span>
            <strong>{formatDuration(totalMinutes)}</strong>
            <small>Durasi berdasarkan filter</small>
          </div>
        </div>
        <div className="dt-stat-card">
          <div className="dt-stat-icon red">!</div>
          <div>
            <span>Downtime Aktif</span>
            <strong>{activeEvents.length}</strong>
            <small>Belum memiliki waktu selesai</small>
          </div>
        </div>
        <div className="dt-stat-card">
          <div className="dt-stat-icon orange">▦</div>
          <div>
            <span>Mesin Terdampak</span>
            <strong>{affectedMachines}</strong>
            <small>Dari mesin yang terdaftar</small>
          </div>
        </div>
        <div className="dt-stat-card">
          <div className="dt-stat-icon navy">≡</div>
          <div>
            <span>Total Kejadian</span>
            <strong>{downtimeEvents.length}</strong>
            <small>Catatan downtime</small>
          </div>
        </div>
      </section>

      <section className="dt-content-grid">
        <div className="dt-panel dt-category-panel">
          <div className="dt-panel-heading">
            <div>
              <h2>Downtime by Category</h2>
              <p>Distribusi durasi berdasarkan kategori.</p>
            </div>
          </div>

          {categorySummary.length === 0 ? (
            <div className="dt-empty">
              <span>◷</span>
              <strong>Belum ada data downtime</strong>
              <p>Data kategori akan muncul setelah pencatatan dilakukan.</p>
            </div>
          ) : (
            <div className="dt-category-list">
              {categorySummary.map((item) => {
                const percentage = totalMinutes ? (item.minutes / totalMinutes) * 100 : 0;
                return (
                  <div className="dt-category-item" key={item.category}>
                    <div className="dt-category-top">
                      <strong>{item.category}</strong>
                      <span>{formatDuration(item.minutes)}</span>
                    </div>
                    <div className="dt-progress-track">
                      <div className="dt-progress-fill" style={{ width: `${percentage}%` }} />
                    </div>
                    <small>{item.count} kejadian</small>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dt-panel dt-active-panel">
          <div className="dt-panel-heading">
            <div>
              <h2>Active Downtime</h2>
              <p>Mesin yang sedang mengalami downtime.</p>
            </div>
            <span className="dt-active-count">{activeEvents.length} Aktif</span>
          </div>

          {activeEvents.length === 0 ? (
            <div className="dt-empty">
              <span>✓</span>
              <strong>Tidak ada downtime aktif</strong>
              <p>Belum ada catatan downtime yang masih berlangsung pada filter ini.</p>
            </div>
          ) : (
            <div className="dt-active-list">
              {activeEvents.map((event) => (
                <div className="dt-active-item" key={event.id}>
                  <div className="dt-active-machine">
                    <strong>{event.machine}</strong>
                    <span>{event.category}</span>
                  </div>
                  <div className="dt-active-duration">
                    <strong>{formatDuration(getMinutes(event.startAt, null))}</strong>
                    <small>Mulai {formatDate(event.startAt)}</small>
                  </div>
                  <button onClick={() => handleFinishDowntime(event)} disabled={saving}>Selesaikan</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dt-panel dt-history-panel">
        <div className="dt-panel-heading">
          <div>
            <h2>Downtime History</h2>
            <p>Riwayat kejadian downtime berdasarkan filter yang dipilih.</p>
          </div>
          <span className="dt-record-count">{downtimeEvents.length} RECORDS</span>
        </div>

        <div className="dt-table-wrap">
          <table className="dt-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>KATEGORI</th>
                <th>SHIFT</th>
                <th>MULAI</th>
                <th>SELESAI</th>
                <th>DURASI</th>
                <th>PIC</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {downtimeEvents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="dt-table-empty">Belum ada data downtime untuk filter ini.</td>
                </tr>
              ) : (
                downtimeEvents.map((event) => (
                  <tr key={event.id}>
                    <td><strong className="dt-machine">{event.machine}</strong></td>
                    <td>{event.category}</td>
                    <td>{getShift(event.startAt)}</td>
                    <td>{formatDate(event.startAt)}</td>
                    <td>{event.endAt ? formatDate(event.endAt) : "—"}</td>
                    <td><strong>{formatDuration(getMinutes(event.startAt, event.endAt))}</strong></td>
                    <td>{event.pic || "—"}</td>
                    <td>
                      <span className={`dt-status ${event.endAt ? "finished" : "active"}`}>
                        <i />
                        {event.endAt ? "Selesai" : "Aktif"}
                      </span>
                    </td>
                    <td>
                      <div className="dt-actions">
                        <button onClick={() => openEditForm(event)} disabled={saving}>Edit</button>
                        <button className="delete" onClick={() => deleteEvent(event)} disabled={saving}>Hapus</button>
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
        <div
          className="dt-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <form className="dt-modal" onSubmit={handleSave}>
            <div className="dt-modal-heading">
              <div>
                <span>DOWNTIME RECORD</span>
                <h2>{editingId ? "Edit Downtime" : "Tambah Downtime"}</h2>
                <p>Catat kejadian downtime mesin secara aktual.</p>
              </div>
              <button type="button" onClick={closeForm}>×</button>
            </div>

            <div className="dt-modal-body">
              <label>
                Mesin
                <select value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })}>
                  {MACHINES.map((machine) => (<option key={machine} value={machine}>{machine}</option>))}
                </select>
              </label>

              <label>
                Kategori Downtime
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((category) => (<option key={category} value={category}>{category}</option>))}
                </select>
              </label>

              <label>
                Waktu Mulai
                <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
              </label>

              <label>
                Waktu Selesai
                <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                <small>Kosongkan jika downtime masih berlangsung.</small>
              </label>

              <label>
                PIC
                <input
                  list="dt-known-pics"
                  value={form.pic}
                  onChange={(e) => {
                    setPicTouched(true);
                    setForm({ ...form, pic: e.target.value });
                  }}
                  placeholder="Otomatis dari Shift & PIC (bisa diubah)"
                />
                <datalist id="dt-known-pics">
                  {knownPics.map((picName) => (<option key={picName} value={picName} />))}
                </datalist>
              </label>

              <label>
                Catatan
                <textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Keterangan penyebab atau tindakan..." />
              </label>
            </div>

            <div className="dt-modal-footer">
              <button type="button" className="dt-cancel-btn" onClick={closeForm}>Batal</button>
              <button type="submit" className="dt-primary-btn" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Data"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
