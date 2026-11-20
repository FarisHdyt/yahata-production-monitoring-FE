
import { useMemo, useState } from "react";
import { MACHINES } from "../config";

const STORAGE_KEY = "yahataMasterProduction";

const emptyItem = (machine) => ({
  machine,
  partNumber: "",
  rpm: "",
  pcsPerRevolution: "",
  notes: "",
  updatedAt: null,
});

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return MACHINES.map(
      (machine) => saved.find((item) => item.machine === machine) || emptyItem(machine)
    );
  } catch {
    return MACHINES.map(emptyItem);
  }
}

export default function MasterProduction() {
  const [data, setData] = useState(loadData);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyItem(""));

  const configured = useMemo(
    () => data.filter((item) => item.partNumber.trim()).length,
    [data]
  );

  const openEditor = (item) => {
    setEditing(item.machine);
    setForm({ ...item });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm(emptyItem(""));
  };

  const saveData = (e) => {
    e.preventDefault();

    if (!form.partNumber.trim()) {
      alert("Part Number wajib diisi.");
      return;
    }

    if (form.rpm && Number(form.rpm) <= 0) {
      alert("RPM harus lebih besar dari 0.");
      return;
    }

    if (form.pcsPerRevolution && Number(form.pcsPerRevolution) <= 0) {
      alert("Pcs per Revolution harus lebih besar dari 0.");
      return;
    }

    const updated = data.map((item) =>
      item.machine === editing
        ? { ...form, updatedAt: new Date().toISOString() }
        : item
    );

    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    closeEditor();
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Belum pernah diperbarui";

  return (
    <div className="mp-page">
      <div className="mp-heading">
        <div>
          <div className="mp-eyebrow">PRODUCTION MANAGEMENT / CONFIGURATION</div>
          <h1>Master Production</h1>
          <p>Kelola identitas produk dan parameter operasional setiap mesin.</p>
        </div>
        <div className="mp-heading-tag">
          <span className="mp-live-dot" />
          FORMING AREA
        </div>
      </div>

      <div className="mp-stats">
        <div className="mp-stat-card">
          <div className="mp-stat-icon blue">▦</div>
          <div>
            <span>Total Mesin</span>
            <strong>{data.length}</strong>
            <small>Mesin terdaftar</small>
          </div>
        </div>
        <div className="mp-stat-card">
          <div className="mp-stat-icon green">✓</div>
          <div>
            <span>Sudah Dikonfigurasi</span>
            <strong>{configured}</strong>
            <small>Memiliki Part Number</small>
          </div>
        </div>
        <div className="mp-stat-card">
          <div className="mp-stat-icon orange">!</div>
          <div>
            <span>Belum Dikonfigurasi</span>
            <strong>{data.length - configured}</strong>
            <small>Memerlukan pengaturan</small>
          </div>
        </div>
        <div className="mp-stat-card">
          <div className="mp-stat-icon navy">%</div>
          <div>
            <span>Kelengkapan Data</span>
            <strong>{Math.round((configured / (data.length || 1)) * 100)}%</strong>
            <small>Konfigurasi mesin</small>
          </div>
        </div>
      </div>

      {editing && (
        <div className="mp-modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeEditor();
        }}>
          <form className="mp-editor" onSubmit={saveData}>
            <div className="mp-editor-header">
              <div>
                <span>EDIT CONFIGURATION</span>
                <h2>Mesin {editing}</h2>
                <p>Masukkan parameter berdasarkan kondisi aktual mesin.</p>
              </div>
              <button type="button" className="mp-close" onClick={closeEditor}>×</button>
            </div>

            <div className="mp-form-body">
              <label className="mp-field">
                <span>Nama Mesin</span>
                <input value={editing} disabled />
              </label>
              <label className="mp-field">
                <span>Part Number <b>*</b></span>
                <input
                  value={form.partNumber}
                  onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                  placeholder="Masukkan Part Number"
                  required
                />
              </label>
              <div className="mp-form-row">
                <label className="mp-field">
                  <span>RPM</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.rpm}
                    onChange={(e) => setForm({ ...form, rpm: e.target.value })}
                    placeholder="Contoh: 30"
                  />
                </label>
                <label className="mp-field">
                  <span>Pcs / Revolution</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.pcsPerRevolution}
                    onChange={(e) => setForm({ ...form, pcsPerRevolution: e.target.value })}
                    placeholder="Contoh: 1"
                  />
                </label>
              </div>
              <label className="mp-field">
                <span>Catatan</span>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Tambahkan catatan parameter mesin..."
                />
              </label>
              <div className="mp-note">
                <strong>ⓘ Informasi</strong>
                <p>Pastikan nilai RPM dan Pcs / Revolution sesuai hasil konfirmasi dengan mentor atau teknisi.</p>
              </div>
            </div>

            <div className="mp-editor-footer">
              <button type="button" className="mp-btn-secondary" onClick={closeEditor}>Batal</button>
              <button type="submit" className="mp-btn-primary">Simpan Konfigurasi</button>
            </div>
          </form>
        </div>
      )}

      <section className="mp-table-section">
        <div className="mp-section-heading">
          <div>
            <h2>Daftar Konfigurasi Mesin</h2>
            <p>Data Part Number dan parameter produksi aktif.</p>
          </div>
          <span className="mp-record-count">{data.length} MACHINES</span>
        </div>

        <div className="mp-table-wrap">
          <table className="mp-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>PART NUMBER</th>
                <th>RPM</th>
                <th>PCS / REV</th>
                <th>STATUS</th>
                <th>TERAKHIR DIPERBARUI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const isConfigured = Boolean(item.partNumber.trim());

                return (
                  <tr key={item.machine}>
                    <td><span className="mp-machine-name">{item.machine}</span></td>
                    <td>{item.partNumber || <span className="mp-muted">Belum diatur</span>}</td>
                    <td>{item.rpm || "—"}</td>
                    <td>{item.pcsPerRevolution || "—"}</td>
                    <td>
                      <span className={`mp-status ${isConfigured ? "complete" : "pending"}`}>
                        <i /> {isConfigured ? "Configured" : "Pending"}
                      </span>
                    </td>
                    <td className="mp-date">{formatDate(item.updatedAt)}</td>
                    <td>
                      <button className="mp-edit-btn" onClick={() => openEditor(item)}>
                        <span>✎</span> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mp-bottom-note">
        <div className="mp-note-symbol">i</div>
        <div>
          <strong>Catatan konfigurasi produksi</strong>
          <p>Perubahan Part Number dan RPM perlu memiliki riwayat waktu berlakunya. Data konfigurasi versi ini masih tersimpan secara lokal di browser dan belum terhubung ke database.</p>
        </div>
      </div>
    </div>
  );
}
