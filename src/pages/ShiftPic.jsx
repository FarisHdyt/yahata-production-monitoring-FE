import { useEffect, useMemo, useState } from "react";
import { MACHINES, SHIFTS } from "../config";
import {
  bulkSaveShiftAssignments,
  deleteShiftAssignment,
  fetchMasters,
  fetchProductionRecords,
  fetchShiftAssignments,
  saveShiftAssignment,
  shiftToId,
} from "../services/dataService";

const DEFAULT_PIC_ASSIGNMENTS = [
  { group: "Grup 1", shift: "Shift 1", pic: "Iis Iskandar", machines: ["NF-19B", "BP-450", "YDP-136", "PF-860"] },
  { group: "Grup 1", shift: "Shift 1", pic: "Achmad Syaiful", machines: ["CBP-105", "CBP-136", "HBF-823", "YH-1552"] },
  { group: "Grup 1", shift: "Shift 1", pic: "Nanda Ferry C", machines: ["CBP-106", "NP-12", "HBF-823 NEW", "HM-676"] },
  { group: "Grup 2", shift: "Shift 2", pic: "Fiki Firmansyah", machines: ["NF-19B", "YDP-136", "CBP-106", "PF-860"] },
  { group: "Grup 2", shift: "Shift 2", pic: "Yossi Tera P", machines: ["CBP-105", "CBP-136", "BP-450", "HM-676"] },
  { group: "Grup 2", shift: "Shift 2", pic: "Wakyudi", machines: ["HBF-823 NEW", "NP-12", "HBF-823"] },
  { group: "Normal Shift", shift: "Shift 1", pic: "Jason", machines: ["ZH-30200", "HM-552"] },
];

const ONE_SHIFT_RED_MACHINES = new Set(["PF-860", "YH-1552", "HM-676", "ZH-30200", "HM-552"]);

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

function getDefaultPicForMachine(shiftName, machineName) {
  const shiftMatches = DEFAULT_PIC_ASSIGNMENTS.filter(
    (entry) => entry.shift === shiftName && entry.machines.includes(machineName)
  );
  if (shiftMatches.length > 0) return shiftMatches[0].pic;
  const normalJason = DEFAULT_PIC_ASSIGNMENTS.find(
    (entry) => entry.group === "Normal Shift" && entry.machines.includes(machineName)
  );
  return normalJason ? normalJason.pic : "";
}

function formatNumber(val) {
  return Number(val || 0).toLocaleString("id-ID");
}

export default function ShiftPic() {
  const [records, setRecords] = useState([]);
  const [productionRecords, setProductionRecords] = useState([]);
  const [masters, setMasters] = useState([]);

  const [date, setDate] = useState(getToday);
  const [shift, setShift] = useState("Shift 1");
  const [machine, setMachine] = useState(MACHINES[0] || "NF-19B");
  const [pic, setPic] = useState(() => getDefaultPicForMachine("Shift 1", MACHINES[0] || "NF-19B"));
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const reloadAll = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [shiftList, prodList, masterList] = await Promise.all([
        fetchShiftAssignments({ date }),
        fetchProductionRecords({ date }),
        fetchMasters(),
      ]);
      setRecords(shiftList || []);
      setProductionRecords(prodList || []);
      setMasters(masterList || []);
      try {
        localStorage.setItem("yahataShiftPicRecords", JSON.stringify(shiftList || []));
        localStorage.setItem("yahataProductionRecords", JSON.stringify(prodList || []));
        localStorage.setItem("yahataMasterProduction", JSON.stringify(masterList || []));
      } catch {}
    } catch (err) {
      showNotification(`Gagal memuat data Shift & PIC: ${err?.message || "unknown error"}`, "error");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const handler = () => reloadAll(false);
    window.addEventListener("storage", handler);
    window.addEventListener("yahata-storage-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("yahata-storage-updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const existing = records.find(
      (r) => r.date === date && r.shift === shift && r.machine === machine
    );
    if (existing) {
      setPic(existing.pic || "");
      setNotes(existing.notes || "");
    } else {
      const fromMaster = masters.find((m) => m.machine === machine);
      const masterPic = shift === "Shift 1" ? fromMaster?.picShift1 : fromMaster?.picShift2;
      setPic(masterPic || getDefaultPicForMachine(shift, machine));
      setNotes("");
    }
  }, [date, shift, machine, records, masters]);

  const handleSaveSingle = async (e) => {
    e.preventDefault();
    if (!date || !shift || !machine || !pic.trim()) {
      showNotification("Tanggal, Shift, Mesin, dan nama PIC wajib diisi.", "error");
      return;
    }
    const cleanPic = pic.trim();
    setSaving(true);
    try {
      await bulkSaveShiftAssignments(date, shift, [
        { machine, pic: cleanPic, notes: notes.trim() },
      ]);
      await reloadAll(false);
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
      showNotification(`PIC ${cleanPic} berhasil disimpan untuk ${machine}.`);
    } catch (err) {
      showNotification(err?.message || "Gagal menyimpan data PIC.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoPopulateShift = async () => {
    if (!date || !shift) {
      showNotification("Tanggal dan shift wajib dipilih.", "error");
      return;
    }
    const currentDateShiftMap = new Map(
      records.filter((r) => r.date === date && r.shift === shift).map((r) => [r.machine, r])
    );
    const assignments = MACHINES.map((mName) => {
      const prev = currentDateShiftMap.get(mName);
      const defaultPic = getDefaultPicForMachine(shift, mName);
      return {
        machine: mName,
        pic: prev?.pic || defaultPic || "-",
        notes: prev?.notes || (ONE_SHIFT_RED_MACHINES.has(mName) ? "Running 1 shift (jadwal)" : ""),
      };
    });
    setSaving(true);
    try {
      await bulkSaveShiftAssignments(date, shift, assignments);
      await reloadAll(false);
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
      showNotification(`Berhasil mengisi ${MACHINES.length} mesin untuk ${shift}.`);
    } catch (err) {
      showNotification(err?.message || "Gagal auto-isi PIC shift.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    const confirmed = window.confirm("Yakin ingin menghapus penugasan PIC ini?");
    if (!confirmed) return;
    setSaving(true);
    try {
      if (record?.id && !String(record.id).startsWith(`${date}__${shift}__`)) {
        await deleteShiftAssignment(record.id);
      } else if (record?.id) {
        // fallback: try bulk delete for machine
        await bulkSaveShiftAssignments(date, shift, [{ machine: record.machine, pic: "", notes: "" }]);
      } else {
        await bulkSaveShiftAssignments(date, shift, [{ machine: record.machine, pic: "", notes: "" }]);
      }
      await reloadAll(false);
      try { window.dispatchEvent(new Event("yahata-storage-updated")); } catch {}
      showNotification("Data penugasan PIC berhasil dihapus.");
    } catch (err) {
      showNotification(err?.message || "Gagal menghapus penugasan PIC.", "error");
    } finally {
      setSaving(false);
    }
  };

  const activeShiftRecords = useMemo(() => {
    return MACHINES.map((mName) => {
      const saved = records.find((r) => r.date === date && r.shift === shift && r.machine === mName);
      const fallbackPic = getDefaultPicForMachine(shift, mName);
      const effectivePic = saved?.pic || fallbackPic || "-";
      const prodOutput = productionRecords
        .filter(
          (p) =>
            p.date === date &&
            p.machine === mName &&
            (String(p.shift) === String(shiftToId(shift)) || p.shift === shift)
        )
        .reduce((sum, item) => sum + Number(item.output || 0), 0);

      return {
        id: saved?.id || `${date}__${shift}__${mName}`,
        recordId: saved?.id || null,
        date,
        shift,
        machine: mName,
        pic: effectivePic,
        isSaved: Boolean(saved),
        oneShiftRule: ONE_SHIFT_RED_MACHINES.has(mName),
        notes: saved?.notes || "",
        prodOutput,
      };
    });
  }, [records, productionRecords, date, shift]);

  const manpowerSummary = useMemo(() => {
    const map = new Map();
    activeShiftRecords.forEach((row) => {
      const key = row.pic || "-";
      if (!map.has(key)) {
        map.set(key, { pic: key, machines: [], totalOutput: 0 });
      }
      const entry = map.get(key);
      entry.machines.push(row.machine);
      entry.totalOutput += row.prodOutput;
    });
    return [...map.values()].sort((a, b) => a.pic.localeCompare(b.pic));
  }, [activeShiftRecords]);

  return (
    <div className="rp-page">
      {notice && (
        <div key={notice.id} className={`rp-toast ${notice.type}`} role="alert" aria-live="assertive">
          <span className="rp-toast-icon">{notice.type === "success" ? "✓" : "!"}</span>
          <span className="rp-toast-message">{notice.message}</span>
          <button type="button" className="rp-toast-close" onClick={() => setNotice(null)} aria-label="Tutup notifikasi">×</button>
        </div>
      )}

      <div className="rp-heading">
        <div>
          <div className="rp-eyebrow">MANPOWER & SHIFT ASSIGNMENT</div>
          <h1>Shift & PIC</h1>
          <p>Pengaturan operator (Man Power) per mesin pada tanggal dan shift area Forming.</p>
        </div>
        <button type="button" className="rp-refresh-btn" onClick={handleAutoPopulateShift} disabled={loading || saving}>
          ⚡ Auto-Isi Semua Mesin ({shift})
        </button>
      </div>

      {loading && <div className="rp-info-note">Memuat data Shift & PIC dari backend...</div>}

      <section className="rp-filter-panel">
        <form onSubmit={handleSaveSingle} className="rp-filters">
          <label>
            Tanggal
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Shift
            <select value={shift} onChange={(e) => setShift(e.target.value)}>
              {SHIFTS.map((s) => (<option key={s.id} value={s.name}>{s.name} ({s.start}–{s.end})</option>))}
            </select>
          </label>
          <label>
            Mesin
            <select value={machine} onChange={(e) => setMachine(e.target.value)}>
              {MACHINES.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </label>
          <label>
            Nama PIC
            <input type="text" value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama operator" />
          </label>
          <label>
            Catatan
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
          </label>
          <button type="submit" className="rp-reset-btn" disabled={saving || loading}>
            {saving ? "Menyimpan..." : "Simpan PIC"}
          </button>
        </form>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Rekap Manpower ({date} · {shift})</h2>
            <p>Daftar mesin yang dipegang dan output shift per operator.</p>
          </div>
        </div>
        <div className="rp-shift-summary">
          {manpowerSummary.map((person) => (
            <div className="rp-shift-item" key={person.pic}>
              <div className="rp-shift-number">
                <span>{person.pic}</span>
                <strong>{person.machines.length} Mesin ({person.machines.join(", ")})</strong>
              </div>
              <strong className="rp-shift-duration">{formatNumber(person.totalOutput)} pcs</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Daftar Penugasan 14 Mesin ({date} · {shift})</h2>
            <p>Penanda warna merah menandakan mesin running 1 shift sesuai jadwal.</p>
          </div>
        </div>
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>PIC</th>
                <th>OUTPUT SHIFT</th>
                <th>STATUS</th>
                <th>CATATAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {activeShiftRecords.map((row) => (
                <tr key={row.id}>
                  <td><strong className={row.oneShiftRule ? "rp-event-status active" : ""}>{row.machine}</strong></td>
                  <td><strong>{row.pic}</strong></td>
                  <td>{formatNumber(row.prodOutput)} pcs</td>
                  <td>{row.isSaved ? "Tersimpan" : "Default Excel"}</td>
                  <td>{row.notes || (row.oneShiftRule ? "Running 1 shift (jadwal)" : "—")}</td>
                  <td>
                    {row.isSaved ? (
                      <button type="button" onClick={() => handleDeleteRecord(row)} disabled={saving}>Hapus</button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
