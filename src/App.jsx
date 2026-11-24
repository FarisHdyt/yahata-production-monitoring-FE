import { useRef, useState } from "react";
import "./bw-theme.css";

import LoginPage from "./components/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Production from "./pages/Production.jsx";
import MasterProduction from "./pages/MasterProduction.jsx";
import Downtime from "./pages/Downtime.jsx";
import ShiftPic from "./pages/ShiftPic.jsx";
import Reports from "./pages/Reports.jsx";

import yahataLogo from "./assets/yahata-logo.png";

const AUTH_STORAGE_KEY = "yahataAuthSession";

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
    const [session, setSession] = useState(loadSession);
    const [activePage, setActivePage] = useState("dashboard");
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const closeTimerRef = useRef(null);

    const handleLoginSuccess = (newSession) => {
        setSession(newSession);
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
        } catch {
            // abaikan jika storage diblokir
        }
    };

    const handleLogout = () => {
        setSession(null);
        try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {
            // abaikan jika storage diblokir
        }
    };

    if (!session) {
        return (
            <LoginPage
                onLoginSuccess={handleLoginSuccess}
                yahataLogo={yahataLogo}
            />
        );
    }

    const currentMenu = MENU.find(
        (item) => item.key === activePage
    );

    const ActiveComponent = currentMenu.Component;

    const handleOpenSidebar = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setSidebarExpanded(true);
    };

    const handleScheduleCloseSidebar = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = setTimeout(() => {
            setSidebarExpanded(false);
        }, 120);
    };

    const avatarInitial = (session.user || "S").trim().charAt(0).toUpperCase();

    return (
        <div
            className={`app-shell ${
                sidebarExpanded ? "sidebar-expanded" : "sidebar-compact"
            }`}
        >
            <aside
                className={`sidebar ${
                    sidebarExpanded ? "expanded" : "compact"
                }`}
                onMouseEnter={handleOpenSidebar}
                onMouseLeave={handleScheduleCloseSidebar}
            >
                <div className="sidebar-brand">
                    <img
                        src={yahataLogo}
                        alt="Yahata Logo"
                        className="brand-logo"
                    />

                    <div className="sidebar-text">
                        <h2>YAHATA</h2>
                        <p>Production System</p>
                    </div>
                </div>

                <div className="sidebar-section">
                    <span className="sidebar-label sidebar-text">
                        MAIN MENU
                    </span>

                    <nav className="sidebar-nav">
                        {MENU.map((item) => (
                            <button
                                key={item.key}
                                title={item.label}
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

                                <span className="sidebar-text">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="sidebar-bottom">
                    <div className="sidebar-user-box">
                        <div className="sidebar-user-avatar" title={session.user || "User"}>
                            {avatarInitial}
                        </div>
                        <div className="sidebar-user-meta sidebar-text">
                            <strong>{session.user || "Production Team"}</strong>
                            <span>{session.role || "Forming Area"}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Keluar"
                        className="sidebar-logout-link"
                    >
                        <span className="sidebar-logout-icon">→|</span>
                        <span className="sidebar-text">Keluar</span>
                    </button>
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
                            LocalStorage Mode
                        </span>

                        <div className="user-profile">
                            <div className="user-avatar">
                                {(session.user || "PIC").slice(0, 3).toUpperCase()}
                            </div>

                            <div>
                                <strong>{session.user || "Production Team"}</strong>
                                <span>{session.role || "Forming Area"}</span>
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