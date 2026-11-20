console.log("Yahata Production Monitoring System Ready!");

// ==================================================
// NAVIGASI
// ==================================================

let productionChart = null;
let trendChart = null;

const menuLinks = document.querySelectorAll(".sidebar nav a");
const pages = document.querySelectorAll(".page");

function showPage(pageName) {
    pages.forEach(page => page.classList.remove("active"));
    menuLinks.forEach(link => link.classList.remove("active"));

    const targetPage = document.getElementById("page-" + pageName);
    if (targetPage) targetPage.classList.add("active");

    const activeLink = document.querySelector(
        '.sidebar nav a[data-page="' + pageName + '"]'
    );
    if (activeLink) activeLink.classList.add("active");

    if (pageName === "production") {
        if (productionChart) productionChart.resize();
        if (trendChart) trendChart.resize();
    }

    window.scrollTo(0, 0);
}

menuLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        showPage(link.dataset.page);
    });
});

// ==================================================
// FUNGSI BANTU DAN ATURAN SHIFT
// ==================================================

function formatNumber(number) {
    return Number(number || 0).toLocaleString("id-ID");
}

function formatPercent(percent) {
    if (percent === null || percent === undefined || Number.isNaN(Number(percent))) return "-";
    return Number(percent).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + "%";
}

function formatHour(hour) {
    return String(hour).padStart(2, "0") + ":00";
}

function getTodayLocalDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getNowTimeText(date = new Date()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toMinutes(timeText) {
    const [hours, minutes] = String(timeText).split(":").map(Number);
    return hours * 60 + minutes;
}

function getShiftByHour(hour) {
    // Shift aktif dimulai pukul 14:00 untuk Shift 2.
    if (hour >= 6 && hour < 14) return SHIFTS.find(s => s.key === "shift1") || null;
    if (hour >= 14 && hour < 23) return SHIFTS.find(s => s.key === "shift2") || null;
    return null;
}

function getDowntimeShiftKey(event) {
    const date = new Date(event.start);
    const minuteOfDay = date.getHours() * 60 + date.getMinutes();
    const handoverStart = toMinutes(HANDOVER.briefingStart);
    const handoverEnd = toMinutes(HANDOVER.briefingEnd);

    // Downtime yang tercatat selama briefing handover dibebankan ke Shift 1.
    if (minuteOfDay >= handoverStart && minuteOfDay < handoverEnd) return "shift1";
    if (minuteOfDay >= 6 * 60 && minuteOfDay < 14 * 60) return "shift1";
    if (minuteOfDay >= 14 * 60 && minuteOfDay < 23 * 60) return "shift2";
    return null;
}

function getCurrentShiftInfo(now = new Date()) {
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    const shift1 = SHIFTS.find(s => s.key === "shift1");
    const shift2 = SHIFTS.find(s => s.key === "shift2");

    if (minuteOfDay < toMinutes("06:00") || minuteOfDay >= toMinutes("23:00")) return null;
    if (minuteOfDay >= toMinutes(HANDOVER.briefingStart) && minuteOfDay < toMinutes(HANDOVER.briefingEnd)) {
        return { ...shift2, label: "Shift 2 (Handover)", isHandover: true };
    }
    if (minuteOfDay >= toMinutes("14:00")) return { ...shift2, label: shift2.name, isHandover: false };
    return { ...shift1, label: shift1.name, isHandover: false };
}

function getStatusClass(percent) {
    if (percent === null || percent === undefined) return "muted";
    if (percent >= 90) return "ok";
    if (percent >= 70) return "warn";
    return "low";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
}

function formatDateID(dateText, options = {}) {
    if (!dateText) return "-";
    return new Date(dateText + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric", ...options
    });
}

function getShiftRecord(date, shiftKey) {
    return shiftPicRecords.find(record => record.date === date && record.shift === shiftKey) || null;
}

function getValidActual(record) {
    if (!record || record.actual === null || record.actual === undefined || record.actual === "") return null;
    const number = Number(record.actual);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function getShiftDowntimeEvents(date, shiftKey) {
    return downtimeEvents.filter(event => {
        if (String(event.start).slice(0, 10) !== date) return false;
        if (Number(event.category) === 1) return false;
        return getDowntimeShiftKey(event) === shiftKey && getDurationMinutes(event.start, event.end) > 0;
    });
}

function getShiftDowntimeMinutes(date, shiftKey) {
    return getShiftDowntimeEvents(date, shiftKey).reduce((sum, event) => {
        return sum + getDurationMinutes(event.start, event.end);
    }, 0);
}

function calculateShiftMetrics(date, shiftKey) {
    const record = getShiftRecord(date, shiftKey);
    const actual = getValidActual(record);
    const downtimeMinutes = getShiftDowntimeMinutes(date, shiftKey);
    // Efficiency baru final setelah Actual diinput pada akhir shift.
    const plannedMinutes = actual !== null ? EFFECTIVE_MINUTES_PER_SHIFT : 0;
    const operatingMinutes = Math.max(0, plannedMinutes - downtimeMinutes);
    const target = actual === null ? 0 : SHIFT_TARGET;

    return {
        record,
        actual,
        target,
        productivity: target > 0 ? actual / target * 100 : null,
        downtimeMinutes,
        plannedMinutes,
        operatingMinutes,
        efficiency: plannedMinutes > 0 ? operatingMinutes / plannedMinutes * 100 : null
    };
}

function calculateDayMetrics(date) {
    const shiftMetrics = SHIFTS.map(shift => ({
        shift,
        ...calculateShiftMetrics(date, shift.key)
    }));
    const completed = shiftMetrics.filter(item => item.actual !== null);
    const recorded = shiftMetrics.filter(item => item.record);
    const totalActual = completed.reduce((sum, item) => sum + item.actual, 0);
    const totalTarget = completed.reduce((sum, item) => sum + SHIFT_TARGET, 0);
    const plannedMinutes = completed.reduce((sum, item) => sum + item.plannedMinutes, 0);
    const completedDowntimeMinutes = completed.reduce((sum, item) => sum + item.downtimeMinutes, 0);
    const downtimeMinutes = shiftMetrics.reduce((sum, item) => sum + item.downtimeMinutes, 0);
    const operatingMinutes = Math.max(0, plannedMinutes - completedDowntimeMinutes);

    return {
        shiftMetrics,
        completedShiftCount: completed.length,
        plannedShiftCount: recorded.length,
        totalActual,
        totalTarget,
        productivity: totalTarget > 0 ? totalActual / totalTarget * 100 : null,
        downtimeMinutes,
        downtimeCount: shiftMetrics.reduce((sum, item) => sum + getShiftDowntimeEvents(date, item.shift.key).length, 0),
        plannedMinutes,
        operatingMinutes,
        efficiency: plannedMinutes > 0 ? operatingMinutes / plannedMinutes * 100 : null
    };
}

function getMachineStatus(now = new Date()) {
    const currentShift = getCurrentShiftInfo(now);
    if (!currentShift) return { label: "DI LUAR JADWAL", className: "status-off" };

    const activeEvent = downtimeEvents.find(event => {
        if (Number(event.category) === 1) return false;
        const start = new Date(event.start);
        const end = new Date(event.end);
        return start <= now && now < end && getDurationMinutes(event.start, event.end) > 0;
    });

    if (activeEvent) return { label: "DOWNTIME", className: "status-down" };
    return { label: "RUNNING", className: "status-running" };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

// ==================================================
// DASHBOARD DINAMIS
// ==================================================

function renderDashboard() {
    const now = new Date();
    const today = getTodayLocalDate();
    const shiftInfo = getCurrentShiftInfo(now);
    const machineStatus = getMachineStatus(now);
    const day = calculateDayMetrics(today);
    const currentRecord = shiftInfo ? getShiftRecord(today, shiftInfo.key) : null;

    const statusElement = document.getElementById("dashboard-machine-status");
    if (statusElement) {
        statusElement.textContent = machineStatus.label;
        statusElement.className = "status-pill " + machineStatus.className;
    }

    setText("dashboard-current-shift", shiftInfo ? shiftInfo.label : "DI LUAR JADWAL");
    setText("dashboard-current-pic", currentRecord && currentRecord.picName ? currentRecord.picName : "Belum diisi");
    setText("dashboard-machine-name", MACHINE_NAME);
    setText("dashboard-date-label", formatDateID(today, { weekday: "long" }));

    setText("dashboard-actual", day.completedShiftCount > 0 ? formatNumber(day.totalActual) : "Belum diinput");
    setText("dashboard-target", day.completedShiftCount > 0 ? formatNumber(day.totalTarget) : "-");
    setText("dashboard-productivity", formatPercent(day.productivity));
    setText("dashboard-efficiency", formatPercent(day.efficiency));

    const overview = document.getElementById("dashboard-production-overview");
    if (overview) {
        const lines = day.shiftMetrics.map(item => {
            const pic = item.record?.picName ? escapeHTML(item.record.picName) : "Belum diisi";
            const actualText = item.actual === null ? "Menunggu input" : `${formatNumber(item.actual)} pcs`;
            const productivityText = formatPercent(item.productivity);
            return `<div class="overview-row"><div><strong>${escapeHTML(item.shift.name)}</strong><small>${item.shift.schedule} · PIC: ${pic}</small></div><div class="overview-value"><strong>${actualText}</strong><small>Productivity: ${productivityText}</small></div></div>`;
        }).join("");
        overview.innerHTML = lines + `<p class="helper-text">${shiftInfo?.isHandover ? "Periode handover: downtime pukul 14.00–15.00 dialokasikan ke Shift 1." : "Data ditampilkan berdasarkan tanggal operasional hari ini."}</p>`;
    }

    renderDashboardDowntimeSummary(today);
}

function renderDashboardDowntimeSummary(date) {
    const box = document.getElementById("dashboard-downtime-summary");
    if (!box) return;
    const events = downtimeEvents.filter(event =>
        String(event.start).slice(0, 10) === date && Number(event.category) !== 1 && getDurationMinutes(event.start, event.end) > 0
    );
    const totalMinutes = events.reduce((sum, event) => sum + getDurationMinutes(event.start, event.end), 0);

    if (!events.length) {
        box.innerHTML = "<p class=\"empty-state\">Belum ada kejadian downtime hari ini.</p>";
        return;
    }

    const totals = new Map();
    events.forEach(event => {
        const key = Number(event.category);
        totals.set(key, (totals.get(key) || 0) + getDurationMinutes(event.start, event.end));
    });
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    box.innerHTML = `<div class="summary-total">Total downtime hari ini <strong>${formatDuration(totalMinutes)}</strong> · ${events.length} kejadian</div><ul class="summary-list">${top.map(([code, minutes]) => `<li><span>${escapeHTML(getCategoryName(code))}</span><strong>${formatDuration(minutes)}</strong></li>`).join("")}</ul>`;
}

// ==================================================
// PRODUCTION PER SHIFT DAN TREN 7 HARI
// ==================================================

function getLastSevenDates() {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        result.push(`${year}-${month}-${day}`);
    }
    return result;
}

function renderProductionPage() {
    const today = getTodayLocalDate();
    const day = calculateDayMetrics(today);
    setText("production-date-text", `Data produksi · ${formatDateID(today, { weekday: "long" })}`);
    setText("prod-total-actual", day.completedShiftCount ? formatNumber(day.totalActual) : "Belum diinput");
    setText("prod-total-target", day.completedShiftCount ? formatNumber(day.totalTarget) : "-");
    setText("prod-productivity", formatPercent(day.productivity));
    setText("prod-efficiency", formatPercent(day.efficiency));
    setText("prod-gap", day.downtimeMinutes ? formatDuration(day.downtimeMinutes) : (day.plannedShiftCount ? "0 menit" : "-"));

    const body = document.getElementById("shift-table-body");
    if (body) {
        body.innerHTML = day.shiftMetrics.map(item => {
            const actualText = item.actual === null ? "Menunggu input" : formatNumber(item.actual);
            const status = !item.record ? "PIC belum diisi" : item.actual === null ? "Menunggu Actual" : "Selesai";
            return `<tr><td>${escapeHTML(item.shift.name)}</td><td>${item.shift.schedule}</td><td>${escapeHTML(item.record?.picName || "Belum diisi")}</td><td class="num">${actualText}</td><td class="num">${formatNumber(SHIFT_TARGET)}</td><td class="num ${getStatusClass(item.productivity)}">${formatPercent(item.productivity)}</td><td class="num ${getStatusClass(item.efficiency)}">${formatPercent(item.efficiency)}</td><td><span class="record-status ${item.actual !== null ? "complete" : "pending"}">${status}</span></td></tr>`;
        }).join("");
    }

    renderProductionCharts();
    renderHistoryTable();
}

function renderProductionCharts() {
    const chartElement = document.getElementById("production-chart");
    const trendElement = document.getElementById("production-trend-chart");

    if (typeof Chart === "undefined") {
        const container = document.getElementById("production-chart-container");
        if (container) {
            container.innerHTML = "<p class=\"empty-state\">Chart.js tidak dapat dimuat. Periksa koneksi internet.</p>";
        }
        return;
    }

    const today = getTodayLocalDate();
    const shiftLabels = SHIFTS.map(shift => shift.name);
    const actualValues = SHIFTS.map(shift => {
        const value = getValidActual(getShiftRecord(today, shift.key));
        return value === null ? null : value;
    });
    const targetValues = SHIFTS.map(() => SHIFT_TARGET);

    if (chartElement) {
        if (productionChart) {
            // Perbarui data chart yang sama; jangan membuat ulang chart setiap refresh.
            productionChart.data.labels = shiftLabels;
            productionChart.data.datasets[0].data = targetValues;
            productionChart.data.datasets[1].data = actualValues;
            productionChart.update("none");
        } else {
            productionChart = new Chart(chartElement, {
                type: "bar",
                data: {
                    labels: shiftLabels,
                    datasets: [
                        { label: "Target", data: targetValues, backgroundColor: "rgba(148, 163, 184, 0.45)", borderRadius: 7 },
                        { label: "Actual", data: actualValues, backgroundColor: "#2563eb", borderRadius: 7 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, title: { display: true, text: "Pieces" } } },
                    plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.raw === null ? "Belum diinput" : formatNumber(context.raw) + " pcs"}` } } }
                }
            });
        }
    }

    if (trendElement) {
        const dates = getLastSevenDates();
        const labels = dates.map(date => new Date(date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
        const totals = dates.map(date => {
            const records = SHIFTS.map(shift => getValidActual(getShiftRecord(date, shift.key))).filter(value => value !== null);
            return records.length ? records.reduce((sum, value) => sum + value, 0) : null;
        });

        if (trendChart) {
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = totals;
            trendChart.update("none");
        } else {
            trendChart = new Chart(trendElement, {
                type: "line",
                data: {
                    labels,
                    datasets: [{ label: "Total Actual", data: totals, borderColor: "#0f766e", backgroundColor: "rgba(15, 118, 110, 0.12)", fill: true, tension: 0.3, spanGaps: false, pointRadius: 4 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, title: { display: true, text: "Pieces" } } },
                    plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: context => context.raw === null ? "Belum ada input" : `Actual: ${formatNumber(context.raw)} pcs` } } }
                }
            });
        }
    }
}

function renderHistoryTable() {
    const tableHead = document.getElementById("history-table-head");
    const tableBody = document.getElementById("history-table-body");
    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = `<tr><th>Tanggal</th><th class="num">Shift 1 (pcs)</th><th class="num">Shift 2 (pcs)</th><th class="num">Total Actual</th><th class="num">Target</th><th class="num">Productivity</th><th class="num">Efficiency</th></tr>`;
    const rows = getLastSevenDates().reverse().map(date => {
        const day = calculateDayMetrics(date);
        const s1 = getValidActual(getShiftRecord(date, "shift1"));
        const s2 = getValidActual(getShiftRecord(date, "shift2"));
        return `<tr><td>${formatDateID(date)}</td><td class="num">${s1 === null ? "-" : formatNumber(s1)}</td><td class="num">${s2 === null ? "-" : formatNumber(s2)}</td><td class="num">${day.completedShiftCount ? formatNumber(day.totalActual) : "-"}</td><td class="num">${day.completedShiftCount ? formatNumber(day.totalTarget) : "-"}</td><td class="num ${getStatusClass(day.productivity)}">${formatPercent(day.productivity)}</td><td class="num ${getStatusClass(day.efficiency)}">${formatPercent(day.efficiency)}</td></tr>`;
    });
    tableBody.innerHTML = rows.join("");
}

function refreshOperationalViews() {
    renderDashboard();
    renderProductionPage();
    renderDowntimeSummary();
    if (latestReportData !== null) renderReports();
}

// ==================================================
// LOCALSTORAGE DOWNTIME
// ==================================================

const DOWNTIME_STORAGE_KEY = "yahataDowntimeEvents";

let editingDowntimeId = null;

function loadDowntimeEventsFromStorage() {
    const savedData = localStorage.getItem(DOWNTIME_STORAGE_KEY);

    if (savedData !== null) {
        try {
            const parsedData = JSON.parse(savedData);

            if (Array.isArray(parsedData)) {
                downtimeEvents.splice(
                    0,
                    downtimeEvents.length,
                    ...parsedData
                );
                return;
            }
        } catch (error) {
            console.error("Gagal membaca data downtime:", error);
        }
    }

    saveDowntimeEventsToStorage();
}

function saveDowntimeEventsToStorage() {
    try {
        localStorage.setItem(
            DOWNTIME_STORAGE_KEY,
            JSON.stringify(downtimeEvents)
        );
    } catch (error) {
        console.error("Gagal menyimpan data downtime:", error);
        alert("Data downtime gagal disimpan di browser.");
    }
}


// ==================================================
// FUNGSI DOWNTIME
// ==================================================

function getCategoryName(code) {
    const category = DOWNTIME_CATEGORIES.find(function (item) {
        return Number(item.code) === Number(code);
    });

    return category ? category.name : "-";
}

function getDurationMinutes(startText, endText) {
    const start = new Date(startText);
    const end = new Date(endText);

    return Math.round((end - start) / 60000);
}

function formatDuration(totalMinutes) {
    const safeMinutes = Math.max(0, Number(totalMinutes) || 0);

    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours === 0) return minutes + " menit";
    if (minutes === 0) return hours + " jam";

    return hours + " jam " + minutes + " menit";
}

function formatClock(date) {
    return String(date.getHours()).padStart(2, "0") + ":" +
        String(date.getMinutes()).padStart(2, "0");
}

function fillCategoryOptions() {
    const select = document.getElementById("downtime-category");

    let options = '<option value="">Pilih kategori...</option>';

    DOWNTIME_CATEGORIES.filter(function (category) {
        return Number(category.code) !== 1;
    }).forEach(function (category) {
        options += `
            <option value="${category.code}">
                ${category.code}. ${category.name}
            </option>
        `;
    });

    select.innerHTML = options;
}


// ==================================================
// FILTER DOWNTIME
// ==================================================

function setupDowntimeFilters() {
    const tableBody = document.getElementById("downtime-table-body");
    const table = tableBody ? tableBody.closest("table") : null;

    if (!table || document.getElementById("downtime-filters")) return;

    const filterBox = document.createElement("div");

    filterBox.id = "downtime-filters";
    filterBox.className = "downtime-filters";

    filterBox.innerHTML = `
        <div class="filter-item">
            <label for="filter-start-date">Dari Tanggal</label>
            <input type="date" id="filter-start-date">
        </div>

        <div class="filter-item">
            <label for="filter-end-date">Sampai Tanggal</label>
            <input type="date" id="filter-end-date">
        </div>

        <div class="filter-item">
            <label for="filter-shift">Shift</label>
            <select id="filter-shift">
                <option value="">Semua Shift</option>
            </select>
        </div>

        <div class="filter-item">
            <label for="filter-category">Kategori</label>
            <select id="filter-category">
                <option value="">Semua Kategori</option>
            </select>
        </div>

        <button type="button" id="reset-downtime-filter">
            Reset Filter
        </button>
    `;

    table.insertAdjacentElement("beforebegin", filterBox);

    const shiftSelect = document.getElementById("filter-shift");

    SHIFTS.forEach(function (shift) {
        const option = document.createElement("option");
        option.value = shift.id;
        option.textContent = shift.name;
        shiftSelect.appendChild(option);
    });

    const categorySelect = document.getElementById("filter-category");

    DOWNTIME_CATEGORIES.forEach(function (category) {
        const option = document.createElement("option");
        option.value = category.code;
        option.textContent = category.code + ". " + category.name;
        categorySelect.appendChild(option);
    });

    filterBox.querySelectorAll("input, select").forEach(function (input) {
        input.addEventListener("change", renderDowntimeTable);
    });

    document.getElementById("reset-downtime-filter")
        .addEventListener("click", function (event) {
            event.preventDefault();

            document.getElementById("filter-start-date").value = "";
            document.getElementById("filter-end-date").value = "";
            document.getElementById("filter-shift").value = "";
            document.getElementById("filter-category").value = "";

            renderDowntimeTable();
        });
}


function getFilteredDowntimeEvents() {
    const startInput = document.getElementById("filter-start-date");
    const endInput = document.getElementById("filter-end-date");
    const shiftInput = document.getElementById("filter-shift");
    const categoryInput = document.getElementById("filter-category");

    if (!startInput || !endInput || !shiftInput || !categoryInput) {
        return [...downtimeEvents];
    }

    const startDate = startInput.value;
    const endDate = endInput.value;
    const selectedShift = shiftInput.value;
    const selectedCategory = categoryInput.value;

    if (startDate && endDate && startDate > endDate) return [];

    return downtimeEvents.filter(function (downtime) {
        const eventDate = String(downtime.start).slice(0, 10);
        const eventHour = new Date(downtime.start).getHours();

        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;

        if (selectedShift) {
            const shiftKey = getDowntimeShiftKey(downtime);
            const shift = SHIFTS.find(function (item) { return item.key === shiftKey; });

            if (!shift || String(shift.id) !== selectedShift) {
                return false;
            }
        }

        if (
            selectedCategory &&
            String(downtime.category) !== selectedCategory
        ) {
            return false;
        }

        return true;
    });
}


// ==================================================
// TABEL DOWNTIME
// ==================================================

function renderDowntimeTable() {
    const tableBody = document.getElementById("downtime-table-body");
    if (!tableBody) return;

    const table = tableBody.closest("table");
    const headerRow = table ? table.querySelector("thead tr") : null;

    if (
        headerRow &&
        !headerRow.querySelector('[data-downtime-action-header="true"]')
    ) {
        const actionHeader = document.createElement("th");
        actionHeader.textContent = "Aksi";

        actionHeader.setAttribute(
            "data-downtime-action-header",
            "true"
        );

        headerRow.appendChild(actionHeader);
    }

    const filteredEvents = getFilteredDowntimeEvents();

    if (filteredEvents.length === 0) {
        const emptyMessage = downtimeEvents.length === 0
            ? "Belum ada data downtime."
            : "Tidak ada data downtime sesuai filter.";

        tableBody.innerHTML =
            `<tr><td colspan="7">${emptyMessage}</td></tr>`;

        return;
    }

    const sortedEvents = [...filteredEvents].sort(function (a, b) {
        return new Date(b.start) - new Date(a.start);
    });

    let rows = "";

    sortedEvents.forEach(function (downtime) {
        const start = new Date(downtime.start);
        const end = new Date(downtime.end);

        const minutes = getDurationMinutes(
            downtime.start,
            downtime.end
        );

        const shiftKey = getDowntimeShiftKey(downtime);
        const shift = SHIFTS.find(function (item) { return item.key === shiftKey; });

        const dateText = start.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        const nextDay = end.toDateString() !== start.toDateString()
            ? " (+1)"
            : "";

        rows += `
            <tr>
                <td>${dateText}</td>
                <td>${formatClock(start)}</td>
                <td>${formatClock(end)}${nextDay}</td>
                <td class="num">${formatDuration(minutes)}</td>
                <td>${getCategoryName(downtime.category)}</td>
                <td>${shift ? shift.name : "-"}</td>

                <td class="downtime-actions">
                    <button
                        type="button"
                        class="btn-edit"
                        data-downtime-action="edit"
                        data-id="${downtime.id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn-delete"
                        data-downtime-action="delete"
                        data-id="${downtime.id}"
                    >
                        Hapus
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rows;
}


// ==================================================
// PREVIEW DURASI DOWNTIME
// ==================================================

function updateDurationPreview() {
    const startValue = document.getElementById("downtime-start").value;
    const endValue = document.getElementById("downtime-end").value;

    const preview = document.getElementById(
        "downtime-duration-preview"
    );

    if (!startValue || !endValue) {
        preview.textContent = "-";
        return;
    }

    const minutes = getDurationMinutes(startValue, endValue);

    preview.textContent = minutes > 0
        ? formatDuration(minutes)
        : "Tidak valid";
}


// ==================================================
// FORM DOWNTIME
// ==================================================

function setupDowntimeForm() {
    const form = document.getElementById("downtime-form");

    const categoryInput = document.getElementById("downtime-category");
    const startInput = document.getElementById("downtime-start");
    const endInput = document.getElementById("downtime-end");

    const message = document.getElementById("downtime-message");
    const tableBody = document.getElementById("downtime-table-body");

    if (!form || !tableBody) return;

    const submitButton = form.querySelector(
        'button[type="submit"], button:not([type]), input[type="submit"]'
    );

    const defaultSubmitText = submitButton
        ? submitButton.textContent.trim()
        : "Simpan";

    function resetEditMode() {
        editingDowntimeId = null;

        if (submitButton) {
            submitButton.textContent = defaultSubmitText;
        }
    }

    startInput.addEventListener("input", updateDurationPreview);
    endInput.addEventListener("input", updateDurationPreview);

    // EVENT EDIT DAN HAPUS
    tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-downtime-action]");
        if (!button) return;

        const id = Number(button.dataset.id);

        const index = downtimeEvents.findIndex(function (item) {
            return Number(item.id) === id;
        });

        if (index === -1) return;

        const downtime = downtimeEvents[index];

        if (button.dataset.downtimeAction === "edit") {
            editingDowntimeId = id;

            categoryInput.value = downtime.category;
            startInput.value = downtime.start;
            endInput.value = downtime.end;

            if (submitButton) {
                submitButton.textContent = "Simpan Perubahan";
            }

            message.textContent = "Sedang mengedit data downtime.";
            message.className = "form-message success";

            updateDurationPreview();
            startInput.focus();
        }

        if (button.dataset.downtimeAction === "delete") {
            const confirmDelete = confirm(
                "Apakah kamu yakin ingin menghapus data downtime ini?"
            );

            if (!confirmDelete) return;

            downtimeEvents.splice(index, 1);

            saveDowntimeEventsToStorage();

            if (editingDowntimeId === id) {
                form.reset();
                resetEditMode();
                updateDurationPreview();
            }

            renderDowntimeTable();
            renderDowntimeSummary();
            refreshOperationalViews();

            message.textContent = "Data downtime berhasil dihapus.";
            message.className = "form-message success";
        }
    });

    // SUBMIT DATA BARU ATAU PERUBAHAN
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const categoryCode = Number(categoryInput.value);

        if (!categoryInput.value) {
            message.textContent = "Silakan pilih kategori downtime.";
            message.className = "form-message error";
            return;
        }

        const minutes = getDurationMinutes(
            startInput.value,
            endInput.value
        );

        if (minutes <= 0) {
            message.textContent =
                "Waktu selesai harus setelah waktu mulai.";

            message.className = "form-message error";
            return;
        }

        const wasEditing = editingDowntimeId !== null;

        if (wasEditing) {
            const index = downtimeEvents.findIndex(function (item) {
                return Number(item.id) === editingDowntimeId;
            });

            if (index === -1) {
                message.textContent =
                    "Data yang akan diedit tidak ditemukan.";

                message.className = "form-message error";

                form.reset();
                resetEditMode();
                updateDurationPreview();

                return;
            }

            downtimeEvents[index] = {
                id: editingDowntimeId,
                category: categoryCode,
                start: startInput.value,
                end: endInput.value
            };

        } else {
            downtimeEvents.push({
                id: Date.now(),
                category: categoryCode,
                start: startInput.value,
                end: endInput.value
            });
        }

        saveDowntimeEventsToStorage();

        const categoryName = getCategoryName(categoryCode);

        message.textContent = wasEditing
            ? "Perubahan berhasil disimpan: " +
              categoryName + ", " + formatDuration(minutes) + "."
            : "Tersimpan: " +
              categoryName + ", " + formatDuration(minutes) + ".";

        message.className = "form-message success";

        form.reset();
        resetEditMode();
        updateDurationPreview();

        renderDowntimeTable();
        renderDowntimeSummary();
        refreshOperationalViews();
    });
}


// ==================================================
// SHIFT & PIC: SATU CATATAN PER TANGGAL + SHIFT
// ==================================================

const SHIFT_PIC_STORAGE_KEY = "yahataShiftPicRecords";
let shiftPicRecords = [];
let editingShiftPicId = null;

const SHIFT_PIC_SCHEDULE = {
    shift1: { name: "Shift 1", schedule: "06:00 - 15:00" },
    shift2: { name: "Shift 2", schedule: "14:00 - 23:00" }
};

function loadShiftPicRecordsFromStorage() {
    const savedData = localStorage.getItem(SHIFT_PIC_STORAGE_KEY);
    if (!savedData) {
        shiftPicRecords = [];
        return;
    }

    try {
        const parsed = JSON.parse(savedData);
        const source = Array.isArray(parsed) ? parsed : [];
        const byKey = new Map();
        source.forEach(item => {
            if (!item || !item.date || !SHIFT_PIC_SCHEDULE[item.shift]) return;
            const key = `${item.date}|${item.shift}`;
            const normalized = {
                id: item.id || Date.now() + Math.floor(Math.random() * 1000),
                date: item.date,
                shift: item.shift,
                picName: String(item.picName || "").trim(),
                actual: item.actual === "" || item.actual === undefined || item.actual === null
                    ? null : Number(item.actual),
                notes: String(item.notes || "")
            };
            const existing = byKey.get(key);
            if (!existing) byKey.set(key, normalized);
            else {
                // Gabungkan data lama yang mungkin pernah tersimpan ganda.
                byKey.set(key, {
                    ...existing,
                    ...normalized,
                    picName: normalized.picName || existing.picName,
                    actual: normalized.actual === null ? existing.actual : normalized.actual,
                    notes: normalized.notes || existing.notes
                });
            }
        });
        shiftPicRecords = [...byKey.values()];
        saveShiftPicRecordsToStorage();
    } catch (error) {
        console.error("Gagal membaca data Shift & PIC:", error);
        shiftPicRecords = [];
    }
}

function saveShiftPicRecordsToStorage() {
    try {
        localStorage.setItem(SHIFT_PIC_STORAGE_KEY, JSON.stringify(shiftPicRecords));
    } catch (error) {
        console.error("Gagal menyimpan data Shift & PIC:", error);
        alert("Data Shift & PIC gagal disimpan di browser.");
    }
}

function renderShiftPicTable() {
    const tableBody = document.getElementById("shift-pic-table-body");
    if (!tableBody) return;

    if (!shiftPicRecords.length) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada catatan shift.</td></tr>';
        return;
    }

    const sorted = [...shiftPicRecords].sort((a, b) => {
        return b.date.localeCompare(a.date) || a.shift.localeCompare(b.shift);
    });
    tableBody.innerHTML = sorted.map(record => {
        const info = SHIFT_PIC_SCHEDULE[record.shift];
        const actual = getValidActual(record);
        return `<tr><td>${formatDateID(record.date)}</td><td>${info.name}</td><td>${info.schedule}</td><td>${escapeHTML(record.picName || "Belum diisi")}</td><td class="num">${actual === null ? "Menunggu input" : formatNumber(actual)}</td><td>${escapeHTML(record.notes || "-")}</td><td class="downtime-actions"><button type="button" class="btn-edit" data-shift-pic-action="edit" data-id="${record.id}">Edit</button><button type="button" class="btn-delete" data-shift-pic-action="delete" data-id="${record.id}">Hapus</button></td></tr>`;
    }).join("");
}

function setupShiftPicForm() {
    const form = document.getElementById("shift-pic-form");
    if (!form) return;

    const dateInput = document.getElementById("shift-pic-date");
    const shiftInput = document.getElementById("shift-pic-shift");
    const nameInput = document.getElementById("shift-pic-name");
    const actualInput = document.getElementById("shift-pic-actual");
    const notesInput = document.getElementById("shift-pic-notes");
    const submitButton = document.getElementById("shift-pic-submit");
    const cancelButton = document.getElementById("shift-pic-cancel");
    const message = document.getElementById("shift-pic-message");
    const tableBody = document.getElementById("shift-pic-table-body");

    if (!dateInput || !shiftInput || !nameInput || !actualInput || !notesInput || !submitButton || !cancelButton || !message || !tableBody) {
        console.error("Elemen form Shift & PIC tidak lengkap.");
        return;
    }

    function resetForm() {
        editingShiftPicId = null;
        form.reset();
        dateInput.value = getTodayLocalDate();
        const current = getCurrentShiftInfo();
        shiftInput.value = current ? current.key : "";
        submitButton.textContent = "Simpan Catatan Shift";
        cancelButton.hidden = true;
    }

    resetForm();

    cancelButton.addEventListener("click", function () {
        resetForm();
        message.textContent = "Mode edit dibatalkan.";
        message.className = "form-message";
    });

    tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-shift-pic-action]");
        if (!button) return;
        const id = Number(button.dataset.id);
        const index = shiftPicRecords.findIndex(record => Number(record.id) === id);
        if (index === -1) return;
        const record = shiftPicRecords[index];

        if (button.dataset.shiftPicAction === "edit") {
            editingShiftPicId = id;
            dateInput.value = record.date;
            shiftInput.value = record.shift;
            nameInput.value = record.picName || "";
            actualInput.value = getValidActual(record) === null ? "" : getValidActual(record);
            notesInput.value = record.notes || "";
            submitButton.textContent = "Simpan Perubahan";
            cancelButton.hidden = false;
            message.textContent = "Edit catatan yang sama; data tidak membuat baris shift baru.";
            message.className = "form-message success";
            nameInput.focus();
        }

        if (button.dataset.shiftPicAction === "delete") {
            if (!confirm("Hapus seluruh catatan PIC dan Actual untuk tanggal serta shift ini?")) return;
            shiftPicRecords.splice(index, 1);
            saveShiftPicRecordsToStorage();
            if (editingShiftPicId === id) resetForm();
            renderShiftPicTable();
            refreshOperationalViews();
            message.textContent = "Catatan shift berhasil dihapus. Riwayat lainnya tetap tersimpan.";
            message.className = "form-message success";
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const date = dateInput.value;
        const shift = shiftInput.value;
        const picName = nameInput.value.trim();
        const actualText = actualInput.value.trim();
        const notes = notesInput.value.trim();

        if (!date || !shift || !picName) {
            message.textContent = "Tanggal, shift, dan nama PIC wajib diisi.";
            message.className = "form-message error";
            return;
        }
        if (actualText !== "" && (!Number.isFinite(Number(actualText)) || Number(actualText) < 0)) {
            message.textContent = "Actual Production harus berupa angka nol atau lebih.";
            message.className = "form-message error";
            return;
        }

        let index = editingShiftPicId !== null
            ? shiftPicRecords.findIndex(record => Number(record.id) === editingShiftPicId)
            : shiftPicRecords.findIndex(record => record.date === date && record.shift === shift);

        if (editingShiftPicId !== null && index === -1) {
            message.textContent = "Catatan shift yang akan diedit tidak ditemukan.";
            message.className = "form-message error";
            return;
        }

        const previous = index >= 0 ? shiftPicRecords[index] : null;
        const actual = actualText === "" ? (previous ? getValidActual(previous) : null) : Number(actualText);
        const newRecord = {
            id: previous ? previous.id : Date.now(),
            date,
            shift,
            picName,
            actual,
            notes
        };

        // Pastikan hanya ada satu catatan untuk satu tanggal + shift.
        const duplicateIndex = shiftPicRecords.findIndex(record =>
            record.date === date && record.shift === shift && Number(record.id) !== Number(newRecord.id)
        );
        if (duplicateIndex >= 0) shiftPicRecords.splice(duplicateIndex, 1);

        if (index >= 0) {
            const currentIndex = shiftPicRecords.findIndex(record => Number(record.id) === Number(newRecord.id));
            if (currentIndex >= 0) shiftPicRecords[currentIndex] = newRecord;
            else shiftPicRecords.push(newRecord);
        } else {
            shiftPicRecords.push(newRecord);
        }

        saveShiftPicRecordsToStorage();
        renderShiftPicTable();
        refreshOperationalViews();
        message.textContent = actual === null
            ? "PIC berhasil disimpan. Actual dapat diisi setelah shift selesai melalui tombol Edit."
            : "Catatan shift dan Actual Production berhasil disimpan.";
        message.className = "form-message success";
        resetForm();
    });

    renderShiftPicTable();
}

// ==================================================
// REPORTS: PRODUKSI, EFFICIENCY, DAN DOWNTIME
// ==================================================

let latestReportData = null;

function getReportAvailableDates() {
    const dates = [];
    shiftPicRecords.forEach(record => { if (record.date) dates.push(record.date); });
    downtimeEvents.forEach(event => { if (event.start) dates.push(String(event.start).slice(0, 10)); });
    return [...new Set(dates)].sort();
}

function setDefaultReportDates() {
    const startInput = document.getElementById("report-start-date");
    const endInput = document.getElementById("report-end-date");
    if (!startInput || !endInput) return;
    const dates = getReportAvailableDates();
    if (dates.length) {
        endInput.value = dates[dates.length - 1];
        startInput.value = dates[Math.max(0, dates.length - 7)];
    } else {
        startInput.value = getTodayLocalDate();
        endInput.value = getTodayLocalDate();
    }
}

function calculateReportData(startDate, endDate) {
    const datesSet = new Set();
    shiftPicRecords.forEach(record => {
        if ((!startDate || record.date >= startDate) && (!endDate || record.date <= endDate)) datesSet.add(record.date);
    });
    downtimeEvents.forEach(event => {
        const date = String(event.start).slice(0, 10);
        if (Number(event.category) !== 1 && (!startDate || date >= startDate) && (!endDate || date <= endDate)) datesSet.add(date);
    });

    const reportDates = [...datesSet].sort();
    const dailyRows = reportDates.map(date => {
        const shifts = SHIFTS.map(shift => {
            const metrics = calculateShiftMetrics(date, shift.key);
            return {
                key: shift.key,
                name: shift.name,
                schedule: shift.schedule,
                pic: metrics.record?.picName || "-",
                actual: metrics.actual,
                target: metrics.target,
                productivity: metrics.productivity,
                efficiency: metrics.efficiency,
                downtimeCount: getShiftDowntimeEvents(date, shift.key).length,
                downtimeMinutes: metrics.downtimeMinutes,
                hasRecord: Boolean(metrics.record)
            };
        });

        const completed = shifts.filter(item => item.actual !== null);
        const totalActual = completed.reduce((sum, item) => sum + item.actual, 0);
        const totalTarget = completed.length * SHIFT_TARGET;
        const totalDowntime = shifts.reduce((sum, item) => sum + item.downtimeMinutes, 0);
        const completedDowntime = completed.reduce((sum, item) => sum + item.downtimeMinutes, 0);
        const plannedMinutes = completed.length * EFFECTIVE_MINUTES_PER_SHIFT;
        const operatingMinutes = Math.max(0, plannedMinutes - completedDowntime);
        const productivity = totalTarget > 0 ? totalActual / totalTarget * 100 : null;
        const efficiency = plannedMinutes > 0 ? operatingMinutes / plannedMinutes * 100 : null;
        const downtimeEventsForDate = downtimeEvents.filter(event =>
            String(event.start).slice(0, 10) === date && Number(event.category) !== 1 && getDurationMinutes(event.start, event.end) > 0
        );

        return {
            date,
            shifts,
            totalActual,
            totalTarget,
            productivity,
            efficiency,
            downtimeCount: downtimeEventsForDate.length,
            downtimeMinutes: totalDowntime,
            completedDowntimeMinutes: completedDowntime
        };
    });

    const totalActual = dailyRows.reduce((sum, day) => sum + day.totalActual, 0);
    const totalTarget = dailyRows.reduce((sum, day) => sum + day.totalTarget, 0);
    const productivity = totalTarget > 0 ? totalActual / totalTarget * 100 : null;
    const totalDowntimeCount = dailyRows.reduce((sum, day) => sum + day.downtimeCount, 0);
    const totalDowntimeMinutes = dailyRows.reduce((sum, day) => sum + day.downtimeMinutes, 0);
    const completedShiftCount = dailyRows.reduce((sum, day) => sum + day.shifts.filter(item => item.actual !== null).length, 0);
    const totalPlannedMinutes = completedShiftCount * EFFECTIVE_MINUTES_PER_SHIFT;
    const totalCompletedDowntimeMinutes = dailyRows.reduce((sum, day) => sum + day.completedDowntimeMinutes, 0);
    const efficiency = totalPlannedMinutes > 0
        ? Math.max(0, totalPlannedMinutes - totalCompletedDowntimeMinutes) / totalPlannedMinutes * 100
        : null;

    const shiftSummary = SHIFTS.map(shift => {
        const rows = dailyRows.map(day => day.shifts.find(item => item.key === shift.key));
        const completed = rows.filter(item => item.actual !== null);
        const actual = completed.reduce((sum, item) => sum + item.actual, 0);
        const target = completed.length * SHIFT_TARGET;
        const downtimeMinutes = rows.reduce((sum, item) => sum + item.downtimeMinutes, 0);
        const downtimeCount = rows.reduce((sum, item) => sum + item.downtimeCount, 0);
        const completedCount = completed.length;
        const plannedMinutes = completedCount * EFFECTIVE_MINUTES_PER_SHIFT;
        const completedDowntimeMinutes = completed.reduce((sum, item) => sum + item.downtimeMinutes, 0);
        return {
            key: shift.key,
            name: shift.name,
            schedule: shift.schedule,
            actual,
            target,
            productivity: target > 0 ? actual / target * 100 : null,
            downtimeMinutes,
            downtimeCount,
            efficiency: plannedMinutes > 0 ? Math.max(0, plannedMinutes - completedDowntimeMinutes) / plannedMinutes * 100 : null
        };
    });

    const categorySummary = DOWNTIME_CATEGORIES.filter(category => Number(category.code) !== 1).map(category => {
        const events = downtimeEvents.filter(event => {
            const date = String(event.start).slice(0, 10);
            return Number(event.category) === Number(category.code) &&
                (!startDate || date >= startDate) && (!endDate || date <= endDate) &&
                getDurationMinutes(event.start, event.end) > 0;
        });
        return {
            code: category.code,
            name: category.name,
            count: events.length,
            minutes: events.reduce((sum, event) => sum + getDurationMinutes(event.start, event.end), 0)
        };
    });

    return {
        dailyRows,
        shiftSummary,
        categorySummary,
        totalActual,
        totalTarget,
        productivity,
        efficiency,
        totalDowntimeCount,
        totalDowntimeMinutes
    };
}

function renderReports() {
    const startDate = document.getElementById("report-start-date").value;
    const endDate = document.getElementById("report-end-date").value;
    const message = document.getElementById("report-message");

    if (startDate && endDate && startDate > endDate) {
        message.textContent = "Tanggal awal tidak boleh melebihi tanggal akhir.";
        message.className = "form-message error";
        return false;
    }

    const report = calculateReportData(startDate, endDate);
    latestReportData = report;

    setText("report-total-actual", report.dailyRows.some(day => day.shifts.some(s => s.actual !== null)) ? formatNumber(report.totalActual) : "Belum ada data");
    setText("report-total-target", report.totalTarget > 0 ? formatNumber(report.totalTarget) : "-");
    setText("report-productivity", formatPercent(report.productivity));
    setText("report-efficiency", formatPercent(report.efficiency));
    setText("report-downtime-duration", report.totalDowntimeMinutes ? formatDuration(report.totalDowntimeMinutes) : "0 menit");
    setText("report-downtime-count", `${report.totalDowntimeCount} kejadian`);

    const shiftBody = document.getElementById("report-shift-body");
    shiftBody.innerHTML = report.shiftSummary.map(shift =>
        `<tr><td>${shift.name}</td><td>${shift.schedule}</td><td class="num">${shift.target ? formatNumber(shift.actual) : "-"}</td><td class="num">${shift.target ? formatNumber(shift.target) : "-"}</td><td class="num ${getStatusClass(shift.productivity)}">${formatPercent(shift.productivity)}</td><td class="num ${getStatusClass(shift.efficiency)}">${formatPercent(shift.efficiency)}</td></tr>`
    ).join("");

    const dailyBody = document.getElementById("report-daily-body");
    if (!report.dailyRows.length) {
        dailyBody.innerHTML = '<tr><td colspan="11" class="empty-state">Tidak ada data pada periode ini.</td></tr>';
    } else {
        dailyBody.innerHTML = report.dailyRows.map(day => {
            const shift1 = day.shifts[0];
            const shift2 = day.shifts[1];
            return `<tr><td>${formatDateID(day.date)}</td><td class="num">${shift1.actual === null ? "-" : formatNumber(shift1.actual)}</td><td class="num">${shift2.actual === null ? "-" : formatNumber(shift2.actual)}</td><td class="num">${day.totalTarget ? formatNumber(day.totalActual) : "-"}</td><td class="num">${day.totalTarget ? formatNumber(day.totalTarget) : "-"}</td><td class="num ${getStatusClass(day.productivity)}">${formatPercent(day.productivity)}</td><td class="num ${getStatusClass(day.efficiency)}">${formatPercent(day.efficiency)}</td><td class="num">${day.downtimeCount}</td><td class="num">${day.downtimeMinutes ? formatDuration(day.downtimeMinutes) : "-"}</td><td>${escapeHTML(shift1.pic)}</td><td>${escapeHTML(shift2.pic)}</td></tr>`;
        }).join("");
    }

    const categoryBody = document.getElementById("report-downtime-body");
    const categoryRows = report.categorySummary.map(category => {
        const share = report.totalDowntimeMinutes > 0 ? category.minutes / report.totalDowntimeMinutes * 100 : 0;
        return `<tr><td>${category.code}</td><td>${escapeHTML(category.name)}</td><td class="num">${category.count}</td><td class="num">${category.minutes ? formatDuration(category.minutes) : "-"}</td><td class="num">${formatPercent(share)}</td></tr>`;
    }).join("");
    categoryBody.innerHTML = categoryRows + `<tr class="total-row"><td></td><td>Total Downtime</td><td class="num">${report.totalDowntimeCount}</td><td class="num">${formatDuration(report.totalDowntimeMinutes)}</td><td class="num">${formatPercent(report.totalDowntimeMinutes > 0 ? 100 : 0)}</td></tr>`;

    message.textContent = "Laporan berhasil diperbarui.";
    message.className = "form-message success";
    return true;
}

function resetReportFilters() {
    document.getElementById("report-start-date").value = "";
    document.getElementById("report-end-date").value = "";
    renderReports();
    const message = document.getElementById("report-message");
    message.textContent = "Filter direset. Seluruh data tersimpan ditampilkan.";
    message.className = "form-message success";
}

function escapeCSV(value) {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
}

function exportReportsCSV() {
    if (!latestReportData) {
        alert("Belum ada data laporan.");
        return;
    }

    const headers = [
        "Tanggal", "PIC Shift 1", "Actual Shift 1", "Target Shift 1", "Productivity Shift 1", "Efficiency Shift 1",
        "PIC Shift 2", "Actual Shift 2", "Target Shift 2", "Productivity Shift 2", "Efficiency Shift 2",
        "Total Actual", "Total Target", "Productivity", "Efficiency", "Jumlah Downtime", "Durasi Downtime (menit)"
    ];

    const rows = latestReportData.dailyRows.map(day => {
        const s1 = day.shifts[0];
        const s2 = day.shifts[1];
        return [
            day.date, s1.pic, s1.actual ?? "", s1.target || "", s1.productivity === null ? "" : s1.productivity.toFixed(1) + "%", s1.efficiency === null ? "" : s1.efficiency.toFixed(1) + "%",
            s2.pic, s2.actual ?? "", s2.target || "", s2.productivity === null ? "" : s2.productivity.toFixed(1) + "%", s2.efficiency === null ? "" : s2.efficiency.toFixed(1) + "%",
            day.totalTarget ? day.totalActual : "", day.totalTarget || "", day.productivity === null ? "" : day.productivity.toFixed(1) + "%", day.efficiency === null ? "" : day.efficiency.toFixed(1) + "%", day.downtimeCount, day.downtimeMinutes
        ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Yahata_Production_Report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function setupReportsPage() {
    const showButton = document.getElementById("report-show-button");
    const resetButton = document.getElementById("report-reset-filter");
    const exportButton = document.getElementById("report-export-csv");
    const printButton = document.getElementById("report-print");
    if (!showButton || !resetButton || !exportButton || !printButton) {
        console.error("Elemen halaman Reports tidak lengkap.");
        return;
    }

    setDefaultReportDates();
    showButton.addEventListener("click", function (event) {
        event.preventDefault();
        if (renderReports()) document.getElementById("report-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    resetButton.addEventListener("click", function (event) {
        event.preventDefault();
        resetReportFilters();
    });
    exportButton.addEventListener("click", function (event) {
        event.preventDefault();
        exportReportsCSV();
    });
    printButton.addEventListener("click", function (event) {
        event.preventDefault();
        if (renderReports()) window.print();
    });
    renderReports();
}

// ==================================================
// REKAP DOWNTIME
// ==================================================

function calculateDowntimeSummary(events = downtimeEvents) {
    const rows = DOWNTIME_CATEGORIES.map(category => ({
        code: category.code,
        name: category.name,
        count: 0,
        minutes: 0
    }));
    let totalCount = 0;
    let totalMinutes = 0;

    events.forEach(event => {
        if (Number(event.category) === 1) return; // Running Production bukan downtime.
        const minutes = getDurationMinutes(event.start, event.end);
        const row = rows.find(item => Number(item.code) === Number(event.category));
        if (!row || minutes <= 0) return;
        row.count++;
        row.minutes += minutes;
        totalCount++;
        totalMinutes += minutes;
    });
    return { rows, totalCount, totalMinutes };
}

function renderDowntimeSummary() {
    const summary = calculateDowntimeSummary();
    const topRow = [...summary.rows].filter(row => row.minutes > 0).sort((a, b) => b.minutes - a.minutes)[0] || null;
    const average = summary.totalCount ? Math.round(summary.totalMinutes / summary.totalCount) : 0;

    setText("dt-total-count", formatNumber(summary.totalCount));
    setText("dt-total-duration", summary.totalMinutes ? formatDuration(summary.totalMinutes) : "0 menit");
    setText("dt-average-duration", summary.totalCount ? formatDuration(average) : "-");
    setText("dt-top-category", topRow ? topRow.name : "-");
    setText("dt-top-detail", topRow ? `${formatDuration(topRow.minutes)} dari total downtime` : "Berdasarkan total durasi");

    const tableRows = summary.rows.map(row => {
        const share = summary.totalMinutes ? row.minutes / summary.totalMinutes * 100 : 0;
        return `<tr class="${row.count ? "" : "muted"}"><td>${row.code}</td><td>${escapeHTML(row.name)}</td><td class="num">${row.count}</td><td class="num">${row.minutes ? formatDuration(row.minutes) : "-"}</td><td><div class="share-cell"><div class="share-bar"><span style="width:${share}%"></span></div><span class="share-text">${formatPercent(share)}</span></div></td></tr>`;
    }).join("");
    const body = document.getElementById("downtime-summary-body");
    if (body) body.innerHTML = tableRows + `<tr class="total-row"><td></td><td>Total Downtime</td><td class="num">${summary.totalCount}</td><td class="num">${formatDuration(summary.totalMinutes)}</td><td class="num">${formatPercent(summary.totalMinutes ? 100 : 0)}</td></tr>`;

    // Dashboard mengambil ringkasan hari ini, bukan akumulasi seluruh riwayat.
    renderDashboardDowntimeSummary(getTodayLocalDate());
}

// ==================================================
// INISIALISASI APLIKASI
// ==================================================

loadDowntimeEventsFromStorage();
loadShiftPicRecordsFromStorage();

fillCategoryOptions();
setupDowntimeFilters();
setupDowntimeForm();
setupShiftPicForm();
setupReportsPage();

renderDowntimeTable();
renderDowntimeSummary();
renderDashboard();
renderProductionPage();

// Perbarui shift aktif, status mesin, dan tanggal secara berkala.
setInterval(function () {
    renderDashboard();
    // Kalau tanggal berganti, halaman Production juga mulai dari catatan tanggal baru.
    renderProductionPage();
}, 30000);
