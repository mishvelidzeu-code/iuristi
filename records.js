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

let authUserId = null;
let records = [];
let currentSearch = "";
let modalMode = "create";
let modalItemId = null;
let isSubmitting = false;

const formatDate = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium" }).format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return new Intl.DateTimeFormat("ka-GE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  }
};

const config = configs[pageKey];

const closeModal = () => {
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

  modalForm.innerHTML = `${config.fields(mode, safeItem)}${submitButton}`;
  modalForm.querySelector("[data-close-inline]")?.addEventListener("click", closeModal);
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
  await fetchRecords();
}

init();
