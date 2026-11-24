import { useEffect, useMemo, useState } from "react";
import { MACHINES, SHIFTS, DOWNTIME_CATEGORIES } from "../config.js";

const PRODUCTION_STORAGE_KEY = "yahataProductionRecords";
const DOWNTIME_STORAGE_KEY = "yahataDowntimeEvents";
const MASTER_STORAGE_KEY = "yahataMasterProduction";
const SHIFT_PIC_STORAGE_KEY = "yahataShiftPicRecords";

const EFFECTIVE_SHIFT_MINUTES = 480;

const STATUS_LABELS = {
    running: "Running",
    downtime: "Downtime",
    off_schedule: "Di luar jadwal",
    unconfirmed: "Belum dikonfirmasi"
};

const STATUS_COLORS = {
    running: "#16a34a",
    downtime: "#dc2626",
    off_schedule: "#64748b",
    unconfirmed: "#d97706"
};

const safeReadArray = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const getTodayKey = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatNumber = (value) => {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
        return "Belum ada data";
    }
    return Number(value).toLocaleString("id-ID");
};

const formatPercent = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "Belum ada data";
    }
    return `${Number(value).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })}%`;
};

const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) {
        return "Belum ada data";
    }
    const safe = Math.max(0, Math.round(Number(minutes)));
    const hours = Math.floor(safe / 60);
    const remaining = safe % 60;
    if (!hours) return `${remaining} menit`;
    if (!remaining) return `${hours} jam`;
    return `${hours} jam ${remaining} menit`;
};

const normalizeShiftKey = (shiftValue) => {
    const raw = String(shiftValue ?? "").trim().toLowerCase();
    if (raw === "1" || raw === "shift 1" || raw === "shift1") return "shift1";
    if (raw === "2" || raw === "shift 2" || raw === "shift2") return "shift2";
    return null;
};

const getStartText = (event) => event?.startAt || event?.start || "";
const getEndText = (event) => event?.endAt || event?.end || null;

const isRunningCategory = (category) => {
    if (category === 1 || String(category) === "1") return true;
    const raw = String(category ?? "").trim().toLowerCase();
    return raw === "running production";
};

const getDowntimeMinutes = (event, now = new Date()) => {
    const startText = getStartText(event);
    if (!startText) return 0;
    const start = new Date(startText);
    const endText = getEndText(event);
    const end = endText ? new Date(endText) : now;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
    if (end <= start) return 0;
    return Math.round((end.getTime() - start.getTime()) / 60000);
};

// Aturan: downtime pada jam handover Shift 1 ke Shift 2 (14:00 - 14:15) masuk ke Shift 1
const resolveShiftKeyByTime = (dateValue) => {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    if (!Number.isFinite(d.getTime())) return null;
    const minutes = d.getHours() * 60 + d.getMinutes();

    if (minutes >= 6 * 60 && minutes <= 14 * 60 + 15) {
        return "shift1";
    }
    if (minutes > 14 * 60 + 15 && minutes < 23 * 60) {
        return "shift2";
    }
    return null;
};

const isWithinShiftSchedule = (date = new Date()) => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    const inShift1 = minutes >= 6 * 60 && minutes < 15 * 60;
    const inShift2 = minutes >= 14 * 60 && minutes < 23 * 60;
    return inShift1 || inShift2;
};

export default function Dashboard() {
    const [selectedDate, setSelectedDate] = useState(getTodayKey);
    const [selectedShift, setSelectedShift] = useState("all");
    const [selectedMachine, setSelectedMachine] = useState("all");
    const [selectedPart, setSelectedPart] = useState("all");
    const [activeMachine, setActiveMachine] = useState(null);
    const [activeHour, setActiveHour] = useState(null);
    const [storageTick, setStorageTick] = useState(0);

    useEffect(() => {
        const handleSync = () => setStorageTick((prev) => prev + 1);
        window.addEventListener("storage", handleSync);
        window.addEventListener("yahata-storage-updated", handleSync);
        return () => {
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("yahata-storage-updated", handleSync);
        };
    }, []);

    const productionRecords = useMemo(
        () => safeReadArray(PRODUCTION_STORAGE_KEY),
        [storageTick]
    );
    const downtimeEvents = useMemo(
        () => safeReadArray(DOWNTIME_STORAGE_KEY),
        [storageTick]
    );
    const masterRecords = useMemo(
        () => safeReadArray(MASTER_STORAGE_KEY),
        [storageTick]
    );
    const shiftPicRecords = useMemo(
        () => safeReadArray(SHIFT_PIC_STORAGE_KEY),
        [storageTick]
    );

    const partOptions = useMemo(() => {
        const fromMaster = masterRecords.map((m) => m.partNumber).filter(Boolean);
        const fromProd = productionRecords.map((r) => r.partNumber).filter(Boolean);
        return [...new Set([...fromMaster, ...fromProd])].sort();
    }, [masterRecords, productionRecords]);

    const filteredDowntime = useMemo(() => {
        return downtimeEvents.filter((event) => {
            if (isRunningCategory(event.category)) return false;

            const startText = getStartText(event);
            if (!startText) return false;
            const eventDate = startText.slice(0, 10);
            const dateMatch = !selectedDate || eventDate === selectedDate;

            const machineName = event.machine || event.machineId || "";
            const machineMatch = selectedMachine === "all" || machineName === selectedMachine;

            const eventShift =
                resolveShiftKeyByTime(startText) || normalizeShiftKey(event.shift);
            const shiftMatch = selectedShift === "all" || eventShift === selectedShift;

            return dateMatch && machineMatch && shiftMatch;
        });
    }, [downtimeEvents, selectedDate, selectedMachine, selectedShift]);

    const filteredProduction = useMemo(() => {
        return productionRecords.filter((rec) => {
            const dateMatch = !selectedDate || rec.date === selectedDate;
            const machineMatch = selectedMachine === "all" || rec.machine === selectedMachine;
            const recShift =
                normalizeShiftKey(rec.shift) ||
                (rec.startTime ? resolveShiftKeyByTime(`${rec.date}T${rec.startTime}`) : null);
            const shiftMatch = selectedShift === "all" || recShift === selectedShift;
            const partMatch = selectedPart === "all" || rec.partNumber === selectedPart;

            return dateMatch && machineMatch && shiftMatch && partMatch;
        });
    }, [productionRecords, selectedDate, selectedMachine, selectedShift, selectedPart]);

    const machines = useMemo(() => {
        const now = new Date();
        const isToday = selectedDate === getTodayKey();
        const inSchedule = isToday ? isWithinShiftSchedule(now) : false;

        return MACHINES.filter((name) => {
            if (selectedMachine !== "all" && name !== selectedMachine) return false;

            const master = masterRecords.find((m) => m.machine === name);
            const machineProd = filteredProduction.filter((r) => r.machine === name);
            const latestPart =
                machineProd[machineProd.length - 1]?.partNumber ||
                master?.partNumber ||
                "";

            if (selectedPart !== "all") {
                const hasMatchingPart =
                    latestPart === selectedPart ||
                    machineProd.some((r) => r.partNumber === selectedPart);
                if (!hasMatchingPart) return false;
            }

            return true;
        }).map((name) => {
            const master = masterRecords.find((m) => m.machine === name);
            const machineProd = filteredProduction.filter((r) => r.machine === name);
            const machineDt = filteredDowntime.filter(
                (ev) => (ev.machine || ev.machineId) === name
            );

            const hasProdData = machineProd.length > 0;
            const actualOutput = hasProdData
                ? machineProd.reduce((sum, r) => sum + Number(r.output || 0), 0)
                : null;

            const latestProd = hasProdData ? machineProd[machineProd.length - 1] : null;
            const partNumber = latestProd?.partNumber || master?.partNumber || "Belum ada data";

            const matchedPic = shiftPicRecords.find((sp) => {
                const dateOk = !selectedDate || sp.date === selectedDate;
                const machineOk = sp.machine === name;
                const shiftOk = selectedShift === "all" || normalizeShiftKey(sp.shift) === selectedShift;
                return dateOk && machineOk && shiftOk;
            });

            const pic = matchedPic?.pic || latestProd?.pic || "Belum ada data";
            const rpm = master?.rpm ? Number(master.rpm) : null;

            const totalDtMinutes = machineDt.reduce(
                (sum, ev) => sum + getDowntimeMinutes(ev, now),
                0
            );

            const activeDt = machineDt.find((ev) => !getEndText(ev));

            const target =
                hasProdData && rpm && rpm > 0
                    ? rpm * EFFECTIVE_SHIFT_MINUTES
                    : null;

            const productivity =
                actualOutput !== null && target && target > 0
                    ? (actualOutput / target) * 100
                    : null;

            const efficiency =
                hasProdData || machineDt.length > 0
                    ? Math.max(
                          0,
                          ((EFFECTIVE_SHIFT_MINUTES - totalDtMinutes) / EFFECTIVE_SHIFT_MINUTES) * 100
                      )
                    : null;

            let statusKey = "unconfirmed";
            if (activeDt) {
                statusKey = "downtime";
            } else if (isToday && !inSchedule) {
                statusKey = "off_schedule";
            } else if (hasProdData) {
                statusKey = "running";
            }

            return {
                name,
                statusKey,
                hasProdData,
                actualOutput,
                target,
                productivity,
                efficiency,
                partNumber,
                pic,
                rpm,
                downtimeMinutes: machineDt.length > 0 ? totalDtMinutes : null,
                downtimeCount: machineDt.length,
                activeDowntimeCategory: activeDt?.category || null
            };
        });
    }, [
        selectedDate,
        selectedMachine,
        selectedShift,
        selectedPart,
        masterRecords,
        filteredProduction,
        filteredDowntime,
        shiftPicRecords
    ]);

    const kpi = useMemo(() => {
        const machinesWithOutput = machines.filter((m) => m.actualOutput !== null);
        const totalActual =
            machinesWithOutput.length > 0
                ? machinesWithOutput.reduce((sum, m) => sum + m.actualOutput, 0)
                : null;

        const machinesWithTarget = machines.filter((m) => m.target !== null);
        const totalTarget =
            machinesWithTarget.length > 0
                ? machinesWithTarget.reduce((sum, m) => sum + m.target, 0)
                : null;

        const productivity =
            totalActual !== null && totalTarget && totalTarget > 0
                ? (totalActual / totalTarget) * 100
                : null;

        const totalDt =
            filteredDowntime.length > 0
                ? filteredDowntime.reduce((sum, ev) => sum + getDowntimeMinutes(ev), 0)
                : null;

        const hasAnyActivity =
            filteredProduction.length > 0 || filteredDowntime.length > 0;

        const efficiency = hasAnyActivity
            ? Math.max(
                  0,
                  ((EFFECTIVE_SHIFT_MINUTES - (totalDt || 0)) / EFFECTIVE_SHIFT_MINUTES) * 100
              )
            : null;

        const runningCount = machines.filter((m) => m.statusKey === "running").length;
        const downtimeCount = machines.filter((m) => m.statusKey === "downtime").length;

        return {
            totalMachines: machines.length,
            runningCount,
            downtimeCount,
            totalActual,
            totalTarget,
            productivity,
            efficiency,
            totalDt
        };
    }, [machines, filteredProduction, filteredDowntime]);

    const trendHours = useMemo(() => {
        const hours = Array.from({ length: 17 }, (_, idx) => idx + 6); // 06:00 - 22:00
        return hours
            .filter((hour) => {
                if (selectedShift === "shift1") return hour >= 6 && hour < 15;
                if (selectedShift === "shift2") return hour >= 14 && hour < 23;
                return true;
            })
            .map((hour) => {
                const label = `${String(hour).padStart(2, "0")}:00`;
                const matching = filteredProduction.filter((rec) => {
                    if (!rec.startTime) return false;
                    const recHour = Number(String(rec.startTime).slice(0, 2));
                    return recHour === hour;
                });

                const hasData = matching.length > 0;
                const output = hasData
                    ? matching.reduce((sum, r) => sum + Number(r.output || 0), 0)
                    : null;

                const byMachineMap = new Map();
                matching.forEach((rec) => {
                    const mName = rec.machine || "-";
                    byMachineMap.set(mName, (byMachineMap.get(mName) || 0) + Number(rec.output || 0));
                });

                const breakdown = [...byMachineMap.entries()].map(([mName, mOutput]) => ({
                    machine: mName,
                    output: mOutput
                }));

                return {
                    hour: label,
                    hasData,
                    output,
                    recordCount: matching.length,
                    breakdown
                };
            });
    }, [filteredProduction, selectedShift]);

    const downtimeByCategory = useMemo(() => {
        const base = DOWNTIME_CATEGORIES.filter((c) => c.code !== 1).map((c) => ({
            code: c.code,
            name: c.name,
            count: 0,
            minutes: 0
        }));

        filteredDowntime.forEach((ev) => {
            const catText = String(ev.category ?? "").trim().toLowerCase();
            const found = base.find(
                (item) =>
                    item.name.toLowerCase() === catText ||
                    String(item.code) === String(ev.category)
            );
            const mins = getDowntimeMinutes(ev);

            if (found) {
                found.count += 1;
                found.minutes += mins;
            } else if (ev.category) {
                base.push({
                    code: `custom-${ev.category}`,
                    name: String(ev.category),
                    count: 1,
                    minutes: mins
                });
            }
        });

        return base.filter((item) => item.count > 0).sort((a, b) => b.minutes - a.minutes);
    }, [filteredDowntime]);

    const maxTrendValue = Math.max(
        ...trendHours.map((item) => (item.output !== null ? item.output : 0)),
        1
    );

    const selectedMachineData = machines.find((m) => m.name === activeMachine) || null;
    const selectedHourData = trendHours.find((item) => item.hour === activeHour) || null;

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <div className="header-title">
                    <div>
                        <span className="header-eyebrow">YAHATA FASTENER INDONESIA</span>
                        <h1>Production Monitoring</h1>
                        <p>Forming Area · Production Dashboard (14 Mesin)</p>
                    </div>
                </div>

                <div className="header-info">
                    <div>
                        <span className="connection-dot"></span>
                        <span>LocalStorage Mode</span>
                    </div>
                    <small>Data otomatis dari halaman operasional</small>
                </div>
            </header>

            <section className="dashboard-filter">
                <div className="filter-item">
                    <label htmlFor="filter-date">Tanggal</label>
                    <input
                        id="filter-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-shift">Shift</label>
                    <select
                        id="filter-shift"
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value)}
                    >
                        <option value="all">Semua Shift</option>
                        {SHIFTS.map((shift) => (
                            <option key={shift.key} value={shift.key}>
                                {shift.name} ({shift.schedule})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="filter-machine">Mesin</label>
                    <select
                        id="filter-machine"
                        value={selectedMachine}
                        onChange={(e) => setSelectedMachine(e.target.value)}
                    >
                        <option value="all">Semua Mesin (14)</option>
                        {MACHINES.map((machine) => (
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
                        onChange={(e) => setSelectedPart(e.target.value)}
                    >
                        <option value="all">Semua Part Number</option>
                        {partOptions.map((part) => (
                            <option key={part} value={part}>
                                {part}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    className="filter-reset"
                    onClick={() => {
                        setSelectedDate(getTodayKey());
                        setSelectedShift("all");
                        setSelectedMachine("all");
                        setSelectedPart("all");
                        setActiveHour(null);
                    }}
                >
                    Reset Filter
                </button>
            </section>

            <section className="kpi-container">
                <article className="kpi-card">
                    <span className="kpi-label">Total Mesin</span>
                    <strong>{kpi.totalMachines}</strong>
                    <small>
                        Running: {kpi.runningCount} · Downtime: {kpi.downtimeCount}
                    </small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Total Produksi</span>
                    <strong>{formatNumber(kpi.totalActual)}</strong>
                    <small>Pieces · berdasarkan input tercatat</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Target Produksi</span>
                    <strong>{formatNumber(kpi.totalTarget)}</strong>
                    <small>Estimasi berbasis RPM & 480 menit efektif</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Productivity</span>
                    <strong>{formatPercent(kpi.productivity)}</strong>
                    <small>Actual ÷ Target</small>
                </article>

                <article className="kpi-card">
                    <span className="kpi-label">Efficiency</span>
                    <strong>{formatPercent(kpi.efficiency)}</strong>
                    <small>
                        Efektif 480 mnt · DT: {formatDuration(kpi.totalDt)}
                    </small>
                </article>
            </section>

            <section className="content-grid">
                <article className="panel production-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Tren Produksi per Jam</h2>
                            <p>Klik kolom jam untuk melihat rincian per mesin</p>
                        </div>
                        <span className="panel-unit">PCS / HOUR</span>
                    </div>

                    <div className="trend-chart">
                        {trendHours.map((item) => {
                            const heightPercent =
                                item.hasData && item.output !== null
                                    ? (item.output / maxTrendValue) * 100
                                    : 0;

                            const hoverDetail = item.hasData
                                ? `${item.hour} · Total: ${formatNumber(item.output)} pcs (${item.breakdown
                                      .map((b) => `${b.machine}: ${formatNumber(b.output)}`)
                                      .join(", ")})`
                                : `${item.hour} · Belum ada data`;

                            return (
                                <div
                                    className={`trend-column ${activeHour === item.hour ? "selected" : ""}`}
                                    key={item.hour}
                                    title={hoverDetail}
                                    onClick={() =>
                                        setActiveHour(activeHour === item.hour ? null : item.hour)
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            setActiveHour(activeHour === item.hour ? null : item.hour);
                                        }
                                    }}
                                >
                                    <span className="trend-value">
                                        {item.hasData ? formatNumber(item.output) : "-"}
                                    </span>
                                    <div className="trend-bar-area">
                                        <div
                                            className="trend-bar"
                                            style={{
                                                height: `${heightPercent}%`,
                                                minHeight: item.hasData && item.output > 0 ? "4px" : "0"
                                            }}
                                        />
                                    </div>
                                    <span className="trend-hour">{item.hour}</span>
                                </div>
                            );
                        })}
                    </div>

                    {selectedHourData && (
                        <div className="helper-text">
                            <strong>Detail Jam {selectedHourData.hour}:</strong>{" "}
                            {selectedHourData.hasData
                                ? `${formatNumber(selectedHourData.output)} pcs (${selectedHourData.recordCount} input) — ${selectedHourData.breakdown
                                      .map((b) => `${b.machine}: ${formatNumber(b.output)} pcs`)
                                      .join(" · ")}`
                                : "Belum ada data produksi pada jam ini."}
                        </div>
                    )}

                    <p className="helper-text">
                        Jam yang belum memiliki data pencatatan ditampilkan sebagai
                        belum ada data (bukan dianggap hasil produksi nol).
                    </p>
                </article>

                <article className="panel downtime-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Downtime Overview</h2>
                            <p>Kategori 2–13 (handover 14:00–14:15 masuk Shift 1)</p>
                        </div>
                    </div>

                    <div className="downtime-total">
                        <span>Total Downtime</span>
                        <strong>{formatDuration(kpi.totalDt)}</strong>
                        <small>{filteredDowntime.length} kejadian tercatat</small>
                    </div>

                    {downtimeByCategory.length === 0 ? (
                        <div className="empty-state">Belum ada data downtime</div>
                    ) : (
                        <div className="downtime-list">
                            {downtimeByCategory.map((item) => (
                                <div className="downtime-item" key={item.name}>
                                    <div>
                                        <strong>{item.name}</strong>
                                        <small>{item.count} kejadian</small>
                                    </div>
                                    <span>{formatDuration(item.minutes)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </section>

            <section className="panel machine-monitoring">
                <div className="panel-header">
                    <div>
                        <h2>Performa & Status Mesin Forming</h2>
                        <p>Klik kartu mesin untuk melihat detail performa mesin</p>
                    </div>
                    <span className="machine-count">{machines.length} Mesin</span>
                </div>

                <div className="machine-legend">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <span key={key}>
                            <i style={{ background: STATUS_COLORS[key] }}></i>
                            {label}
                        </span>
                    ))}
                </div>

                <div className="machine-grid">
                    {machines.map((machine) => (
                        <button
                            type="button"
                            className={`machine-card ${activeMachine === machine.name ? "selected" : ""}`}
                            key={machine.name}
                            onClick={() =>
                                setActiveMachine(
                                    activeMachine === machine.name ? null : machine.name
                                )
                            }
                        >
                            <div className="machine-card-top">
                                <strong>{machine.name}</strong>
                                <span
                                    className="status-indicator"
                                    style={{ background: STATUS_COLORS[machine.statusKey] }}
                                ></span>
                            </div>

                            <span className="machine-status-text">
                                {STATUS_LABELS[machine.statusKey]}
                            </span>

                            <div className="machine-output">
                                <strong>
                                    {machine.actualOutput === null
                                        ? "Belum ada data"
                                        : formatNumber(machine.actualOutput)}
                                </strong>
                                {machine.actualOutput !== null && <small>PCS</small>}
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
                            <h2>Detail Performa · {selectedMachineData.name}</h2>
                            <p>Ringkasan data mesin pada filter terpilih</p>
                        </div>
                        <button
                            type="button"
                            className="detail-close"
                            onClick={() => setActiveMachine(null)}
                        >
                            Tutup ✕
                        </button>
                    </div>

                    <div className="detail-grid">
                        <div>
                            <span>Status Mesin</span>
                            <strong style={{ color: STATUS_COLORS[selectedMachineData.statusKey] }}>
                                {STATUS_LABELS[selectedMachineData.statusKey]}
                            </strong>
                        </div>
                        <div>
                            <span>Total Produksi</span>
                            <strong>
                                {selectedMachineData.actualOutput === null
                                    ? "Belum ada data"
                                    : `${formatNumber(selectedMachineData.actualOutput)} pcs`}
                            </strong>
                        </div>
                        <div>
                            <span>Target Produksi</span>
                            <strong>
                                {selectedMachineData.target === null
                                    ? "Belum ada data"
                                    : `${formatNumber(selectedMachineData.target)} pcs`}
                            </strong>
                        </div>
                        <div>
                            <span>Productivity</span>
                            <strong>{formatPercent(selectedMachineData.productivity)}</strong>
                        </div>
                        <div>
                            <span>Efficiency</span>
                            <strong>{formatPercent(selectedMachineData.efficiency)}</strong>
                        </div>
                        <div>
                            <span>Downtime</span>
                            <strong>{formatDuration(selectedMachineData.downtimeMinutes)}</strong>
                        </div>
                        <div>
                            <span>Part Number</span>
                            <strong>{selectedMachineData.partNumber}</strong>
                        </div>
                        <div>
                            <span>PIC</span>
                            <strong>{selectedMachineData.pic}</strong>
                        </div>
                        <div>
                            <span>RPM</span>
                            <strong>
                                {selectedMachineData.rpm !== null
                                    ? `${formatNumber(selectedMachineData.rpm)} RPM`
                                    : "Belum ada data"}
                            </strong>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}