
import { useMemo, useState } from "react";
import { MACHINES, SHIFTS, DOWNTIME_CATEGORIES } from "../config.js";

const MOCK_MACHINES = [
    { name: "BP-450", status: "running", actual: 1250, partNumber: "PN-001", pic: "Operator 1", rpm: 120 },
    { name: "CBP-105", status: "running", actual: 980, partNumber: "PN-002", pic: "Operator 2", rpm: 110 },
    { name: "CBP-106", status: "downtime", actual: 760, partNumber: "PN-003", pic: "Operator 3", rpm: 100, downtime: "Trouble Machine", duration: 35 },
    { name: "CBP-136", status: "running", actual: 1430, partNumber: "PN-001", pic: "Operator 4", rpm: 125 },
    { name: "HBF-823", status: "running", actual: 1100, partNumber: "PN-004", pic: "Operator 5", rpm: 115 },
    { name: "HBF-823 NEW", status: "unconfirmed", actual: null, partNumber: "-", pic: "-", rpm: null },
    { name: "HM-552", status: "running", actual: 890, partNumber: "PN-005", pic: "Operator 6", rpm: 105 },
    { name: "HM-676", status: "stop", actual: 0, partNumber: "PN-006", pic: "Operator 7", rpm: null },
    { name: "NF-19B", status: "running", actual: 1320, partNumber: "PN-002", pic: "Operator 8", rpm: 120 },
    { name: "NP-12", status: "downtime", actual: 650, partNumber: "PN-007", pic: "Operator 9", rpm: 95, downtime: "Trouble Tooling", duration: 50 },
    { name: "PF-860", status: "running", actual: 1180, partNumber: "PN-003", pic: "Operator 10", rpm: 110 },
    { name: "YDP-136", status: "running", actual: 1050, partNumber: "PN-004", pic: "Operator 11", rpm: 100 },
    { name: "YH-1552", status: "needs_confirmation", actual: null, partNumber: "PN-005", pic: "Operator 12", rpm: null },
    { name: "ZH-30200", status: "running", actual: 1380, partNumber: "PN-006", pic: "Operator 13", rpm: 125 }
];

const MOCK_TREND = [
    { hour: "06:00", output: 850 },
    { hour: "07:00", output: 1120 },
    { hour: "08:00", output: 1280 },
    { hour: "09:00", output: 1350 },
    { hour: "10:00", output: 1190 },
    { hour: "11:00", output: 1050 },
    { hour: "12:00", output: 980 },
    { hour: "13:00", output: 1420 },
    { hour: "14:00", output: 1250 },
    { hour: "15:00", output: 0 },
    { hour: "16:00", output: 0 },
    { hour: "17:00", output: 0 },
    { hour: "18:00", output: 0 },
    { hour: "19:00", output: 0 },
    { hour: "20:00", output: 0 },
    { hour: "21:00", output: 0 },
    { hour: "22:00", output: 0 }
];

const MOCK_DOWNTIME = [
    { category: "Trouble Machine", minutes: 35, count: 1 },
    { category: "Trouble Tooling", minutes: 50, count: 1 },
    { category: "Dandori (setting dan adjustment)", minutes: 25, count: 1 },
    { category: "QC Check (inspection part)", minutes: 15, count: 1 }
];

const STATUS_LABELS = {
    running: "Running",
    downtime: "Downtime",
    stop: "Stop",
    unconfirmed: "Belum dikonfirmasi",
    needs_confirmation: "Perlu konfirmasi"
};

const STATUS_COLORS = {
    running: "#16a34a",
    downtime: "#dc2626",
    stop: "#64748b",
    unconfirmed: "#d97706",
    needs_confirmation: "#9333ea"
};

const formatNumber = value =>
    value === null || value === undefined
        ? "-"
        : new Intl.NumberFormat("id-ID").format(value);

const formatDuration = minutes => {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return hours ? `${hours} jam ${remaining} menit` : `${remaining} menit`;
};

const getToday = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export default function Dashboard() {
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [selectedShift, setSelectedShift] = useState("all");
    const [selectedMachine, setSelectedMachine] = useState("all");
    const [selectedPart, setSelectedPart] = useState("all");
    const [activeMachine, setActiveMachine] = useState(null);

    const machines = useMemo(() => {
        return MOCK_MACHINES.filter(machine => {
            const machineMatch =
                selectedMachine === "all" || machine.name === selectedMachine;
            const partMatch =
                selectedPart === "all" || machine.partNumber === selectedPart;

            return machineMatch && partMatch;
        });
    }, [selectedMachine, selectedPart]);

    const kpi = useMemo(() => {
        const running = machines.filter(m => m.status === "running").length;
        const downtime = machines.filter(m => m.status === "downtime").length;
        const validData = machines.filter(m => m.actual !== null).length;
        const totalOutput = machines.reduce(
            (sum, machine) => sum + (machine.actual ?? 0),
            0
        );

        return {
            totalOutput,
            totalMachines: machines.length,
            running,
            downtime,
            validData
        };
    }, [machines]);

    const trend = useMemo(() => {
        if (selectedShift === "shift2") {
            return MOCK_TREND.filter(item => {
                const hour = Number(item.hour.slice(0, 2));
                return hour >= 15;
            });
        }

        if (selectedShift === "shift1") {
            return MOCK_TREND.filter(item => {
                const hour = Number(item.hour.slice(0, 2));
                return hour >= 6 && hour < 15;
            });
        }

        return MOCK_TREND.filter(item => {
            const hour = Number(item.hour.slice(0, 2));
            return hour >= 6;
        });
    }, [selectedShift]);

    const totalDowntime = MOCK_DOWNTIME.reduce(
        (sum, item) => sum + item.minutes,
        0
    );

    const maxOutput = Math.max(...trend.map(item => item.output), 1);

    const selectedMachineData = MOCK_MACHINES.find(
        machine => machine.name === activeMachine
    );

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <div className="header-title">
                    <div>
                        <span className="header-eyebrow">YAHATA FASTENER INDONESIA</span>
                        <h1>Production Monitoring</h1>
                        <p>Forming Area · Production Dashboard</p>
                    </div>
                </div>

                <div className="header-info">
                    <div>
                        <span className="connection-dot"></span>
                        <span>Demo Mode</span>
                    </div>
                    <small>Mock data · Belum terhubung API</small>
                </div>
            </header>

            <section className="dashboard-filter">
                <div className="filter-item">
                    <label htmlFor="filter-date">Tanggal</label>
                    <input
                        id="filter-date"
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-shift">Shift</label>
                    <select
                        id="filter-shift"
                        value={selectedShift}
                        onChange={e => setSelectedShift(e.target.value)}
                    >
                        <option value="all">Semua Shift</option>
                        {SHIFTS.map(shift => (
                            <option key={shift.key} value={shift.key}>
                                {shift.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-machine">Mesin</label>
                    <select
                        id="filter-machine"
                        value={selectedMachine}
                        onChange={e => setSelectedMachine(e.target.value)}
                    >
                        <option value="all">Semua Mesin</option>
                        {MACHINES.map(machine => (
                            <option key={machine} value={machine}>
                                {machine}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-part">Part Number</label>
                    <select
                        id="filter-part"
                        value={selectedPart}
                        onChange={e => setSelectedPart(e.target.value)}
                    >
                        <option value="all">Semua Part Number</option>
                        {[...new Set(MOCK_MACHINES.map(m => m.partNumber))]
                            .filter(part => part !== "-")
                            .map(part => (
                                <option key={part} value={part}>{part}</option>
                            ))}
                    </select>
                </div>

                <button
                    className="filter-reset"
                    onClick={() => {
                        setSelectedDate(getToday());
                        setSelectedShift("all");
                        setSelectedMachine("all");
                        setSelectedPart("all");
                    }}
                >
                    Reset Filter
                </button>
            </section>

            <section className="kpi-container">
                <article className="kpi-card">
                    <span className="kpi-label">Total Actual Output</span>
                    <strong>{formatNumber(kpi.totalOutput)}</strong>
                    <small>Pieces · berdasarkan data tersedia</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Total Machines</span>
                    <strong>{kpi.totalMachines}</strong>
                    <small>Mesin sesuai filter</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Running</span>
                    <strong className="kpi-green">{kpi.running}</strong>
                    <small>Mesin berstatus running</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Downtime</span>
                    <strong className="kpi-red">{kpi.downtime}</strong>
                    <small>Mesin mengalami downtime</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Valid Production Data</span>
                    <strong>{kpi.validData}</strong>
                    <small>Mesin dengan input produksi</small>
                </article>
            </section>

            <section className="content-grid">
                <article className="panel production-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Production Trend</h2>
                            <p>Total output per jam dari mesin sesuai filter</p>
                        </div>
                        <span className="panel-unit">PCS / HOUR</span>
                    </div>

                    <div className="trend-chart">
                        {trend.map(item => (
                            <div className="trend-column" key={item.hour}>
                                <span className="trend-value">
                                    {item.output ? formatNumber(item.output) : "-"}
                                </span>
                                <div className="trend-bar-area">
                                    <div
                                        className="trend-bar"
                                        style={{
                                            height: `${item.output / maxOutput * 100}%`,
                                            minHeight: item.output ? "4px" : "0"
                                        }}
                                    />
                                </div>
                                <span className="trend-hour">{item.hour}</span>
                            </div>
                        ))}
                    </div>

                    <p className="helper-text">
                        Data grafik ini merupakan contoh tampilan. Jam tanpa data
                        produksi harus ditampilkan sebagai belum ada data, bukan
                        dianggap hasil produksi nol.
                    </p>
                </article>

                <article className="panel downtime-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Downtime Overview</h2>
                            <p>Ringkasan kategori downtime</p>
                        </div>
                    </div>

                    <div className="downtime-total">
                        <span>Total Downtime</span>
                        <strong>{formatDuration(totalDowntime)}</strong>
                        <small>
                            {MOCK_DOWNTIME.reduce((sum, item) => sum + item.count, 0)} kejadian
                        </small>
                    </div>

                    <div className="downtime-list">
                        {MOCK_DOWNTIME.map(item => (
                            <div className="downtime-item" key={item.category}>
                                <div>
                                    <strong>{item.category}</strong>
                                    <small>{item.count} kejadian</small>
                                </div>
                                <span>{formatDuration(item.minutes)}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <section className="panel machine-monitoring">
                <div className="panel-header">
                    <div>
                        <h2>Machine Monitoring</h2>
                        <p>Monitoring status seluruh mesin area Forming</p>
                    </div>
                    <span className="machine-count">
                        {machines.length} Mesin
                    </span>
                </div>

                <div className="machine-legend">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                        <span key={status}>
                            <i style={{ background: STATUS_COLORS[status] }}></i>
                            {label}
                        </span>
                    ))}
                </div>

                <div className="machine-grid">
                    {machines.map(machine => (
                        <button
                            type="button"
                            className={`machine-card ${activeMachine === machine.name ? "selected" : ""}`}
                            key={machine.name}
                            onClick={() => setActiveMachine(
                                activeMachine === machine.name ? null : machine.name
                            )}
                        >
                            <div className="machine-card-top">
                                <strong>{machine.name}</strong>
                                <span
                                    className="status-indicator"
                                    style={{ background: STATUS_COLORS[machine.status] }}
                                ></span>
                            </div>

                            <span className="machine-status-text">
                                {STATUS_LABELS[machine.status]}
                            </span>

                            <div className="machine-output">
                                <strong>
                                    {machine.actual === null
                                        ? "-"
                                        : formatNumber(machine.actual)}
                                </strong>
                                <small>PCS</small>
                            </div>

                            <div className="machine-card-bottom">
                                <span>{machine.partNumber}</span>
                                <span>Detail →</span>
                            </div>
                        </button>
                    ))}
                </div>

                {machines.length === 0 && (
                    <div className="empty-state">
                        Tidak ada mesin yang sesuai dengan filter.
                    </div>
                )}
            </section>

            {selectedMachineData && (
                <section className="detail-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Machine Detail · {selectedMachineData.name}</h2>
                            <p>Informasi detail mesin</p>
                        </div>
                        <button
                            className="detail-close"
                            onClick={() => setActiveMachine(null)}
                        >
                            Tutup ✕
                        </button>
                    </div>

                    <div className="detail-grid">
                        <div>
                            <span>Status Mesin</span>
                            <strong style={{
                                color: STATUS_COLORS[selectedMachineData.status]
                            }}>
                                {STATUS_LABELS[selectedMachineData.status]}
                            </strong>
                        </div>
                        <div>
                            <span>Actual Output</span>
                            <strong>
                                {selectedMachineData.actual === null
                                    ? "Belum ada data"
                                    : `${formatNumber(selectedMachineData.actual)} pcs`}
                            </strong>
                        </div>
                        <div>
                            <span>Part Number</span>
                            <strong>{selectedMachineData.partNumber}</strong>
                        </div>
                        <div>
                            <span>Operator / PIC</span>
                            <strong>{selectedMachineData.pic}</strong>
                        </div>
                        <div>
                            <span>RPM</span>
                            <strong>
                                {selectedMachineData.rpm ?? "Belum tersedia"}
                            </strong>
                        </div>
                        <div>
                            <span>Downtime</span>
                            <strong>
                                {selectedMachineData.downtime
                                    ? `${selectedMachineData.downtime} · ${selectedMachineData.duration} menit`
                                    : "-"}
                            </strong>
                        </div>
                    </div>

                    <p className="helper-text">
                        Informasi ini masih berupa data simulasi dan akan
                        disesuaikan setelah integrasi dengan backend.
                    </p>
                </section>
            )}

            <footer className="dashboard-footer">
                <span>Yahata Production Monitoring System</span>
                <span>Frontend Preview · Mock Data</span>
            </footer>
        </main>
    );
}
