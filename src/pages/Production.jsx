
import { useMemo, useState } from "react";
import { MACHINES, SHIFTS } from "../config.js";

const STORAGE_KEY = "yahataProductionRecords";
const MASTER_KEY = "yahataMasterProduction";

const getToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const createEmptyForm = () => ({
    date: getToday(),
    shift: "1",
    machine: MACHINES[0] || "",
    partNumber: "",
    startTime: "06:00",
    endTime: "07:00",
    output: "",
    pic: "",
    notes: "",
});

const loadRecords = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
};

const loadMasters = () => {
    try {
        return JSON.parse(localStorage.getItem(MASTER_KEY) || "[]");
    } catch {
        return [];
    }
};

const formatNumber = (value) =>
    Number(value || 0).toLocaleString("id-ID");

const formatDate = (date) =>
    date
        ? new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "-";

const getShift = (shiftId) =>
    SHIFTS.find((item) => String(item.id) === String(shiftId));

export default function Production() {
    const [records, setRecords] = useState(loadRecords);
    const [masters] = useState(loadMasters);
    const [form, setForm] = useState(createEmptyForm);
    const [editingId, setEditingId] = useState(null);

    const [filterDate, setFilterDate] = useState(getToday());
    const [filterShift, setFilterShift] = useState("all");
    const [filterMachine, setFilterMachine] = useState("all");

    const configuredMachines = useMemo(
        () => masters.filter((item) => item.partNumber?.trim()),
        [masters]
    );

    const totalOutput = useMemo(
        () => records.reduce(
            (total, item) => total + Number(item.output || 0),
            0
        ),
        [records]
    );

    const todayRecords = useMemo(
        () => records.filter((item) => item.date === getToday()),
        [records]
    );

    const todayOutput = todayRecords.reduce(
        (total, item) => total + Number(item.output || 0),
        0
    );

    const filteredRecords = useMemo(() => {
        return records
            .filter((item) => {
                const dateMatch =
                    !filterDate || item.date === filterDate;

                const shiftMatch =
                    filterShift === "all" ||
                    String(item.shift) === filterShift;

                const machineMatch =
                    filterMachine === "all" ||
                    item.machine === filterMachine;

                return dateMatch && shiftMatch && machineMatch;
            })
            .sort((a, b) => {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;
                return b.startTime.localeCompare(a.startTime);
            });
    }, [records, filterDate, filterShift, filterMachine]);

    const updateForm = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const persistRecords = (updated) => {
        setRecords(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleMachineChange = (machine) => {
        const master = masters.find(
            (item) => item.machine === machine
        );

        setForm((previous) => ({
            ...previous,
            machine,
            partNumber: master?.partNumber || "",
        }));
    };

    const resetForm = () => {
        setForm(createEmptyForm());
        setEditingId(null);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!form.machine || !form.partNumber.trim()) {
            alert(
                "Mesin belum memiliki Part Number. Periksa Master Production terlebih dahulu."
            );
            return;
        }

        const output = Number(form.output);

        if (!Number.isInteger(output) || output <= 0) {
            alert("Output harus berupa bilangan bulat lebih dari 0.");
            return;
        }

        const shift = getShift(form.shift);

        if (!shift) {
            alert("Shift tidak valid.");
            return;
        }

        if (
            form.startTime < shift.start ||
            form.endTime > shift.end ||
            form.startTime >= form.endTime
        ) {
            alert(
                `Waktu produksi harus berada dalam jadwal ${shift.name}: ${shift.start} - ${shift.end}.`
            );
            return;
        }

        const hasOverlap = records.some((item) => {
            if (item.id === editingId) return false;

            if (
                item.date !== form.date ||
                item.machine !== form.machine
            ) {
                return false;
            }

            return (
                form.startTime < item.endTime &&
                form.endTime > item.startTime
            );
        });

        if (hasOverlap) {
            alert(
                "Periode produksi bertabrakan dengan catatan lain pada mesin dan tanggal yang sama."
            );
            return;
        }

        const record = {
            id: editingId || String(Date.now()),
            date: form.date,
            shift: Number(form.shift),
            machine: form.machine,
            partNumber: form.partNumber.trim(),
            startTime: form.startTime,
            endTime: form.endTime,
            output,
            pic: form.pic.trim(),
            notes: form.notes.trim(),
            updatedAt: new Date().toISOString(),
        };

        if (!record.pic) {
            alert("Nama PIC wajib diisi.");
            return;
        }

        const updated = editingId
            ? records.map((item) =>
                  item.id === editingId ? record : item
              )
            : [...records, record];

        persistRecords(updated);
        resetForm();

        alert("Data produksi berhasil disimpan.");
    };

    const handleEdit = (record) => {
        setEditingId(record.id);

        setForm({
            date: record.date,
            shift: String(record.shift),
            machine: record.machine,
            partNumber: record.partNumber,
            startTime: record.startTime,
            endTime: record.endTime,
            output: String(record.output),
            pic: record.pic,
            notes: record.notes || "",
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleDelete = (id) => {
        if (!window.confirm("Yakin ingin menghapus catatan produksi ini?")) {
            return;
        }

        persistRecords(records.filter((item) => item.id !== id));

        if (editingId === id) {
            resetForm();
        }
    };

    return (
        <div className="production-page">
            <div className="production-heading">
                <div>
                    <span className="page-eyebrow">
                        FORMING AREA
                    </span>

                    <h2>Production Input</h2>

                    <p>
                        Catat hasil produksi aktual setiap mesin
                        berdasarkan periode produksi.
                    </p>
                </div>

                <div className="production-demo-badge">
                    <span></span>
                    Local Storage
                </div>
            </div>

            <div className="production-summary">
                <div className="production-stat">
                    <span>Total Records</span>
                    <strong>{records.length}</strong>
                    <small>Catatan produksi</small>
                </div>

                <div className="production-stat">
                    <span>Today's Records</span>
                    <strong>{todayRecords.length}</strong>
                    <small>Catatan hari ini</small>
                </div>

                <div className="production-stat">
                    <span>Today's Output</span>
                    <strong>{formatNumber(todayOutput)}</strong>
                    <small>Total output hari ini</small>
                </div>

                <div className="production-stat">
                    <span>All-Time Output</span>
                    <strong>{formatNumber(totalOutput)}</strong>
                    <small>Total output tercatat</small>
                </div>
            </div>

            <section className="production-panel">
                <div className="production-panel-heading">
                    <div>
                        <h3>
                            {editingId
                                ? "Edit Production Record"
                                : "Input Hasil Produksi"}
                        </h3>

                        <p>
                            Data produksi dicatat berdasarkan periode aktual.
                        </p>
                    </div>

                    {editingId && (
                        <span className="editing-label">
                            Mode Edit
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="production-form-grid">
                        <label className="production-field">
                            <span>Tanggal *</span>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) =>
                                    updateForm("date", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Shift *</span>
                            <select
                                value={form.shift}
                                onChange={(e) =>
                                    updateForm("shift", e.target.value)
                                }
                            >
                                {SHIFTS.map((shift) => (
                                    <option
                                        key={shift.id}
                                        value={String(shift.id)}
                                    >
                                        {shift.name} ({shift.schedule})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="production-field">
                            <span>Mesin *</span>
                            <select
                                value={form.machine}
                                onChange={(e) =>
                                    handleMachineChange(e.target.value)
                                }
                                required
                            >
                                {MACHINES.map((machine) => (
                                    <option key={machine} value={machine}>
                                        {machine}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="production-field">
                            <span>Part Number *</span>
                            <input
                                value={form.partNumber}
                                onChange={(e) =>
                                    updateForm("partNumber", e.target.value)
                                }
                                placeholder="Belum dikonfigurasi"
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Jam Mulai *</span>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(e) =>
                                    updateForm("startTime", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Jam Selesai *</span>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(e) =>
                                    updateForm("endTime", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Output Aktual (pcs) *</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={form.output}
                                onChange={(e) =>
                                    updateForm("output", e.target.value)
                                }
                                placeholder="Masukkan jumlah produksi"
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Nama PIC *</span>
                            <input
                                value={form.pic}
                                onChange={(e) =>
                                    updateForm("pic", e.target.value)
                                }
                                placeholder="Nama penanggung jawab"
                                required
                            />
                        </label>

                        <label className="production-field">
                            <span>Catatan</span>
                            <input
                                value={form.notes}
                                onChange={(e) =>
                                    updateForm("notes", e.target.value)
                                }
                                placeholder="Catatan tambahan (opsional)"
                            />
                        </label>
                    </div>

                    <div className="production-form-footer">
                        <span>
                            PN otomatis mengikuti Master Production saat
                            mesin dipilih. Kamu tetap bisa menyesuaikan
                            snapshot PN untuk pencatatan periode tertentu.
                        </span>

                        <div>
                            {editingId && (
                                <button
                                    type="button"
                                    className="production-button secondary"
                                    onClick={resetForm}
                                >
                                    Batal Edit
                                </button>
                            )}

                            <button
                                type="submit"
                                className="production-button primary"
                            >
                                {editingId
                                    ? "Simpan Perubahan"
                                    : "Simpan Produksi"}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <section className="production-panel">
                <div className="production-panel-heading">
                    <div>
                        <h3>Production History</h3>
                        <p>
                            Riwayat hasil produksi berdasarkan filter.
                        </p>
                    </div>

                    <span className="record-count">
                        {filteredRecords.length} RECORDS
                    </span>
                </div>

                <div className="production-form-grid production-filter-grid">
                    <label className="production-field">
                        <span>Filter Tanggal</span>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) =>
                                setFilterDate(e.target.value)
                            }
                        />
                    </label>

                    <label className="production-field">
                        <span>Filter Shift</span>
                        <select
                            value={filterShift}
                            onChange={(e) =>
                                setFilterShift(e.target.value)
                            }
                        >
                            <option value="all">Semua Shift</option>
                            {SHIFTS.map((shift) => (
                                <option
                                    key={shift.id}
                                    value={String(shift.id)}
                                >
                                    {shift.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="production-field">
                        <span>Filter Mesin</span>
                        <select
                            value={filterMachine}
                            onChange={(e) =>
                                setFilterMachine(e.target.value)
                            }
                        >
                            <option value="all">Semua Mesin</option>
                            {MACHINES.map((machine) => (
                                <option key={machine} value={machine}>
                                    {machine}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="production-table-wrapper">
                    <table className="production-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Shift</th>
                                <th>Mesin</th>
                                <th>Part Number</th>
                                <th>Periode</th>
                                <th>Output</th>
                                <th>PIC</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        Belum ada data produksi pada filter ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((item) => (
                                    <tr key={item.id}>
                                        <td>{formatDate(item.date)}</td>
                                        <td>Shift {item.shift}</td>
                                        <td><strong>{item.machine}</strong></td>
                                        <td>{item.partNumber}</td>
                                        <td>
                                            {item.startTime} - {item.endTime}
                                        </td>
                                        <td>
                                            <strong>
                                                {formatNumber(item.output)} pcs
                                            </strong>
                                        </td>
                                        <td>{item.pic}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(item)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete-action"
                                                    onClick={() =>
                                                        handleDelete(item.id)
                                                    }
                                                >
                                                    Hapus
                                                </button>
                                            </div>
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
