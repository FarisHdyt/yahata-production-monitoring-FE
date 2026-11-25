import { useState } from "react";
import { apiRequest, storeSession } from "../api";

const ROLE_AREAS = {
  admin: "Production Admin",
  operator: "Line Forming",
  produksi: "Line Forming A",
  pic_forming: "Line Forming B",
  supervisor: "Monitoring Produksi",
};

function resolveSessionArea(role) {
  return ROLE_AREAS[role] || (role === "admin" ? "Production Admin" : "Forming Area");
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 5.09A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a17.87 17.87 0 0 1-4.16 5.19M6.61 6.61A17.85 17.85 0 0 0 2 12s3.5 8 10 8a10.94 10.94 0 0 0 4.12-.79"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage({ onLogin, onLoginSuccess, yahataLogo }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username/NIK dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const payload = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = payload?.data || payload || {};
      const apiUser = data.user || {};
      const role = apiUser.role || "operator";

      const sessionData = storeSession({
        user: apiUser.name || apiUser.username || username.trim(),
        username: apiUser.username || username.trim(),
        name: apiUser.name || apiUser.username || username.trim(),
        nik: apiUser.nik || "",
        role,
        area: resolveSessionArea(role),
        token: data.token,
        tokenType: data.tokenType || "Bearer",
        expiresAt: data.expiresAt || null,
        loggedInAt: new Date().toISOString(),
      });

      const callback = onLoginSuccess || onLogin;
      if (callback) callback(sessionData);
    } catch (err) {
      setErrorMsg(err?.message || "Login gagal. Periksa username/password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8f9fa",
        padding: "24px",
        color: "#111111",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          border: "1px solid #d4d4d4",
          borderRadius: "12px",
          padding: "28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          {yahataLogo && (
            <img
              src={yahataLogo}
              alt="Yahata Logo"
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#525252",
              }}
            >
              PT YAHATA FASTENER INDONESIA
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: "18px", color: "#111111" }}>
              Production System Login
            </h2>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: "14px",
              padding: "10px 12px",
              borderRadius: "8px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #111111",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#111111",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Username / NIK
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: pic.forming atau 12345"
              autoComplete="username"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #a3a3a3",
                fontSize: "13.5px",
                color: "#111111",
                backgroundColor: "#ffffff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Password
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #a3a3a3",
                  fontSize: "13.5px",
                  color: "#111111",
                  backgroundColor: "#ffffff",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "#525252",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #111111",
              backgroundColor: loading ? "#525252" : "#111111",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Memproses..." : "Masuk ke Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
