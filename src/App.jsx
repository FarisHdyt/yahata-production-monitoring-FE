import { useEffect, useRef, useState } from "react";
import "./bw-theme.css";

import LoginPage from "./components/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Production from "./pages/Production.jsx";
import MasterProduction from "./pages/MasterProduction.jsx";
import Downtime from "./pages/Downtime.jsx";
import ShiftPic from "./pages/ShiftPic.jsx";
import Reports from "./pages/Reports.jsx";
import { apiRequest, clearStoredSession, getStoredSession, loginSso, storeSession } from "./api.js"; // <-- UBAH (tambah loginSso)

import yahataLogo from "./assets/yahata-logo.png";

const AUTH_STORAGE_KEY = "yahataAuthSession";

// ---------- SSO Superapps YFI ---------- // <-- BARU (seluruh blok sampai ssoResult)
// Tiket dibaca SEKALI saat halaman /sso dibuka, lalu dihapus dari alamat (tidak tersisa di riwayat browser).
// Dikirim di sini (di luar komponen), bukan di useEffect, karena StrictMode menjalankan useEffect 2x
// sedangkan tiket hanya bisa dipakai sekali.
function readSsoTicket() {
    if (typeof window === "undefined" || window.location.pathname !== "/sso") return null;

    let ticket = "";
    try {
        ticket = decodeURIComponent(window.location.hash.match(/tiket=([^&]+)/)?.[1] ?? "");
    } catch {
        ticket = "";
    }

    window.history.replaceState(null, "", "/");
    return ticket;
}

const ssoTicket = readSsoTicket();
const ssoResult = ssoTicket === null
    ? Promise.resolve({ ok: true })
    : ssoTicket
        ? loginSso(ssoTicket).then(
            () => ({ ok: true }),
            (err) => ({
                ok: false,
                message: err?.status
                    ? err.message
                    : "Server tidak dapat dihubungi. Coba lagi, atau login dengan username dan password.",
            })
        )
        : Promise.resolve({ ok: false, message: "Tiket masuk tidak ditemukan. Buka lagi dari Superapps." });

function loadSession() {
  try {
    const stored = getStoredSession();
    if (stored?.token && stored?.user) return stored;
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Require backend token for synchronized mode; legacy local mock sessions must re-login.
    if (parsed?.token && parsed?.user) return parsed;
    return null;
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
    const [authChecking, setAuthChecking] = useState(true);
    const [ssoError, setSsoError] = useState(""); // <-- BARU
    const [activePage, setActivePage] = useState("dashboard");
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        const handleAuthExpired = () => {
            setSession(null);
            setAuthChecking(false);
            localStorage.removeItem(AUTH_STORAGE_KEY);
        };

        window.addEventListener("yahata:auth-expired", handleAuthExpired);

        const checkSession = () => { // <-- UBAH (logika lama dibungkus fungsi ini)
        const storedSession = loadSession();
        if (!storedSession?.token) {
            setSession(null);
            setAuthChecking(false);
        } else {
            const expiresAt = Date.parse(storedSession.expiresAt);
            if (storedSession.expiresAt && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
                clearStoredSession();
                localStorage.removeItem(AUTH_STORAGE_KEY);
                setSession(null);
                setAuthChecking(false);
            } else {
                apiRequest("/auth/me")
                    .then((payload) => {
                        if (cancelled) return;
                        const user = payload?.data || payload || {};
                        const normalized = storeSession({
                            ...storedSession,
                            user: user.name || user.username || storedSession.user,
                            username: user.username || storedSession.username,
                            name: user.name || storedSession.name,
                            nik: user.nik || "",
                            role: user.role || storedSession.role,
                            area: user.role === "admin" ? "Production Admin" : (storedSession.area || "Production Area"),
                            permissions: user.permissions || storedSession.permissions,
                        });
                        setSession(normalized || storedSession);
                    })
                    .catch((err) => {
                        if (cancelled) return;
                        // Hanya logout jika server menolak token (401, sudah ditangani handler "auth-expired").
                        // Jika backend mati/lambat/error sementara, sesi tetap dipakai (jangan paksa login ulang).
                        if (err?.status === 401) {
                            clearStoredSession();
                            localStorage.removeItem(AUTH_STORAGE_KEY);
                            setSession(null);
                        } else {
                            setSession(storedSession);
                        }
                    })
                    .finally(() => {
                        if (!cancelled) setAuthChecking(false);
                    });
            }
        }
        };

        // Tunggu hasil SSO (jika halaman /sso) sebelum memeriksa sesi tersimpan. // <-- BARU
        ssoResult.then((result) => {
            if (cancelled) return;
            if (!result.ok) setSsoError(result.message);
            checkSession();
        });

        return () => {
            cancelled = true;
            window.removeEventListener("yahata:auth-expired", handleAuthExpired);
        };
    }, []);

    const handleLoginSuccess = (newSession) => {
        const normalized = storeSession(newSession) || newSession;
        setSession(normalized);
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
            // abaikan jika storage diblokir
        }
    };

    const handleLogout = async () => {
        try {
            await apiRequest("/auth/logout", { method: "POST" });
        } catch {
            // abaikan error logout; sesi lokal tetap dibersihkan
        }
        setSession(null);
        try {
            clearStoredSession();
            localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {
            // abaikan jika storage diblokir
        }
    };

    if (authChecking) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                    color: "#525252",
                    fontSize: "13px",
                    fontWeight: 700,
                }}
            >
                Memeriksa sesi login...
            </div>
        );
    }

    if (!session) {
        return (
            <LoginPage
                initialError={ssoError} // <-- BARU
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
                            Live Backend
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