
import { useState } from "react";

import Dashboard from "./pages/Dashboard.jsx";
import Production from "./pages/Production.jsx";
import MasterProduction from "./pages/MasterProduction.jsx";
import Downtime from "./pages/Downtime.jsx";
import ShiftPic from "./pages/ShiftPic.jsx";
import Reports from "./pages/Reports.jsx";

const MENU = [
    {
        key: "dashboard",
        label: "Dashboard",
        icon: "▦",
        Component: Dashboard,
    },
    {
        key: "production",
        label: "Production",
        icon: "▤",
        Component: Production,
    },
    {
        key: "master-production",
        label: "Master Production",
        icon: "⚙",
        Component: MasterProduction,
    },
    {
        key: "downtime",
        label: "Downtime",
        icon: "◷",
        Component: Downtime,
    },
    {
        key: "shift",
        label: "Shift & PIC",
        icon: "♙",
        Component: ShiftPic,
    },
    {
        key: "reports",
        label: "Reports",
        icon: "▥",
        Component: Reports,
    },
];

export default function App() {
    const [activePage, setActivePage] = useState("dashboard");

    const currentMenu = MENU.find(
        (item) => item.key === activePage
    );

    const ActiveComponent = currentMenu.Component;

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="brand-logo">Y</div>

                    <div>
                        <h2>YAHATA</h2>
                        <p>Production System</p>
                    </div>
                </div>

                <div className="sidebar-section">
                    <span className="sidebar-label">
                        MAIN MENU
                    </span>

                    <nav className="sidebar-nav">
                        {MENU.map((item) => (
                            <button
                                key={item.key}
                                className={`nav-item ${
                                    activePage === item.key
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => setActivePage(item.key)}
                            >
                                <span className="nav-icon">
                                    {item.icon}
                                </span>

                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="sidebar-footer">
                    <div className="sidebar-footer-dot"></div>

                    <div>
                        <strong>Forming Area</strong>
                        <span>14 Machines</span>
                    </div>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div>
                        <span className="topbar-label">
                            YAHATA PRODUCTION SYSTEM
                        </span>

                        <h3>{currentMenu.label}</h3>
                    </div>

                    <div className="topbar-right">
                        <span className="system-status">
                            <span className="status-dot"></span>
                            Demo Mode
                        </span>

                        <div className="user-profile">
                            <div className="user-avatar">PIC</div>

                            <div>
                                <strong>Production Team</strong>
                                <span>Forming Area</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-content">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
}
