import { supabase } from "./supabase.js";

const pageKey = document.body.dataset.pageKey;
const pageTitle = document.querySelector("[data-page-title]");
const pageSubtitle = document.querySelector("[data-page-subtitle]");
const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const statusEl = document.querySelector("[data-page-status]");
const totalEl = document.querySelector("[data-stat-total]");
const urgentEl = document.querySelector("[data-stat-urgent]");
const secondaryEl = document.querySelector("[data-stat-secondary]");
const searchInput = document.querySelector("[data-record-search]");
const listEl = document.querySelector("[data-record-list]");
const emptyEl = document.querySelector("[data-empty-state]");
const createButton = document.querySelector("[data-open-create]");
const logoutButton = document.querySelector("[data-logout]");
const modalBackdrop = document.querySelector("[data-modal-backdrop]");
const modalForm = document.querySelector("[data-modal-form]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalFeedback = document.querySelector("[data-modal-feedback]");
const closeModalButton = document.querySelector("[data-close-modal]");
const excelNavLink = document.querySelector('.dashboard-nav a[href="sheets.html"]');

let authUserId = null;
let records = [];
let currentSearch = "";
let modalMode = "create";
let modalItemId = null;
let isSubmitting = false;

const DATE_FORMATTER = new Intl.DateTimeFormat("ka-GE", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tbilisi"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ka-GE", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tbilisi"
});

const formatDate = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return DATE_FORMATTER.format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return DATE_TIME_FORMATTER.format(new Date(value));
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return "";
  const n = Number(bytes);
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};

function getFileKindKey(name, mime) {
  const m = (mime || "").toLowerCase();
  const lower = (name || "").toLowerCase();
  if (m.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (m.includes("word") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "word";
  if (
    m.includes("excel") ||
    m.includes("spreadsheet") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx")
  )
    return "excel";
  if (m.includes("audio") || lower.endsWith(".mp3") || lower.endsWith(".mpeg")) return "audio";
  return "file";
}

function getFileKindLabel(name, mime) {
  const key = getFileKindKey(name, mime);
  const map = { pdf: "PDF", word: "Word", excel: "Excel", audio: "აუდიო", file: "ფაილი" };
  return map[key] || key;
}

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const getNowLocalValue = () => toDateTimeLocalValue(new Date().toISOString());

const getOneHourLaterValue = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return toDateTimeLocalValue(date.toISOString());
};

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const getThreeDaysLaterValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
};

const configs = {
  cases: {
    title: "საქმეები",
    subtitle: "აქ უნდა იყოს სრული სია, სრული ძებნა, დამატება, რედაქტირება და დეტალები.",
    table: "cases",
    ownerColumn: "owner_id",
    select: "id, title, case_number, court_name, status, description, hearing_date, created_at",
    order: { column: "hearing_date", ascending: true },
    empty: "საქმეები ჯერ არ არის დამატებული.",
    searchFields: ["title", "case_number", "court_name", "description", "status"],
    urgentText: (items) => {
      const upcoming = items.find((item) => item.hearing_date);
      return upcoming ? `უახლოესი სხდომა: ${formatDateTime(upcoming.hearing_date)}` : "სხდომა ჯერ მითითებული არ არის";
    },
    secondaryText: (items) => `${items.filter((item) => item.status === "active").length} აქტიური საქმე`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-badge">${escapeHtml(item.status || "active")}</span>
            </div>
            <p>${escapeHtml(item.court_name || "სასამართლო მითითებული არ არის")}</p>
            <div class="record-meta-row">
              <span>${escapeHtml(item.case_number || "საქმის ნომრის გარეშე")}</span>
              <span>${item.hearing_date ? formatDateTime(item.hearing_date) : "სხდომა არ არის ჩანიშნული"}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      const statusValue = item.status || "active";
      return `
        <div class="auth-form-grid">
          <label>საქმის სათაური<input name="title" type="text" value="${escapeHtml(item.title || "")}" required ${disabled}></label>
          <label>საქმის ნომერი<input name="case_number" type="text" value="${escapeHtml(item.case_number || "")}" ${disabled}></label>
        </div>
        <div class="auth-form-grid">
          <label>სასამართლო<input name="court_name" type="text" value="${escapeHtml(item.court_name || "")}" ${disabled}></label>
          <label>სხდომის თარიღი<input name="hearing_date" type="datetime-local" value="${toDateTimeLocalValue(item.hearing_date) || getNowLocalValue()}" ${disabled}></label>
        </div>
        <label>სტატუსი
          <select name="status" ${disabled}>
            <option value="active" ${statusValue === "active" ? "selected" : ""}>active</option>
            <option value="pending" ${statusValue === "pending" ? "selected" : ""}>pending</option>
            <option value="closed" ${statusValue === "closed" ? "selected" : ""}>closed</option>
            <option value="archived" ${statusValue === "archived" ? "selected" : ""}>archived</option>
          </select>
        </label>
        <label>აღწერა<textarea name="description" rows="4" ${disabled}>${escapeHtml(item.description || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        title: String(formData.get("title") || "").trim(),
        case_number: String(formData.get("case_number") || "").trim() || null,
        court_name: String(formData.get("court_name") || "").trim() || null,
        hearing_date: String(formData.get("hearing_date") || "").trim() || null,
        status: String(formData.get("status") || "active"),
        description: String(formData.get("description") || "").trim() || null
      };
    },
    fileConfig: { storageSegment: "cases", dbColumn: "case_id" }
  },
  clients: {
    title: "კლიენტები",
    subtitle: "კლიენტების სრული ბაზა, ძებნა, ბარათები, კონტაქტები და შენიშვნები.",
    table: "clients",
    ownerColumn: "owner_id",
    select: "id, first_name, last_name, phone, email, personal_id, address, notes, created_at",
    order: { column: "created_at", ascending: false },
    empty: "კლიენტები ჯერ არ არის დამატებული.",
    searchFields: ["first_name", "last_name", "phone", "email", "personal_id", "address", "notes"],
    urgentText: (items) => items[0] ? `ბოლო დამატებული: ${items[0].first_name} ${items[0].last_name}` : "ჯერ კლიენტი არ არის დამატებული",
    secondaryText: (items) => `${items.filter((item) => item.phone || item.email).length} კლიენტს აქვს კონტაქტი`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(`${item.first_name || ""} ${item.last_name || ""}`.trim())}</strong>
              <span class="status-badge">კლიენტი</span>
            </div>
            <p>${escapeHtml(item.address || "მისამართი მითითებული არ არის")}</p>
            <div class="record-meta-row">
              <span>${escapeHtml(item.phone || "ტელეფონი არაა")}</span>
              <span>${escapeHtml(item.email || "იმეილი არაა")}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
        <div class="auth-form-grid">
          <label>სახელი<input name="first_name" type="text" value="${escapeHtml(item.first_name || "")}" required ${disabled}></label>
          <label>გვარი<input name="last_name" type="text" value="${escapeHtml(item.last_name || "")}" required ${disabled}></label>
        </div>
        <div class="auth-form-grid">
          <label>ტელეფონი<input name="phone" type="tel" value="${escapeHtml(item.phone || "")}" ${disabled}></label>
          <label>იმეილი<input name="email" type="email" value="${escapeHtml(item.email || "")}" ${disabled}></label>
        </div>
        <label>პირადი ნომერი<input name="personal_id" type="text" value="${escapeHtml(item.personal_id || "")}" ${disabled}></label>
        <label>მისამართი<input name="address" type="text" value="${escapeHtml(item.address || "")}" ${disabled}></label>
        <label>შენიშვნა<textarea name="notes" rows="4" ${disabled}>${escapeHtml(item.notes || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || null,
        email: String(formData.get("email") || "").trim() || null,
        personal_id: String(formData.get("personal_id") || "").trim() || null,
        address: String(formData.get("address") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null
      };
    },
    fileConfig: { storageSegment: "clients", dbColumn: "client_id" }
  },
  documents: {
    title: "დოკუმენტები",
    subtitle: "ყველა დოკუმენტი ერთ სივრცეში: drafts, generated ფაილები და სწრაფი ძებნა.",
    table: "documents",
    ownerColumn: "owner_id",
    select: "id, title, status, body, file_path, created_at",
    order: { column: "created_at", ascending: false },
    empty: "დოკუმენტები ჯერ არ არის დამატებული.",
    searchFields: ["title", "status", "body", "file_path"],
    urgentText: (items) => items[0] ? `ბოლო დოკუმენტი: ${items[0].title}` : "ბოლო დოკუმენტი ჯერ არ არის",
    secondaryText: (items) => `${items.filter((item) => item.status === "draft").length} draft`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-badge">${escapeHtml(item.status || "draft")}</span>
            </div>
            <p>${escapeHtml(item.body || "შინაარსი ჯერ არ არის ჩაწერილი")}</p>
            <div class="record-meta-row">
              <span>${escapeHtml(item.file_path || "ფაილის ბმული არ არის")}</span>
              <span>${formatDate(item.created_at)}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      const statusValue = item.status || "draft";
      return `
        <label>დოკუმენტის სათაური<input name="title" type="text" value="${escapeHtml(item.title || "")}" required ${disabled}></label>
        <div class="auth-form-grid">
          <label>სტატუსი
            <select name="status" ${disabled}>
              <option value="draft" ${statusValue === "draft" ? "selected" : ""}>draft</option>
              <option value="generated" ${statusValue === "generated" ? "selected" : ""}>generated</option>
              <option value="signed" ${statusValue === "signed" ? "selected" : ""}>signed</option>
              <option value="archived" ${statusValue === "archived" ? "selected" : ""}>archived</option>
            </select>
          </label>
          <label>ფაილის ბმული<input name="file_path" type="text" value="${escapeHtml(item.file_path || "")}" ${disabled}></label>
        </div>
        <label>შინაარსი<textarea name="body" rows="5" ${disabled}>${escapeHtml(item.body || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        title: String(formData.get("title") || "").trim(),
        status: String(formData.get("status") || "draft"),
        body: String(formData.get("body") || "").trim() || null,
        file_path: String(formData.get("file_path") || "").trim() || null,
        generated_data: {}
      };
    },
    fileConfig: { storageSegment: "documents", dbColumn: "document_id" }
  },
  transcriptions: {
    title: "AI ტრანსკრიფცია",
    subtitle: "ყველა ტრანსკრიფცია ერთ ადგილას: სტატუსი, ენა, ნედლი ტექსტი და რედაქტირება.",
    table: "transcriptions",
    ownerColumn: "owner_id",
    select: "id, title, status, language_code, raw_text, edited_text, created_at, duration_seconds",
    order: { column: "created_at", ascending: false },
    empty: "ტრანსკრიფციები ჯერ არ არის დამატებული.",
    searchFields: ["title", "status", "language_code", "raw_text", "edited_text"],
    urgentText: (items) => items[0] ? `ბოლო ჩანაწერი: ${items[0].title}` : "ჩანაწერები ჯერ არ არის",
    secondaryText: (items) => `${items.filter((item) => item.status === "processing").length} მუშავდება ახლა`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-badge">${escapeHtml(item.status || "uploaded")}</span>
            </div>
            <p>${escapeHtml(item.edited_text || item.raw_text || "ტექსტი ჯერ არ არის")}</p>
            <div class="record-meta-row">
              <span>${escapeHtml(item.language_code || "ka")}</span>
              <span>${item.duration_seconds ? `${item.duration_seconds} წმ` : "ხანგრძლივობა არაა"}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      const languageValue = item.language_code || "ka";
      const statusValue = item.status || "uploaded";
      return `
        <label>სათაური<input name="title" type="text" value="${escapeHtml(item.title || "")}" required ${disabled}></label>
        <div class="auth-form-grid">
          <label>ენა
            <select name="language_code" ${disabled}>
              <option value="ka" ${languageValue === "ka" ? "selected" : ""}>ქართული</option>
              <option value="en" ${languageValue === "en" ? "selected" : ""}>English</option>
              <option value="ru" ${languageValue === "ru" ? "selected" : ""}>Русский</option>
            </select>
          </label>
          <label>სტატუსი
            <select name="status" ${disabled}>
              <option value="uploaded" ${statusValue === "uploaded" ? "selected" : ""}>uploaded</option>
              <option value="processing" ${statusValue === "processing" ? "selected" : ""}>processing</option>
              <option value="completed" ${statusValue === "completed" ? "selected" : ""}>completed</option>
              <option value="failed" ${statusValue === "failed" ? "selected" : ""}>failed</option>
            </select>
          </label>
        </div>
        <label>ნედლი ტექსტი<textarea name="raw_text" rows="5" ${disabled}>${escapeHtml(item.raw_text || "")}</textarea></label>
        <label>რედაქტირებული ტექსტი<textarea name="edited_text" rows="5" ${disabled}>${escapeHtml(item.edited_text || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        title: String(formData.get("title") || "").trim(),
        language_code: String(formData.get("language_code") || "ka"),
        status: String(formData.get("status") || "uploaded"),
        raw_text: String(formData.get("raw_text") || "").trim() || null,
        edited_text: String(formData.get("edited_text") || "").trim() || null
      };
    },
    fileConfig: { storageSegment: "transcriptions", dbColumn: "transcription_id" }
  },
  deadlines: {
    title: "ვადები",
    subtitle: "აქ უნდა ჩანდეს უკვე ყველა ვადა სრული ძებნით, სტატუსით და ცვლილების მართვით.",
    table: "deadlines",
    ownerColumn: "owner_id",
    select: "id, title, due_date, base_date, status, notes, created_at",
    order: { column: "due_date", ascending: true },
    empty: "ვადები ჯერ არ არის დამატებული.",
    searchFields: ["title", "status", "notes", "base_date", "due_date"],
    urgentText: (items) => {
      const next = items.find((item) => item.status === "upcoming");
      return next ? `უახლოესი ვადა: ${formatDate(next.due_date)}` : "აქტიური ვადა არ არის";
    },
    secondaryText: (items) => `${items.filter((item) => item.status === "upcoming").length} upcoming`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-badge">${escapeHtml(item.status || "upcoming")}</span>
            </div>
            <p>${escapeHtml(item.notes || "შენიშვნა მითითებული არ არის")}</p>
            <div class="record-meta-row">
              <span>საწყისი: ${formatDate(item.base_date)}</span>
              <span>ბოლო ვადა: ${formatDate(item.due_date)}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      const statusValue = item.status || "upcoming";
      return `
        <label>ვადის სათაური<input name="title" type="text" value="${escapeHtml(item.title || "")}" required ${disabled}></label>
        <div class="auth-form-grid">
          <label>საწყისი თარიღი<input name="base_date" type="date" value="${escapeHtml(item.base_date || "") || getTodayValue()}" required ${disabled}></label>
          <label>ბოლო ვადა<input name="due_date" type="date" value="${escapeHtml(item.due_date || "") || getThreeDaysLaterValue()}" required ${disabled}></label>
        </div>
        <label>სტატუსი
          <select name="status" ${disabled}>
            <option value="upcoming" ${statusValue === "upcoming" ? "selected" : ""}>upcoming</option>
            <option value="done" ${statusValue === "done" ? "selected" : ""}>done</option>
            <option value="missed" ${statusValue === "missed" ? "selected" : ""}>missed</option>
          </select>
        </label>
        <label>შენიშვნა<textarea name="notes" rows="4" ${disabled}>${escapeHtml(item.notes || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        title: String(formData.get("title") || "").trim(),
        base_date: String(formData.get("base_date") || "").trim(),
        due_date: String(formData.get("due_date") || "").trim(),
        status: String(formData.get("status") || "upcoming"),
        notes: String(formData.get("notes") || "").trim() || null
      };
    },
    fileConfig: { storageSegment: "deadlines", dbColumn: "deadline_id" }
  },
  events: {
    title: "სხდომები და მოვლენები",
    subtitle: "დეშბორდზე მხოლოდ უახლოესი ჩანს. აქ კი უკვე სრული კალენდარული მოძრაობა და სრული ძებნაა.",
    table: "calendar_events",
    ownerColumn: "owner_id",
    select: "id, title, location, starts_at, ends_at, notes, created_at",
    order: { column: "starts_at", ascending: true },
    empty: "სხდომები და მოვლენები ჯერ არ არის დამატებული.",
    searchFields: ["title", "location", "notes", "starts_at", "ends_at"],
    urgentText: (items) => {
      const next = items.find((item) => new Date(item.starts_at) >= new Date());
      return next ? `უახლოესი სხდომა: ${formatDateTime(next.starts_at)}` : "მომავალი მოვლენა არ არის";
    },
    secondaryText: (items) => `${items.length} მოვლენა სრულ სიაში`,
    render(item) {
      return `
        <article class="record-card">
          <div class="record-card-main">
            <div class="record-card-top">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-badge">მოვლენა</span>
            </div>
            <p>${escapeHtml(item.location || "ადგილმდებარეობა მითითებული არ არის")}</p>
            <div class="record-meta-row">
              <span>${formatDateTime(item.starts_at)}</span>
              <span>${item.ends_at ? formatDateTime(item.ends_at) : "დასასრული არაა"}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-action" type="button" data-action="view" data-id="${item.id}">ნახვა</button>
            <button class="item-action" type="button" data-action="edit" data-id="${item.id}">რედაქტირება</button>
            <button class="item-action danger" type="button" data-action="delete" data-id="${item.id}">წაშლა</button>
          </div>
        </article>
      `;
    },
    fields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
        <label>მოვლენის სათაური<input name="title" type="text" value="${escapeHtml(item.title || "")}" required ${disabled}></label>
        <div class="auth-form-grid">
          <label>დაწყება<input name="starts_at" type="datetime-local" value="${toDateTimeLocalValue(item.starts_at) || getNowLocalValue()}" required ${disabled}></label>
          <label>დასრულება<input name="ends_at" type="datetime-local" value="${toDateTimeLocalValue(item.ends_at) || getOneHourLaterValue()}" ${disabled}></label>
        </div>
        <label>ადგილმდებარეობა<input name="location" type="text" value="${escapeHtml(item.location || "")}" ${disabled}></label>
        <label>შენიშვნა<textarea name="notes" rows="4" ${disabled}>${escapeHtml(item.notes || "")}</textarea></label>
      `;
    },
    payload(formData) {
      return {
        title: String(formData.get("title") || "").trim(),
        starts_at: String(formData.get("starts_at") || "").trim(),
        ends_at: String(formData.get("ends_at") || "").trim() || null,
        location: String(formData.get("location") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null
      };
    },
    fileConfig: { storageSegment: "events", dbColumn: "calendar_event_id" }
  }
};

const config = configs[pageKey];

const SIGNED_URL_TTL_SECONDS = 3600;

function getFileExtensionForStorage(name) {
  const n = String(name);
  const dot = n.lastIndexOf(".");
  if (dot <= 0 || dot === n.length - 1) return "";
  const ext = n.slice(dot);
  return ext.length > 32 ? "" : ext;
}

function buildUniqueStorageObjectName(originalFileName) {
  const ext = getFileExtensionForStorage(originalFileName);
  return `${crypto.randomUUID()}${ext}`;
}

function getEntityStoragePrefix(entityId) {
  if (!authUserId || !config?.fileConfig) return null;
  return `${authUserId}/${config.fileConfig.storageSegment}/${entityId}`;
}

function ensureFilePreviewOverlay() {
  let el = document.getElementById("entity-file-preview");
  if (el) return el;
  el = document.createElement("div");
  el.id = "entity-file-preview";
  el.className = "file-preview-backdrop hidden";
  el.innerHTML = `
    <div class="file-preview-inner">
      <div class="file-preview-bar">
        <span class="file-preview-title" data-preview-title>ფაილი</span>
        <div class="file-preview-actions">
          <a class="nav-login" href="#" target="_blank" rel="noopener noreferrer" data-preview-tab>ახალ ტაბში</a>
          <button type="button" class="nav-cta" data-close-preview>დახურვა</button>
        </div>
      </div>
      <iframe class="file-preview-frame hidden" title="PDF" data-preview-frame></iframe>
      <div class="file-preview-body" data-preview-body></div>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector("[data-close-preview]")?.addEventListener("click", () => closeFilePreview());
  el.addEventListener("click", (event) => {
    if (event.target === el) closeFilePreview();
  });
  return el;
}

function closeFilePreview() {
  const el = document.getElementById("entity-file-preview");
  if (!el) return;
  el.classList.add("hidden");
  const frame = el.querySelector("[data-preview-frame]");
  if (frame) {
    frame.removeAttribute("src");
    frame.classList.add("hidden");
  }
  const body = el.querySelector("[data-preview-body]");
  if (body) body.innerHTML = "";
}

function openFilePreview(url, mime, fileName) {
  const el = ensureFilePreviewOverlay();
  const frame = el.querySelector("[data-preview-frame]");
  const body = el.querySelector("[data-preview-body]");
  const tab = el.querySelector("[data-preview-tab]");
  const title = el.querySelector("[data-preview-title]");
  if (title) title.textContent = fileName || "ფაილი";
  if (tab) tab.href = url;
  el.classList.remove("hidden");
  const isPdf =
    (mime && String(mime).toLowerCase().includes("pdf")) || /\.pdf$/i.test(fileName || "");
  if (isPdf && frame) {
    frame.src = url;
    frame.classList.remove("hidden");
    if (body) body.innerHTML = "";
  } else {
    frame?.classList.add("hidden");
    frame?.removeAttribute("src");
    if (body) {
      body.innerHTML = `<p class="file-preview-note">Word/Excel ფაილი ბრაუზერში არ იხსნება. გახსენი „ახალ ტაბში“ ან ჩამოწერე და რედაქტირება გააკეთე Word/Excel-ში.</p>`;
    }
  }
}

async function getSignedFileAccess(fileId) {
  const { data: row, error } = await supabase
    .from("files")
    .select("storage_path, file_name, mime_type")
    .eq("id", fileId)
    .eq("owner_id", authUserId)
    .single();

  if (error || !row) return null;

  const { data: signed, error: signError } = await supabase.storage
    .from("case-files")
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) return null;

  return {
    url: signed.signedUrl,
    fileName: row.file_name || "ფაილი",
    mime: row.mime_type || "",
    storagePath: row.storage_path
  };
}

async function loadEntityFiles(entityId) {
  const container = document.querySelector("[data-entity-files-list]");
  if (!container || !config.fileConfig) return;

  if (!authUserId) {
    container.innerHTML = "სესია ვერ მოიძებნა.";
    return;
  }

  container.innerHTML = '<div class="entity-files-loading" role="status">იტვირთება...</div>';

  const col = config.fileConfig.dbColumn;
  const { data: rows, error } = await supabase
    .from("files")
    .select("id, file_name, storage_path, mime_type, size_bytes, created_at")
    .eq("owner_id", authUserId)
    .eq(col, entityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "ფაილები ვერ ჩაიტვირთა.";
    return;
  }

  if (!rows?.length) {
    container.innerHTML = `
      <div class="entity-files-empty-state">
        <p class="entity-files-empty-title">ფაილები ჯერ არ არის</p>
        <p class="entity-files-empty-hint">Word, Excel ან PDF ატვირთე — ჩანაწერთან იქნება მიბმული.</p>
      </div>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const name = row.file_name || "ფაილი";
      const mime = row.mime_type || "";
      const size = formatFileSize(row.size_bytes);
      const kindKey = getFileKindKey(name, mime);
      const kindLabel = getFileKindLabel(name, mime);

      return `
        <div class="file-item" data-file-row-id="${row.id}">
          <div class="file-item-icon file-item-icon--${kindKey}" aria-hidden="true"></div>
          <div class="file-item-body">
            <div class="file-item-main">
              <strong class="file-item-name">${escapeHtml(name)}</strong>
              <span class="file-item-meta">${escapeHtml(size)}${mime ? ` · ${escapeHtml(kindLabel)}` : ""}</span>
            </div>
            <div class="file-item-toolbar">
              <div class="file-item-actions file-item-actions--primary">
                <button type="button" class="file-btn file-btn--ghost" data-open-entity-file data-file-id="${row.id}">გახსნა</button>
                <button type="button" class="file-btn file-btn--ghost" data-preview-entity-file data-file-id="${row.id}">დიდი ეკრანი</button>
              </div>
              <div class="file-item-actions file-item-actions--secondary">
                <button type="button" class="file-btn file-btn--ghost" data-download-entity-file data-file-id="${row.id}">ჩამოწერა</button>
                <button type="button" class="file-btn file-btn--danger" data-delete-entity-file data-file-id="${row.id}">წაშლა</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

const closeModal = () => {
  closeFilePreview();
  modalBackdrop.classList.add("hidden");
  modalForm.innerHTML = "";
  modalFeedback.textContent = "";
  modalItemId = null;
  modalMode = "create";
};

const openModal = (mode, item = null) => {
  const safeItem = item || {};
  modalMode = mode;
  modalItemId = safeItem.id || null;
  isSubmitting = false;
  modalBackdrop.classList.remove("hidden");
  modalFeedback.textContent = "";
  modalTitle.textContent =
    mode === "create"
      ? `${config.title} • ახალი ჩანაწერი`
      : mode === "edit"
        ? `${config.title} • რედაქტირება`
        : `${config.title} • დეტალები`;

  const submitButton =
    mode === "view"
      ? ""
      : `
        <div class="modal-actions">
          <button class="nav-login" type="button" data-close-inline>გაუქმება</button>
          <button type="submit" data-submit-button>${mode === "edit" ? "ცვლილების შენახვა" : "დამატება"}</button>
        </div>
      `;

  modalForm.innerHTML = `
  ${config.fields(mode, safeItem)}

  ${
    mode === "view" && config.fileConfig
      ? `
    <section class="entity-files" aria-label="ჩანაწერზე მიბმული ფაილები">
      <div class="entity-files-head">
        <h3 class="entity-files-title">დოკუმენტები და ფაილები</h3>
        <p class="entity-files-hint">Word, Excel, PDF · გახსნა, დიდი ეკრანი (PDF), ჩამოწერა, წაშლა. იგივე სახელით ატვირთვა ჩაანაცვლებს ფაილს.</p>
      </div>
      <div class="entity-files-list-wrap">
        <div class="entity-files-list-inner" data-entity-files-list>იტვირთება...</div>
      </div>
      <div class="entity-files-upload">
        <label class="entity-files-picker">
          <span class="entity-files-picker-label">ფაილის არჩევა</span>
          <input type="file" class="entity-files-input" data-upload-input accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        </label>
        <p class="entity-files-filename" data-upload-filename hidden></p>
        <button type="button" class="entity-files-submit" data-upload-btn>ატვირთვა</button>
      </div>
    </section>
  `
      : ""
  }

  ${submitButton}
`;
  modalForm.querySelector("[data-close-inline]")?.addEventListener("click", closeModal);

  const uploadInput = modalForm.querySelector("[data-upload-input]");
  const uploadNameEl = modalForm.querySelector("[data-upload-filename]");
  uploadInput?.addEventListener("change", (event) => {
    const f = event.target.files?.[0];
    if (!uploadNameEl) return;
    if (f) {
      uploadNameEl.textContent = f.name;
      uploadNameEl.hidden = false;
    } else {
      uploadNameEl.textContent = "";
      uploadNameEl.hidden = true;
    }
  });

  if (mode === "view" && modalItemId && config.fileConfig) {
    loadEntityFiles(modalItemId);
  }
};

const getItemById = (id) => records.find((item) => item.id === id);

const filteredRecords = () => {
  if (!currentSearch) return records;
  const needle = currentSearch.toLowerCase();
  return records.filter((item) =>
    config.searchFields.some((field) => String(item[field] || "").toLowerCase().includes(needle))
  );
};

const renderRecords = () => {
  const items = filteredRecords();
  totalEl.textContent = String(records.length);
  urgentEl.textContent = config.urgentText(records);
  secondaryEl.textContent = config.secondaryText(records);

  if (!items.length) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    emptyEl.textContent = currentSearch ? "ძებნის მიხედვით ჩანაწერი ვერ მოიძებნა." : config.empty;
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.innerHTML = items.map((item) => config.render(item)).join("");
};

const fetchRecords = async () => {
  statusEl.textContent = "მონაცემები იტვირთება...";

  const [{ data: profile, error: profileError }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUserId).single(),
    supabase
      .from(config.table)
      .select(config.select)
      .eq(config.ownerColumn, authUserId)
      .order(config.order.column, { ascending: config.order.ascending })
  ]);

  if (profileError || error) {
    statusEl.textContent = "ჩატვირთვა ვერ მოხერხდა.";
    return;
  }

  records = data || [];
  userName.textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "კაბინეტი";
  userMeta.textContent = profile.bureau_name || "სამუშაო სივრცე";
  pageTitle.textContent = config.title;
  pageSubtitle.textContent = config.subtitle;
  statusEl.textContent = `${config.title} გვერდზე ჩანს სრული სია, ხოლო dashboard-ზე მხოლოდ მოკლე preview.`;
  renderRecords();
};

const deleteRecord = async (id) => {
  if (!window.confirm("ნამდვილად გინდა ამ ჩანაწერის წაშლა?")) return;

  const { error } = await supabase
    .from(config.table)
    .delete()
    .eq("id", id)
    .eq(config.ownerColumn, authUserId);

  if (error) {
    statusEl.textContent = "წაშლა ვერ მოხერხდა.";
    return;
  }

  await fetchRecords();
  statusEl.textContent = "ჩანაწერი წაიშალა.";
};

listEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const item = getItemById(id);
  if (!item) return;

  if (action === "view") openModal("view", item);
  if (action === "edit") openModal("edit", item);
  if (action === "delete") await deleteRecord(id);
});

createButton?.addEventListener("click", () => openModal("create"));
closeModalButton?.addEventListener("click", closeModal);
modalBackdrop?.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

searchInput?.addEventListener("input", (event) => {
  currentSearch = event.target.value.trim();
  renderRecords();
});

modalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const formData = new FormData(modalForm);
  const payload = config.payload(formData);
  const submitButton = modalForm.querySelector("[data-submit-button]");

  isSubmitting = true;
  modalFeedback.textContent = "ინახება...";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "ინახება...";
  }

  try {
    const query =
      modalMode === "edit"
        ? supabase.from(config.table).update(payload).eq("id", modalItemId).eq(config.ownerColumn, authUserId)
        : supabase.from(config.table).insert({ [config.ownerColumn]: authUserId, ...payload });

    const { error } = await query;

    if (error) {
      modalFeedback.textContent = `შენახვა ვერ მოხერხდა: ${error.message}`;
      return;
    }

    const savedMode = modalMode;
    closeModal();
    await fetchRecords();
    statusEl.textContent = savedMode === "edit" ? "ჩანაწერი განახლდა." : "ახალი ჩანაწერი დაემატა.";
  } catch (error) {
    modalFeedback.textContent = `შეცდომა: ${error.message || "შენახვა ვერ მოხერხდა."}`;
  } finally {
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = modalMode === "edit" ? "ცვლილების შენახვა" : "დამატება";
    }
  }
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});


async function init() {
  if (!config) {
    statusEl.textContent = "გვერდის კონფიგურაცია ვერ მოიძებნა.";
    return;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  authUserId = session.user.id;

  excelNavLink?.addEventListener("click", async (event) => {
    event.preventDefault();

    const { data: profile } = await supabase
      .from("profiles")
      .select("sheet_url")
      .eq("id", authUserId)
      .single();

    const target = profile?.sheet_url || "./sheets.html?manage=1";
    window.open(target, "_blank", "noopener,noreferrer");
  });

  await fetchRecords();
}

init();

document.addEventListener("click", async (e) => {
  const uploadBtn = e.target.closest("[data-upload-btn]");
  if (uploadBtn) {
    const input = document.querySelector("[data-upload-input]");
    const file = input?.files?.[0];

    if (!file) {
      window.alert("აირჩიე ფაილი");
      return;
    }

    if (!modalItemId || !authUserId || !config.fileConfig) {
      window.alert("სესია ან ჩანაწერი ვერ მოიძებნა");
      return;
    }

    const prefix = getEntityStoragePrefix(modalItemId);
    if (!prefix) {
      window.alert("ფაილის მისამართი ვერ დაგენერირდა");
      return;
    }

    const { data: sameNameRows, error: sameNameErr } = await supabase
      .from("files")
      .select("id, storage_path")
      .eq("owner_id", authUserId)
      .eq(config.fileConfig.dbColumn, modalItemId)
      .eq("file_name", file.name);

    if (sameNameErr) {
      console.error(sameNameErr);
    } else if (sameNameRows?.length) {
      const paths = sameNameRows.map((row) => row.storage_path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("case-files").remove(paths);
      }
      await supabase
        .from("files")
        .delete()
        .eq("owner_id", authUserId)
        .eq(config.fileConfig.dbColumn, modalItemId)
        .eq("file_name", file.name);
    }

    const storageObjectName = buildUniqueStorageObjectName(file.name);
    const path = `${prefix}/${storageObjectName}`;

    const { error: uploadError } = await supabase.storage.from("case-files").upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    });

    if (uploadError) {
      window.alert(`ატვირთვა ვერ მოხერხდა: ${uploadError.message || "უცნობი შეცდომა"}`);
      console.error(uploadError);
      return;
    }

    const insertPayload = {
      owner_id: authUserId,
      file_kind: "document",
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size != null ? file.size : null
    };
    insertPayload[config.fileConfig.dbColumn] = modalItemId;

    const { error: dbError } = await supabase.from("files").insert(insertPayload);

    if (dbError) {
      console.error(dbError);
      await supabase.storage.from("case-files").remove([path]);
      window.alert(
        `ბაზაში ვერ შეინახა: ${dbError.message}. გაუშვი Supabase-ში supabase-migration-files-entity-fks.sql თუ სვეტები ჯერ არ გაქვს.`
      );
      return;
    }

    if (input) input.value = "";
    window.alert("ატვირთულია!");
    loadEntityFiles(modalItemId);
    return;
  }

  const openBtn = e.target.closest("[data-open-entity-file]");
  if (openBtn) {
    e.preventDefault();
    const acc = await getSignedFileAccess(openBtn.dataset.fileId);
    if (!acc) {
      window.alert("ბმული ვერ მოიძებნა");
      return;
    }
    window.open(acc.url, "_blank", "noopener,noreferrer");
    return;
  }

  const previewBtn = e.target.closest("[data-preview-entity-file]");
  if (previewBtn) {
    e.preventDefault();
    const acc = await getSignedFileAccess(previewBtn.dataset.fileId);
    if (!acc) {
      window.alert("ბმული ვერ მოიძებნა");
      return;
    }
    openFilePreview(acc.url, acc.mime, acc.fileName);
    return;
  }

  const downloadBtn = e.target.closest("[data-download-entity-file]");
  if (downloadBtn) {
    e.preventDefault();
    const acc = await getSignedFileAccess(downloadBtn.dataset.fileId);
    if (!acc) {
      window.alert("ბმული ვერ მოიძებნა");
      return;
    }
    const a = document.createElement("a");
    a.href = acc.url;
    a.download = acc.fileName;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const deleteBtn = e.target.closest("[data-delete-entity-file]");
  if (deleteBtn) {
    e.preventDefault();
    if (!window.confirm("ნამდვილად წავშალო ეს ფაილი?")) return;

    const { data: row, error: selErr } = await supabase
      .from("files")
      .select("storage_path")
      .eq("id", deleteBtn.dataset.fileId)
      .eq("owner_id", authUserId)
      .single();

    if (selErr || !row) {
      window.alert("ფაილი ვერ მოიძებნა");
      return;
    }

    await supabase.storage.from("case-files").remove([row.storage_path]);

    const { error: delErr } = await supabase
      .from("files")
      .delete()
      .eq("id", deleteBtn.dataset.fileId)
      .eq("owner_id", authUserId);

    if (delErr) {
      window.alert("წაშლა ვერ მოხერხდა");
      return;
    }

    if (modalItemId) loadEntityFiles(modalItemId);
  }
});
