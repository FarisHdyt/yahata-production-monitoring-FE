import { useState } from "react";

export default function LoginPage({ onLoginSuccess, yahataLogo }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleLabel, setRoleLabel] = useState("Production Team");
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
      // Nanti jika backend Laravel sudah siap, ganti blok ini dengan fetch ke /api/login:
      // const res = await fetch(`${API_BASE_URL}/api/login`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username, password }),
      // });
      // const data = await res.json();
      // if (!res.ok) throw new Error(data.message || "Login gagal");

      const sessionData = {
        user: username.trim(),
        role: roleLabel,
        area: "Forming Area",
        token: `local-session-${Date.now()}`,
        loggedInAt: new Date().toISOString(),
      };

      onLoginSuccess(sessionData);
    } catch (err) {
      setErrorMsg(err.message || "Terjadi kesalahan saat login.");
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              autoComplete="current-password"
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
            Role / Bagian
            <select
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #a3a3a3",
                fontSize: "13.5px",
                color: "#111111",
                backgroundColor: "#ffffff",
              }}
            >
              <option value="Production Team">Production Team</option>
              <option value="PIC Forming">PIC Forming</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              padding: "11px 14px",
              borderRadius: "8px",
              border: "1px solid #111111",
              backgroundColor: "#111111",
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