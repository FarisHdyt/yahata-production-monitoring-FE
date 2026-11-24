import { useMemo, useState } from "react";

// Data acuan bulanan (Jul, Aug, Sep 2026) & breakdown dari file Excel Daily Production Report Forming
const DEFAULT_MONTHLY_METRICS = [
  {
    id: 1, machine: "NF-19B", targetQty: 1215900, actualQty: 596963, productivity: 49.1, occupancy: 37.88, oa: 64.12,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 78.97, productivity: 78.97, oa: 82.4 },
      { month: "Aug 2026", occupancy: 64.06, productivity: 64.06, oa: 74.1 },
      { month: "Sep 2026", occupancy: 37.88, productivity: 49.1, oa: 64.12 },
    ],
    breakdown: { 1: 37.88, 2: 3.94, 3: 0.61, 4: 12.73, 5: 0.0, 6: 4.24, 7: 0.61, 8: 6.06, 9: 23.03, 10: 3.94, 11: 0.0, 12: 0.0, 13: 6.97 },
  },
  {
    id: 2, machine: "CBP-136", targetQty: 1003200, actualQty: 657520, productivity: 65.54, occupancy: 45.3, oa: 65.71,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 48.47, productivity: 58.2, oa: 68.0 },
      { month: "Aug 2026", occupancy: 68.29, productivity: 74.5, oa: 76.4 },
      { month: "Sep 2026", occupancy: 45.3, productivity: 65.54, oa: 65.71 },
    ],
    breakdown: { 1: 45.3, 2: 4.97, 3: 4.42, 4: 14.64, 5: 2.21, 6: 2.21, 7: 1.1, 8: 9.39, 9: 15.75, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 3, machine: "BP-450", targetQty: 99000, actualQty: 56595, productivity: 57.17, occupancy: 4.3, oa: 57.17,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 77.08, productivity: 77.08, oa: 77.08 },
      { month: "Aug 2026", occupancy: 45.83, productivity: 45.83, oa: 45.83 },
      { month: "Sep 2026", occupancy: 4.3, productivity: 57.17, oa: 57.17 },
    ],
    breakdown: { 1: 4.3, 2: 1.08, 3: 0.27, 4: 1.34, 5: 0.0, 6: 0.0, 7: 0.81, 8: 0.54, 9: 45.97, 10: 0.0, 11: 0.0, 12: 0.0, 13: 45.7 },
  },
  {
    id: 4, machine: "CBP-105", targetQty: 1021800, actualQty: 657530, productivity: 64.35, occupancy: 53.8, oa: 64.35,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 63.97, productivity: 68.1, oa: 70.2 },
      { month: "Aug 2026", occupancy: 71.89, productivity: 76.4, oa: 78.5 },
      { month: "Sep 2026", occupancy: 53.8, productivity: 64.35, oa: 64.35 },
    ],
    breakdown: { 1: 53.8, 2: 7.6, 3: 2.34, 4: 13.45, 5: 0.88, 6: 7.6, 7: 0.0, 8: 3.8, 9: 10.53, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 5, machine: "CBP-106", targetQty: 822000, actualQty: 508560, productivity: 61.87, occupancy: 41.13, oa: 61.87,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 77.2, productivity: 77.2, oa: 77.2 },
      { month: "Aug 2026", occupancy: 78.98, productivity: 78.98, oa: 78.98 },
      { month: "Sep 2026", occupancy: 41.13, productivity: 61.87, oa: 61.87 },
    ],
    breakdown: { 1: 41.13, 2: 5.07, 3: 1.97, 4: 13.8, 5: 0.0, 6: 1.97, 7: 0.56, 8: 6.48, 9: 29.01, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 6, machine: "NP-12", targetQty: 681000, actualQty: 579879, productivity: 85.15, occupancy: 44.5, oa: 85.15,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 97.11, productivity: 97.11, oa: 97.11 },
      { month: "Aug 2026", occupancy: 86.03, productivity: 86.03, oa: 86.03 },
      { month: "Sep 2026", occupancy: 44.5, productivity: 85.15, oa: 85.15 },
    ],
    breakdown: { 1: 44.5, 2: 2.14, 3: 1.34, 4: 12.6, 5: 0.0, 6: 0.8, 7: 0.27, 8: 1.88, 9: 36.46, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 7, machine: "ZH-30200", targetQty: 4500, actualQty: 2800, productivity: 62.22, occupancy: 1.24, oa: 23.33,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 77.78, productivity: 77.78, oa: 77.78 },
      { month: "Aug 2026", occupancy: 50.0, productivity: 50.0, oa: 50.0 },
      { month: "Sep 2026", occupancy: 1.24, productivity: 62.22, oa: 23.33 },
    ],
    breakdown: { 1: 1.24, 2: 0.55, 3: 0.28, 4: 0.28, 5: 0.0, 6: 0.0, 7: 0.0, 8: 0.0, 9: 11.85, 10: 0.0, 11: 0.0, 12: 0.0, 13: 85.81 },
  },
  {
    id: 8, machine: "PF-860", targetQty: 33000, actualQty: 27800, productivity: 84.24, occupancy: 2.41, oa: 84.24,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 0.0, productivity: 0.0, oa: 0.0 },
      { month: "Aug 2026", occupancy: 0.0, productivity: 0.0, oa: 0.0 },
      { month: "Sep 2026", occupancy: 2.41, productivity: 84.24, oa: 84.24 },
    ],
    breakdown: { 1: 2.41, 2: 0.8, 3: 0.27, 4: 0.27, 5: 0.0, 6: 0.27, 7: 0.0, 8: 0.0, 9: 4.55, 10: 0.0, 11: 0.0, 12: 0.0, 13: 91.44 },
  },
  {
    id: 9, machine: "YH-1552", targetQty: 696000, actualQty: 589665, productivity: 84.72, occupancy: 22.73, oa: 87.01,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 88.33, productivity: 88.33, oa: 89.0 },
      { month: "Aug 2026", occupancy: 83.19, productivity: 83.19, oa: 85.4 },
      { month: "Sep 2026", occupancy: 22.73, productivity: 84.72, oa: 87.01 },
    ],
    breakdown: { 1: 22.73, 2: 0.53, 3: 0.27, 4: 3.48, 5: 0.27, 6: 0.0, 7: 3.48, 8: 0.27, 9: 7.75, 10: 0.0, 11: 0.0, 12: 0.0, 13: 61.23 },
  },
  {
    id: 10, machine: "HBF-823", targetQty: 1328400, actualQty: 800043, productivity: 60.23, occupancy: 56.07, oa: 60.23,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 59.0, productivity: 59.0, oa: 59.0 },
      { month: "Aug 2026", occupancy: 62.77, productivity: 62.77, oa: 62.77 },
      { month: "Sep 2026", occupancy: 56.07, productivity: 60.23, oa: 60.23 },
    ],
    breakdown: { 1: 56.07, 2: 4.67, 3: 1.87, 4: 14.33, 5: 0.0, 6: 1.56, 7: 0.93, 8: 3.43, 9: 17.13, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 11, machine: "HBF-823 NEW", targetQty: 1435200, actualQty: 1295900, productivity: 90.29, occupancy: 62.63, oa: 86.78,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 88.09, productivity: 88.09, oa: 88.09 },
      { month: "Aug 2026", occupancy: 94.37, productivity: 94.37, oa: 94.37 },
      { month: "Sep 2026", occupancy: 62.63, productivity: 90.29, oa: 86.78 },
    ],
    breakdown: { 1: 62.63, 2: 5.91, 3: 1.34, 4: 13.71, 5: 0.0, 6: 0.81, 7: 1.61, 8: 3.76, 9: 10.22, 10: 0.0, 11: 0.0, 12: 0.0, 13: 0.0 },
  },
  {
    id: 12, machine: "HM-552", targetQty: 0, actualQty: 0, productivity: 0.0, occupancy: 0.0, oa: 0.0,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 14.42, productivity: 14.42, oa: 14.42 },
      { month: "Aug 2026", occupancy: 0.0, productivity: 0.0, oa: 0.0 },
      { month: "Sep 2026", occupancy: 0.0, productivity: 0.0, oa: 0.0 },
    ],
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 100 },
  },
  {
    id: 13, machine: "HM-676", targetQty: 724800, actualQty: 658100, productivity: 90.8, occupancy: 26.74, oa: 75.04,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 96.81, productivity: 96.81, oa: 96.81 },
      { month: "Aug 2026", occupancy: 91.04, productivity: 91.04, oa: 91.04 },
      { month: "Sep 2026", occupancy: 26.74, productivity: 90.8, oa: 75.04 },
    ],
    breakdown: { 1: 26.74, 2: 1.6, 3: 0.53, 4: 5.61, 5: 0.0, 6: 1.6, 7: 0.27, 8: 2.14, 9: 9.09, 10: 0.0, 11: 0.0, 12: 0.0, 13: 52.41 },
  },
  {
    id: 14, machine: "YDP-136", targetQty: 636900, actualQty: 562640, productivity: 88.34, occupancy: 40.27, oa: 88.53,
    monthlyTrend: [
      { month: "Jul 2026", occupancy: 61.54, productivity: 61.54, oa: 61.54 },
      { month: "Aug 2026", occupancy: 94.67, productivity: 94.67, oa: 94.67 },
      { month: "Sep 2026", occupancy: 40.27, productivity: 88.34, oa: 88.53 },
    ],
    breakdown: { 1: 40.27, 2: 1.89, 3: 0.54, 4: 11.62, 5: 0.0, 6: 2.7, 7: 0.27, 8: 1.62, 9: 17.57, 10: 0.0, 11: 0.0, 12: 0.0, 13: 23.51 },
  },
];

const ACTIVITY_CODES = [
  { code: 1, name: "① Running Production" },
  { code: 2, name: "② Dandori (Lepas & Pasang Tooling)" },
  { code: 3, name: "③ Dandori (Setting & Adjustment)" },
  { code: 4, name: "④ QC Check (Inspection Part)" },
  { code: 5, name: "⑤ Trouble Machine" },
  { code: 6, name: "⑥ Trouble Tooling" },
  { code: 7, name: "⑦ Ganti Tooling (Saat Running)" },
  { code: 8, name: "⑧ Ganti Material (Saat Running)" },
  { code: 9, name: "⑨ Mesin STOP" },
  { code: 10, name: "⑩ Delay Material" },
  { code: 11, name: "⑪ Delay Tooling" },
  { code: 12, name: "⑫ Delay Job Order" },
  { code: 13, name: "⑬ No Plan" },
];

function formatNum(val) {
  return Number(val || 0).toLocaleString("id-ID");
}

function getDtMinutes(item) {
  if (!item?.startAt) return 0;
  const start = new Date(item.startAt).getTime();
  const end = item.endAt ? new Date(item.endAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 60000));
}

function pillButtonStyle(active) {
  return {
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    border: active ? "1px solid #0f2c59" : "1px solid #cbd5e1",
    background: active ? "#0f2c59" : "#ffffff",
    color: active ? "#ffffff" : "#334155",
    transition: "all 0.15s ease",
  };
}

export default function FormingAnalyticsDashboard({
  machineFilter = "all",
  productionRecords = [],
  downtimeRecords = [],
  masters = [],
}) {
  const [targetPct, setTargetPct] = useState(80);
  const [metricView, setMetricView] = useState("oa"); // "occupancy" | "productivity" | "oa"
  const [chartMode, setChartMode] = useState("per_machine"); // "per_machine" | "monthly_trend"
  const [selectedMachineForTrend, setSelectedMachineForTrend] = useState("NF-19B");
  const [subTab, setSubTab] = useState("chart"); // "chart" | "summary" | "breakdown"

  const rows = useMemo(() => {
    return DEFAULT_MONTHLY_METRICS.map((item) => {
      const master = masters.find((m) => m.machine === item.machine);
      const rpm = Number(master?.rpm || 0);
      const pcsPerRev = Math.max(1, Number(master?.pcsPerRev || 1));
      const ctMinutes = rpm > 0 ? 1 / (rpm * pcsPerRev) : 0;

      const prodForMachine = productionRecords.filter((p) => p.machine === item.machine);
      const extraOutput = prodForMachine.reduce((sum, p) => sum + Number(p.output || 0), 0);

      const dtForMachine = downtimeRecords.filter((d) => d.machine === item.machine);
      const extraDtMinutes = dtForMachine.reduce((sum, d) => sum + getDtMinutes(d), 0);

      const actualQty = item.actualQty + extraOutput;
      const targetQty = item.targetQty;
      const productivity =
        targetQty > 0
          ? Number(((actualQty / targetQty) * 100).toFixed(2))
          : item.productivity;

      let oa = item.oa;
      if (extraOutput > 0 && ctMinutes > 0) {
        const estimatedProdMinutes = Math.max(1, extraOutput * ctMinutes + extraDtMinutes);
        const computedOa = Math.min(100, ((extraOutput * ctMinutes) / estimatedProdMinutes) * 100);
        oa = Number(((item.oa + computedOa) / 2).toFixed(2));
      }

      const monthMinutes = 22 * 480;
      const dtReductionPct = extraDtMinutes > 0 ? (extraDtMinutes / monthMinutes) * 100 : 0;
      const occupancy = Math.max(0, Number((item.occupancy - dtReductionPct).toFixed(2)));

      const updatedTrend = item.monthlyTrend.map((mPoint, idx) => {
        if (idx !== item.monthlyTrend.length - 1) return mPoint;
        return {
          ...mPoint,
          occupancy,
          productivity,
          oa,
        };
      });

      return {
        ...item,
        partNumber: master?.partNumber || "-",
        rpm,
        ctMinutes: ctMinutes > 0 ? ctMinutes.toFixed(5) : "-",
        actualQty,
        targetQty,
        productivity,
        oa,
        occupancy,
        monthlyTrend: updatedTrend,
        shortName: item.machine,
      };
    }).filter((row) => machineFilter === "all" || row.machine === machineFilter);
  }, [machineFilter, productionRecords, downtimeRecords, masters]);

  const activeTrendMachine = useMemo(() => {
    const targetName = machineFilter !== "all" ? machineFilter : selectedMachineForTrend;
    return rows.find((r) => r.machine === targetName) || rows[0] || DEFAULT_MONTHLY_METRICS[0];
  }, [rows, machineFilter, selectedMachineForTrend]);

  const barsToRender = useMemo(() => {
    if (chartMode === "monthly_trend") {
      return (activeTrendMachine?.monthlyTrend || []).map((pt, i) => ({
        key: `${activeTrendMachine.machine}-${pt.month}-${i}`,
        label: pt.month,
        value: Number(pt[metricView] || 0),
      }));
    }
    return rows.map((row) => ({
      key: row.id,
      label: row.shortName,
      value: Number(row[metricView] || 0),
    }));
  }, [chartMode, activeTrendMachine, rows, metricView]);

  const topPad = 24;
  const chartHeight = 220;
  const isTrend = chartMode === "monthly_trend";
  const barWidth = isTrend ? 72 : 38;
  const gap = isTrend ? 36 : 16;
  const leftPad = 44;
  const svgWidth = Math.max(540, leftPad + barsToRender.length * (barWidth + gap) + 28);
  const clampedTarget = Math.min(100, Math.max(0, targetPct));
  const targetY = topPad + chartHeight - (clampedTarget / 100) * chartHeight;

  return (
    <section className="rp-panel" style={{ marginBottom: "20px" }}>
      <div className="rp-panel-heading">
        <div>
          <h2>Forming Monthly KPI, OA & Occupancy Rate</h2>
          <p>
            Operating Availability (OA), Productivity per bulan, Breakdown Occupancy (%), dan grafik target {targetPct}% per mesin.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#334155",
              background: "#f8fafc",
              padding: "5px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          >
            Target Forming (%):
            <input
              type="number"
              min="1"
              max="100"
              value={targetPct}
              onChange={(e) => setTargetPct(Number(e.target.value) || 80)}
              style={{
                width: "56px",
                padding: "3px 6px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontWeight: 700,
                color: "#0f2c59",
                background: "#ffffff",
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setSubTab("chart")}
            style={pillButtonStyle(subTab === "chart")}
          >
            Grafik Target {targetPct}%
          </button>
          <button
            type="button"
            onClick={() => setSubTab("summary")}
            style={pillButtonStyle(subTab === "summary")}
          >
            OA & Productivity
          </button>
          <button
            type="button"
            onClick={() => setSubTab("breakdown")}
            style={pillButtonStyle(subTab === "breakdown")}
          >
            Breakdown (%)
          </button>
        </div>
      </div>

      {subTab === "chart" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "14px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMetricView("occupancy")}
                style={pillButtonStyle(metricView === "occupancy")}
              >
                Occupancy Rate (Running %)
              </button>
              <button
                type="button"
                onClick={() => setMetricView("productivity")}
                style={pillButtonStyle(metricView === "productivity")}
              >
                Productivity (%)
              </button>
              <button
                type="button"
                onClick={() => setMetricView("oa")}
                style={pillButtonStyle(metricView === "oa")}
              >
                Operating Availability (OA %)
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setChartMode("per_machine")}
                style={pillButtonStyle(chartMode === "per_machine")}
              >
                Semua Mesin
              </button>
              <button
                type="button"
                onClick={() => setChartMode("monthly_trend")}
                style={pillButtonStyle(chartMode === "monthly_trend")}
              >
                Tren Bulanan per Mesin
              </button>

              {chartMode === "monthly_trend" && machineFilter === "all" && (
                <select
                  value={selectedMachineForTrend}
                  onChange={(e) => setSelectedMachineForTrend(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#0f2c59",
                    background: "#ffffff",
                  }}
                >
                  {DEFAULT_MONTHLY_METRICS.map((m) => (
                    <option key={m.id} value={m.machine}>
                      {m.machine}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {chartMode === "monthly_trend" && (
            <div style={{ marginBottom: "8px", fontSize: "12.5px", color: "#475569", fontWeight: 600 }}>
              Tren Bulanan Mesin: <span style={{ color: "#0f2c59" }}>{activeTrendMachine?.machine}</span> (Target {targetPct}%)
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <svg
              width={svgWidth}
              height={topPad + chartHeight + 38}
              role="img"
              aria-label="Grafik performa mesin terhadap target"
            >
              {[0, 20, 40, 60, 80, 100].map((tick) => {
                const y = topPad + chartHeight - (tick / 100) * chartHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={leftPad}
                      y1={y}
                      x2={svgWidth - 12}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={leftPad - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight="500"
                      fill="#64748b"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {barsToRender.map((bar, index) => {
                const value = Number(bar.value || 0);
                const clamped = Math.min(100, Math.max(0, value));
                const barH = (clamped / 100) * chartHeight;
                const x = leftPad + 14 + index * (barWidth + gap);
                const y = topPad + chartHeight - barH;
                const isMet = value >= targetPct;

                return (
                  <g key={bar.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      rx="4"
                      fill={isMet ? "#16a34a" : "#0f2c59"}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(12, y - 5)}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="600"
                      fill="#1e293b"
                    >
                      {value.toFixed(1)}%
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={topPad + chartHeight + 18}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="500"
                      fill="#334155"
                    >
                      {bar.label}
                    </text>
                  </g>
                );
              })}

              <line
                x1={leftPad}
                y1={targetY}
                x2={svgWidth - 12}
                y2={targetY}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text
                x={svgWidth - 16}
                y={Math.max(12, targetY - 6)}
                textAnchor="end"
                fontSize="11.5"
                fontWeight="700"
                fill="#dc2626"
              >
                Target {targetPct}%
              </text>
            </svg>
          </div>
        </div>
      )}

      {subTab === "summary" && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>PART AKTIF</th>
                <th>CT (MIN)</th>
                <th>TARGET OUTPUT</th>
                <th>ACTUAL OUTPUT</th>
                <th>BALANCED</th>
                <th>% PRODUCTIVITY</th>
                <th>OPERATING AVAILABILITY (OA)</th>
                <th>OCCUPANCY (RUNNING %)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.machine}</strong></td>
                  <td>{row.partNumber}</td>
                  <td>{row.ctMinutes}</td>
                  <td>{formatNum(row.targetQty)} pcs</td>
                  <td><strong>{formatNum(row.actualQty)} pcs</strong></td>
                  <td>{formatNum(row.targetQty - row.actualQty)} pcs</td>
                  <td><strong>{row.productivity.toFixed(2)}%</strong></td>
                  <td><strong>{row.oa.toFixed(2)}%</strong></td>
                  <td>{row.occupancy.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "breakdown" && (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>KODE AKTIVITAS</th>
                {rows.map((row) => (
                  <th key={row.id}>{row.shortName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_CODES.map((act) => (
                <tr key={act.code}>
                  <td><strong>{act.name}</strong></td>
                  {rows.map((row) => {
                    const pct = Number(row.breakdown?.[act.code] || 0);
                    return <td key={row.id}>{pct > 0 ? `${pct.toFixed(1)}%` : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}