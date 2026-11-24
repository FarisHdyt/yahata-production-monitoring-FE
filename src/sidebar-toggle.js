const STORAGE_KEY = "yahataSidebarCollapsed";

function findSidebar() {
  return (
    document.querySelector("aside") ||
    document.querySelector(".app-sidebar") ||
    document.querySelector(".sidebar") ||
    document.querySelector("nav")
  );
}

function applySidebarState(collapsed) {
  const sidebar = findSidebar();
  if (!sidebar) return;

  sidebar.classList.toggle("sb-collapsed", collapsed);
  document.body.classList.toggle("sb-is-collapsed", collapsed);

  const btn = document.getElementById("yahata-sidebar-toggle-btn");
  if (btn) {
    btn.title = collapsed ? "Buka Sidebar" : "Geser / Tutup Sidebar";
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.innerHTML = collapsed ? "☰" : "‹";
  }

  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // abaikan jika storage diblokir
  }
}

function ensureToggleButton() {
  const sidebar = findSidebar();
  if (!sidebar || document.getElementById("yahata-sidebar-toggle-btn")) {
    return;
  }

  const btn = document.createElement("button");
  btn.id = "yahata-sidebar-toggle-btn";
  btn.type = "button";
  btn.className = "sb-toggle-btn";
  btn.setAttribute("aria-label", "Geser Sidebar");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCollapsed = sidebar.classList.contains("sb-collapsed");
    applySidebarState(!isCollapsed);
  });

  sidebar.style.position = sidebar.style.position || "relative";
  sidebar.appendChild(btn);

  let initialCollapsed = false;
  try {
    initialCollapsed = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    initialCollapsed = false;
  }
  applySidebarState(initialCollapsed);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", ensureToggleButton);
  const observer = new MutationObserver(() => {
    ensureToggleButton();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(ensureToggleButton, 100);
}