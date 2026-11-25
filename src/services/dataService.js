import { apiRequest, unwrapCollection, unwrapData } from "../api";

export function shiftToLabel(shift) {
  if (shift === 1 || shift === "1" || shift === "shift1" || shift === "Shift 1") return "Shift 1";
  if (shift === 2 || shift === "2" || shift === "shift2" || shift === "Shift 2") return "Shift 2";
  return String(shift || "");
}

export function shiftToId(shift) {
  if (shift === 1 || shift === "1" || shift === "shift1" || shift === "Shift 1") return 1;
  if (shift === 2 || shift === "2" || shift === "shift2" || shift === "Shift 2") return 2;
  const n = Number(shift);
  return Number.isFinite(n) ? n : shift;
}

export function normalizeMaster(item) {
  if (!item) return item;
  return {
    machine: item.machine || "",
    partNumber: item.partNumber || "",
    rpm: Number(item.rpm || 0),
    pcsPerRev: Number(item.pcsPerRev ?? item.pcsPerRevolution ?? 1) || 1,
    customer: item.customer || "",
    sizePart: item.sizePart || "",
    picShift1: item.picShift1 || "",
    picShift2: item.picShift2 || "",
    partOptions: Array.isArray(item.partOptions) ? item.partOptions : [],
    notes: item.notes || "",
    isConfigured: !!item.isConfigured,
    updatedAt: item.updatedAt || null,
  };
}

export function normalizeProductionRecord(item) {
  if (!item) return item;
  return {
    id: item.id,
    date: item.date || "",
    shift: shiftToLabel(item.shift),
    machine: item.machine || "",
    partNumber: item.partNumber || "",
    startTime: (item.startTime || "").slice(0, 5),
    endTime: (item.endTime || "").slice(0, 5),
    counterStart: item.counterStart ?? null,
    counterEnd: item.counterEnd ?? null,
    output: Number(item.output || 0),
    pic: item.pic || "",
    notes: item.notes || "",
    rpm: item.rpm ?? null,
    targetOutput: item.targetOutput ?? null,
    productivity: item.productivity ?? null,
    updatedAt: item.updatedAt || null,
  };
}

export function normalizeDowntimeEvent(item) {
  if (!item) return item;
  return {
    id: item.id,
    date: item.date || "",
    machine: item.machine || "",
    category: item.category || "",
    categoryCode: item.categoryCode ?? null,
    startAt: item.startAt || null,
    endAt: item.endAt || null,
    pic: item.pic || "",
    notes: item.notes || "",
    shift: item.shift ? shiftToLabel(item.shift) : "",
    durationMinutes: item.durationMinutes ?? null,
    status: item.status || (item.endAt ? "finished" : "active"),
    updatedAt: item.updatedAt || null,
  };
}

export function normalizeShiftAssignment(item) {
  if (!item) return item;
  return {
    id: item.id,
    key: `${item.date}-${shiftToId(item.shift)}-${item.machine}`,
    date: item.date || "",
    shift: shiftToLabel(item.shift),
    machine: item.machine || "",
    pic: item.pic || "",
    notes: item.notes || "",
    updatedAt: item.updatedAt || null,
  };
}

export async function fetchMasters() {
  const payload = await apiRequest("/master-productions");
  return unwrapCollection(payload).map(normalizeMaster);
}

export async function saveMaster(machineName, data) {
  const encoded = encodeURIComponent(machineName);
  const payload = await apiRequest(`/master-productions/${encoded}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return normalizeMaster(unwrapData(payload));
}

export async function fetchProductionRecords(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const payload = await apiRequest(`/production-records${suffix}`);
  return unwrapCollection(payload).map(normalizeProductionRecord);
}

export async function createProductionRecord(data) {
  const payload = await apiRequest("/production-records", {
    method: "POST",
    body: JSON.stringify({ ...data, shift: shiftToId(data.shift) }),
  });
  return normalizeProductionRecord(unwrapData(payload));
}

export async function updateProductionRecord(id, data) {
  const payload = await apiRequest(`/production-records/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, shift: shiftToId(data.shift) }),
  });
  return normalizeProductionRecord(unwrapData(payload));
}

export async function deleteProductionRecord(id) {
  await apiRequest(`/production-records/${id}`, { method: "DELETE" });
}

export async function fetchDowntimeEvents(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const payload = await apiRequest(`/downtime-events${suffix}`);
  return unwrapCollection(payload).map(normalizeDowntimeEvent);
}

export async function createDowntimeEvent(data) {
  const payload = await apiRequest("/downtime-events", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeDowntimeEvent(unwrapData(payload));
}

export async function updateDowntimeEvent(id, data) {
  const payload = await apiRequest(`/downtime-events/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return normalizeDowntimeEvent(unwrapData(payload));
}

export async function finishDowntimeEvent(id) {
  const payload = await apiRequest(`/downtime-events/${id}/finish`, { method: "PATCH" });
  return normalizeDowntimeEvent(unwrapData(payload));
}

export async function deleteDowntimeEvent(id) {
  await apiRequest(`/downtime-events/${id}`, { method: "DELETE" });
}

export async function fetchShiftAssignments(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const payload = await apiRequest(`/shift-assignments${suffix}`);
  return unwrapCollection(payload).map(normalizeShiftAssignment);
}

export async function saveShiftAssignment(data) {
  const payload = await apiRequest("/shift-assignments", {
    method: "POST",
    body: JSON.stringify({ ...data, shift: shiftToId(data.shift) }),
  });
  return normalizeShiftAssignment(unwrapData(payload));
}

export async function updateShiftAssignment(id, data) {
  const payload = await apiRequest(`/shift-assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, shift: shiftToId(data.shift) }),
  });
  return normalizeShiftAssignment(unwrapData(payload));
}

export async function deleteShiftAssignment(id) {
  await apiRequest(`/shift-assignments/${id}`, { method: "DELETE" });
}

export async function bulkSaveShiftAssignments(date, shift, assignments) {
  const payload = await apiRequest("/shift-assignments/bulk", {
    method: "POST",
    body: JSON.stringify({ date, shift: shiftToId(shift), assignments }),
  });
  return unwrapCollection(payload).map(normalizeShiftAssignment);
}

export async function resetOperationalData(resetMasters = true) {
  return apiRequest("/admin/reset-operational-data", {
    method: "POST",
    body: JSON.stringify({ resetMasters }),
  });
}
