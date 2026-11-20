import { useEffect, useRef } from "react";
import ChartJS from "chart.js/auto";

export const Kpi = ({ label, value, note }) => (
    <div className="kpi-card"><p>{label}</p><h2>{value}</h2><span>{note}</span></div>
);

export const Topbar = ({ title, subtitle, children }) => (
    <header className="topbar"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</header>
);

// message = { text, type: "success" | "error" | "" }
export const FormMessage = ({ message }) => (
    <p className={"form-message " + (message.type || "")}>{message.text}</p>
);

// Chart dibuat sekali, lalu hanya datanya yang diperbarui (tanpa animasi ulang).
export function Chart({ type, data, options }) {
    const canvas = useRef(null);
    const chart = useRef(null);
    useEffect(() => {
        chart.current = new ChartJS(canvas.current, { type, data, options });
        return () => chart.current.destroy();
    }, []); // ponytail: type & options tetap per pemakaian
    useEffect(() => {
        chart.current.data = data;
        chart.current.update("none");
    }, [data]);
    return <canvas ref={canvas} />;
}
