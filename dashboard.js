import { supabase } from "./supabase.js";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");
const todayFocus = document.querySelector("[data-today-focus]");
const balance = document.querySelector("[data-balance]");
const casesCount = document.querySelector("[data-cases-count]");
const eventsCount = document.querySelector("[data-events-count]");
const transcriptionsCount = document.querySelector("[data-transcriptions-count]");
const openDocsCount = document.querySelector("[data-open-docs-count]");
const clientsCount = document.querySelector("[data-clients-count]");
const transactionsList = document.querySelector("[data-transactions-list]");
const casesList = document.querySelector("[data-cases-list]");
const deadlinesList = document.querySelector("[data-deadlines-list]");
const documentsList = document.querySelector("[data-documents-list]");
const transcriptionsList = document.querySelector("[data-transcriptions-list]");
const eventsList = document.querySelector("[data-events-list]");
const clientsList = document.querySelector("[data-clients-list]");
const logoutButton = document.querySelector("[data-logout]");
const searchInputs = document.querySelectorAll("[data-search]");
const globalSearchInput = document.querySelector("[data-global-search]");
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const modalBackdrop = document.querySelector("[data-modal-backdrop]");
const modalForm = document.querySelector("[data-modal-form]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalFeedback = document.querySelector("[data-modal-feedback]");
const closeModalButton = document.querySelector("[data-close-modal]");

let authUserId = null;
let modalState = { type: null, mode: "create", itemId: null };
let dashboardData = {
  transactions: [],
  cases: [],
  deadlines: [],
  documents: [],
  transcriptions: [],
  events: [],
  clients: []
};

const filters = {
  global: "",
  transactions: "",
  cases: "",
  deadlines: "",
  documents: "",
  transcriptions: "",
  events: "",
  clients: ""
};

const modalDefinitions = {
  client: {
    title: "ახალი კლიენტი",
    getTitle(mode) {
      return mode === "edit" ? "კლიენტის რედაქტირება" : mode === "view" ? "კლიენტის დეტალები" : "ახალი კლიენტი";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <div class="auth-form-grid">
        <label>სახელი<input name="first_name" type="text" value="${item.first_name || ""}" required ${disabled}></label>
        <label>გვარი<input name="last_name" type="text" value="${item.last_name || ""}" required ${disabled}></label>
      </div>
      <div class="auth-form-grid">
        <label>ტელეფონი<input name="phone" type="tel" value="${item.phone || ""}" ${disabled}></label>
        <label>ელფოსტა<input name="email" type="email" value="${item.email || ""}" ${disabled}></label>
      </div>
      <label>პირადი ნომერი<input name="personal_id" type="text" value="${item.personal_id || ""}" ${disabled}></label>
      <label>მისამართი<input name="address" type="text" value="${item.address || ""}" ${disabled}></label>
      <label>შენიშვნა<textarea name="notes" rows="3" ${disabled}>${item.notes || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "კლიენტის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const payload = {
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || null,
        email: String(formData.get("email") || "").trim() || null,
        personal_id: String(formData.get("personal_id") || "").trim() || null,
        address: String(formData.get("address") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null
      };
      return modalState.mode === "edit"
        ? supabase.from("clients").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("clients").insert({ owner_id: authUserId, ...payload });
    }
  },
  case: {
    title: "ახალი საქმე",
    getTitle(mode) {
      return mode === "edit" ? "საქმის რედაქტირება" : mode === "view" ? "საქმის დეტალები" : "ახალი საქმე";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <div class="auth-form-grid">
        <label>საქმის სათაური<input name="title" type="text" value="${item.title || ""}" required ${disabled}></label>
        <label>საქმის ნომერი<input name="case_number" type="text" value="${item.case_number || ""}" ${disabled}></label>
      </div>
      <div class="auth-form-grid">
        <label>სასამართლო<input name="court_name" type="text" value="${item.court_name || ""}" ${disabled}></label>
        <label>სხდომის თარიღი<input name="hearing_date" type="datetime-local" value="${item.hearing_date ? new Date(item.hearing_date).toISOString().slice(0,16) : ""}" ${disabled}></label>
      </div>
      <label>აღწერა<textarea name="description" rows="3" ${disabled}>${item.description || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "საქმის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const hearingDate = String(formData.get("hearing_date") || "").trim();
      const payload = {
        title: String(formData.get("title") || "").trim(),
        case_number: String(formData.get("case_number") || "").trim() || null,
        court_name: String(formData.get("court_name") || "").trim() || null,
        description: String(formData.get("description") || "").trim() || null,
        hearing_date: hearingDate || null,
        status: "active"
      };
      return modalState.mode === "edit"
        ? supabase.from("cases").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("cases").insert({ owner_id: authUserId, ...payload });
    }
  },
  document: {
    title: "ახალი დოკუმენტი",
    getTitle(mode) {
      return mode === "edit" ? "დოკუმენტის რედაქტირება" : mode === "view" ? "დოკუმენტის დეტალები" : "ახალი დოკუმენტი";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <label>დოკუმენტის სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>სტატუსი
          <select name="status" ${disabled}>
            <option value="draft" ${item.status === "draft" ? "selected" : ""}>draft</option>
            <option value="generated" ${item.status === "generated" ? "selected" : ""}>generated</option>
            <option value="signed" ${item.status === "signed" ? "selected" : ""}>signed</option>
            <option value="archived" ${item.status === "archived" ? "selected" : ""}>archived</option>
          </select>
        </label>
        <label>ფაილის ბმული / path<input name="file_path" type="text" value="${item.file_path || ""}" ${disabled}></label>
      </div>
      <label>დოკუმენტის სათაური<input name="title" type="text" value="${item.title || ""}" required ${disabled}></label>
      <label>შინაარსი<textarea name="body" rows="4" ${disabled}>${item.body || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "დოკუმენტის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const payload = {
        title: String(formData.get("title") || "").trim(),
        status: String(formData.get("status") || "draft"),
        body: String(formData.get("body") || "").trim() || null,
        file_path: String(formData.get("file_path") || "").trim() || null,
        generated_data: {}
      };
      return modalState.mode === "edit"
        ? supabase.from("documents").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("documents").insert({ owner_id: authUserId, ...payload });
    }
  },
  transcription: {
    title: "ახალი ტრანსკრიფცია",
    getTitle(mode) {
      return mode === "edit" ? "ტრანსკრიფციის რედაქტირება" : mode === "view" ? "ტრანსკრიფციის დეტალები" : "ახალი ტრანსკრიფცია";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <label>სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>ენა
          <select name="language_code" ${disabled}>
            <option value="ka" ${item.language_code === "ka" ? "selected" : ""}>ქართული</option>
            <option value="en" ${item.language_code === "en" ? "selected" : ""}>English</option>
            <option value="ru" ${item.language_code === "ru" ? "selected" : ""}>Русский</option>
          </select>
        </label>
        <label>სტატუსი
          <select name="status" ${disabled}>
            <option value="uploaded" ${item.status === "uploaded" ? "selected" : ""}>uploaded</option>
            <option value="processing" ${item.status === "processing" ? "selected" : ""}>processing</option>
            <option value="completed" ${item.status === "completed" ? "selected" : ""}>completed</option>
            <option value="failed" ${item.status === "failed" ? "selected" : ""}>failed</option>
          </select>
        </label>
      </div>
      <label>სათაური<input name="title" type="text" value="${item.title || ""}" required ${disabled}></label>
      <label>ნედლი ტექსტი<textarea name="raw_text" rows="4" ${disabled}>${item.raw_text || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "ტრანსკრიფციის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const payload = {
        title: String(formData.get("title") || "").trim(),
        language_code: String(formData.get("language_code") || "ka"),
        status: String(formData.get("status") || "uploaded"),
        raw_text: String(formData.get("raw_text") || "").trim() || null
      };
      return modalState.mode === "edit"
        ? supabase.from("transcriptions").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("transcriptions").insert({ owner_id: authUserId, ...payload });
    }
  },
  deadline: {
    title: "ახალი ვადა",
    getTitle(mode) {
      return mode === "edit" ? "ვადის რედაქტირება" : mode === "view" ? "ვადის დეტალები" : "ახალი ვადა";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <label>ვადის სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>ვადის სათაური<input name="title" type="text" value="${item.title || ""}" required ${disabled}></label>
        <label>საწყისი თარიღი<input name="base_date" type="date" value="${item.base_date || ""}" required ${disabled}></label>
      </div>
      <div class="auth-form-grid">
        <label>ბოლო ვადა<input name="due_date" type="date" value="${item.due_date || ""}" required ${disabled}></label>
        <label>სტატუსი
          <select name="status" ${disabled}>
            <option value="upcoming" ${item.status === "upcoming" ? "selected" : ""}>upcoming</option>
            <option value="done" ${item.status === "done" ? "selected" : ""}>done</option>
            <option value="missed" ${item.status === "missed" ? "selected" : ""}>missed</option>
          </select>
        </label>
      </div>
      <label>შენიშვნა<textarea name="notes" rows="3" ${disabled}>${item.notes || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "ვადის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const payload = {
        title: String(formData.get("title") || "").trim(),
        base_date: String(formData.get("base_date") || "").trim(),
        due_date: String(formData.get("due_date") || "").trim(),
        status: String(formData.get("status") || "upcoming"),
        notes: String(formData.get("notes") || "").trim() || null
      };
      return modalState.mode === "edit"
        ? supabase.from("deadlines").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("deadlines").insert({ owner_id: authUserId, ...payload });
    }
  },
  event: {
    title: "ახალი მოვლენა",
    getTitle(mode) {
      return mode === "edit" ? "მოვლენის რედაქტირება" : mode === "view" ? "მოვლენის დეტალები" : "ახალი მოვლენა";
    },
    getFields(mode, item = {}) {
      const disabled = mode === "view" ? "disabled" : "";
      return `
      <label>მოვლენის სათაური<input name="title" type="text" value="${item.title || ""}" required ${disabled}></label>
      <div class="auth-form-grid">
        <label>დაწყება<input name="starts_at" type="datetime-local" value="${item.starts_at ? new Date(item.starts_at).toISOString().slice(0,16) : ""}" required ${disabled}></label>
        <label>დასრულება<input name="ends_at" type="datetime-local" value="${item.ends_at ? new Date(item.ends_at).toISOString().slice(0,16) : ""}" ${disabled}></label>
      </div>
      <label>ადგილმდებარეობა<input name="location" type="text" value="${item.location || ""}" ${disabled}></label>
      <label>შენიშვნა<textarea name="notes" rows="3" ${disabled}>${item.notes || ""}</textarea></label>
      ${mode === "view" ? "" : `<button type="submit">${mode === "edit" ? "ცვლილების შენახვა" : "მოვლენის დამატება"}</button>`}
    `;
    },
    async submit(formData) {
      const payload = {
        title: String(formData.get("title") || "").trim(),
        starts_at: String(formData.get("starts_at") || "").trim(),
        ends_at: String(formData.get("ends_at") || "").trim() || null,
        location: String(formData.get("location") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null
      };
      return modalState.mode === "edit"
        ? supabase.from("calendar_events").update(payload).eq("id", modalState.itemId).eq("owner_id", authUserId)
        : supabase.from("calendar_events").insert({ owner_id: authUserId, ...payload });
    }
  }
};

function setStatus(message, type = "info") {
  if (!dashboardStatus) return;
  dashboardStatus.textContent = message;
  dashboardStatus.dataset.state = type;
}

function setModalFeedback(message, type = "info") {
  if (!modalFeedback) return;
  modalFeedback.textContent = message;
  modalFeedback.dataset.state = type;
}

function lari(amount) {
  return new Intl.NumberFormat("ka-GE", {
    style: "currency",
    currency: "GEL",
    minimumFractionDigits: 2
  }).format(Number(amount || 0));
}

function safeDate(value, includeTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("ka-GE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  });
}

function matchesFilter(text, specificFilter) {
  const haystack = String(text || "").toLowerCase();
  const global = filters.global.toLowerCase();
  const local = String(specificFilter || "").toLowerCase();
  return (!global || haystack.includes(global)) && (!local || haystack.includes(local));
}

function renderList(container, items, emptyText) {
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item) => `<li>${item}</li>`).join("")
    : `<li>${emptyText}</li>`;
}

function buildActionButtons(type, id) {
  return `
    <div class="item-actions">
      <button type="button" class="item-action" data-action="view" data-type="${type}" data-id="${id}">ნახვა</button>
      <button type="button" class="item-action" data-action="edit" data-type="${type}" data-id="${id}">რედაქტირება</button>
      <button type="button" class="item-action danger" data-action="delete" data-type="${type}" data-id="${id}">წაშლა</button>
    </div>
  `;
}

function renderRichList(container, items, emptyText) {
  if (!container) return;
  container.innerHTML = items.length
    ? items.join("")
    : `<li>${emptyText}</li>`;
}

function findItem(type, id) {
  const map = {
    client: dashboardData.clients,
    case: dashboardData.cases,
    document: dashboardData.documents,
    transcription: dashboardData.transcriptions,
    deadline: dashboardData.deadlines,
    event: dashboardData.events
  };
  return (map[type] || []).find((item) => item.id === id) || null;
}

async function fetchSingle(queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data;
}

async function fetchOptional(queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data || [];
}

function summarizeDay(activeCases, deadlines, events) {
  return `${deadlines.length} აქტიური ვადა • ${events.length} სხდომა/მოვლენა • ${activeCases.length} სამუშაო საქმე`;
}

function applyFiltersAndRender() {
  const filteredTransactions = dashboardData.transactions.filter((item) =>
    matchesFilter(`${item.description} ${item.transaction_type} ${item.amount}`, filters.transactions)
  );
  const filteredCases = dashboardData.cases.filter((item) =>
    matchesFilter(`${item.title} ${item.case_number} ${item.court_name} ${item.description}`, filters.cases)
  );
  const filteredDeadlines = dashboardData.deadlines.filter((item) =>
    matchesFilter(`${item.title} ${item.notes} ${item.due_date}`, filters.deadlines)
  );
  const filteredDocuments = dashboardData.documents.filter((item) =>
    matchesFilter(`${item.title} ${item.status} ${item.body}`, filters.documents)
  );
  const filteredTranscriptions = dashboardData.transcriptions.filter((item) =>
    matchesFilter(`${item.title} ${item.status} ${item.raw_text}`, filters.transcriptions)
  );
  const filteredEvents = dashboardData.events.filter((item) =>
    matchesFilter(`${item.title} ${item.location} ${item.notes}`, filters.events)
  );
  const filteredClients = dashboardData.clients.filter((item) =>
    matchesFilter(`${item.first_name} ${item.last_name} ${item.phone} ${item.email} ${item.personal_id}`, filters.clients)
  );

  renderList(
    transactionsList,
    filteredTransactions.map((item) => `${lari(item.amount)} • ${item.description || item.transaction_type || "ოპერაცია"}`),
    "ფინანსური ოპერაციები ვერ მოიძებნა."
  );
  renderRichList(
    casesList,
    filteredCases.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${item.title || "უსათაურო საქმე"}</strong>
          <span>${item.court_name || "სასამართლო არ არის მითითებული"}${item.hearing_date ? ` • სხდომა ${safeDate(item.hearing_date)}` : ""}</span>
        </div>
        ${buildActionButtons("case", item.id)}
      </li>`),
    "საქმეები ვერ მოიძებნა."
  );
  renderRichList(
    deadlinesList,
    filteredDeadlines.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${item.title || "ვადა"}</strong>
          <span>${safeDate(item.due_date)}${item.notes ? ` • ${item.notes}` : ""}</span>
        </div>
        ${buildActionButtons("deadline", item.id)}
      </li>`),
    "ვადები ვერ მოიძებნა."
  );
  renderRichList(
    documentsList,
    filteredDocuments.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${item.title || "დოკუმენტი"}</strong>
          <span>${item.status || "draft"}${item.file_path ? ` • ${item.file_path}` : ""}</span>
        </div>
        ${buildActionButtons("document", item.id)}
      </li>`),
    "დოკუმენტები ვერ მოიძებნა."
  );
  renderRichList(
    transcriptionsList,
    filteredTranscriptions.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${item.title || "ტრანსკრიფცია"}</strong>
          <span>${item.status || "uploaded"} • ${item.language_code || "ka"}</span>
        </div>
        ${buildActionButtons("transcription", item.id)}
      </li>`),
    "ტრანსკრიფციები ვერ მოიძებნა."
  );
  renderRichList(
    eventsList,
    filteredEvents.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${item.title || "მოვლენა"}</strong>
          <span>${safeDate(item.starts_at, true)}${item.location ? ` • ${item.location}` : ""}</span>
        </div>
        ${buildActionButtons("event", item.id)}
      </li>`),
    "მოვლენები ვერ მოიძებნა."
  );
  renderRichList(
    clientsList,
    filteredClients.map((item) => `
      <li class="dashboard-item">
        <div class="item-main">
          <strong>${[item.first_name, item.last_name].filter(Boolean).join(" ") || "კლიენტი"}</strong>
          <span>${item.phone ? `${item.phone}` : "ტელეფონი არ არის"}${item.email ? ` • ${item.email}` : ""}</span>
        </div>
        ${buildActionButtons("client", item.id)}
      </li>`),
    "კლიენტები ვერ მოიძებნა."
  );
}

async function loadDashboardData() {
  const [transactions, activeCases, deadlines, documents, transcriptions, events, clients] = await Promise.all([
    fetchOptional(supabase.from("wallet_transactions").select("*").eq("user_id", authUserId).order("created_at", { ascending: false }).limit(20)),
    fetchOptional(supabase.from("cases").select("*").eq("owner_id", authUserId).eq("status", "active").order("created_at", { ascending: false }).limit(20)),
    fetchOptional(supabase.from("deadlines").select("*").eq("owner_id", authUserId).eq("status", "upcoming").order("due_date", { ascending: true }).limit(20)),
    fetchOptional(supabase.from("documents").select("*").eq("owner_id", authUserId).order("created_at", { ascending: false }).limit(20)),
    fetchOptional(supabase.from("transcriptions").select("*").eq("owner_id", authUserId).order("created_at", { ascending: false }).limit(20)),
    fetchOptional(supabase.from("calendar_events").select("*").eq("owner_id", authUserId).order("starts_at", { ascending: true }).limit(20)),
    fetchOptional(supabase.from("clients").select("*").eq("owner_id", authUserId).order("created_at", { ascending: false }).limit(20))
  ]);

  dashboardData = { transactions, cases: activeCases, deadlines, documents, transcriptions, events, clients };

  balance.textContent = lari(transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  casesCount.textContent = String(activeCases.length);
  eventsCount.textContent = String(events.length);
  transcriptionsCount.textContent = String(transcriptions.length);
  openDocsCount.textContent = String(documents.length);
  clientsCount.textContent = String(clients.length);
  todayFocus.textContent = summarizeDay(activeCases, deadlines, events);

  applyFiltersAndRender();
}

function openModal(type, mode = "create", item = null) {
  const definition = modalDefinitions[type];
  if (!definition) return;
  modalState = { type, mode, itemId: item?.id || null };
  modalTitle.textContent = definition.getTitle ? definition.getTitle(mode) : definition.title;
  modalForm.innerHTML = definition.getFields ? definition.getFields(mode, item) : definition.fields;
  modalForm.dataset.modalType = type;
  setModalFeedback("", "info");
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalForm.innerHTML = "";
  modalForm.dataset.modalType = "";
  modalState = { type: null, mode: "create", itemId: null };
  setModalFeedback("", "info");
}

async function deleteItem(type, id) {
  const config = {
    client: { table: "clients", owner: "owner_id" },
    case: { table: "cases", owner: "owner_id" },
    document: { table: "documents", owner: "owner_id" },
    transcription: { table: "transcriptions", owner: "owner_id" },
    deadline: { table: "deadlines", owner: "owner_id" },
    event: { table: "calendar_events", owner: "owner_id" }
  }[type];

  if (!config) return;
  const confirmed = window.confirm("ნამდვილად გინდა წაშლა?");
  if (!confirmed) return;

  setStatus("ჩანაწერი იშლება...", "info");
  const { error } = await supabase.from(config.table).delete().eq("id", id).eq(config.owner, authUserId);
  if (error) {
    setStatus(error.message, "error");
    return;
  }
  await loadDashboardData();
  setStatus("ჩანაწერი წაიშალა.", "success");
}

async function initDashboard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  authUserId = session.user.id;
  setStatus("სამუშაო სივრცე მზადდება...", "info");

  let profile = null;
  try {
    profile = await fetchSingle(supabase.from("profiles").select("*").eq("id", authUserId).single());
  } catch (error) {
    console.warn(error.message);
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || session.user.email || "მომხმარებელი";
  userName.textContent = displayName;
  userMeta.textContent = profile?.bureau_name
    ? `${profile.bureau_name} • შენი ციფრული იურიდიული სამუშაო მაგიდა`
    : `${session.user.email || ""} • შენი ციფრული იურიდიული სამუშაო მაგიდა`;

  await loadDashboardData();
  setStatus("სამუშაო სივრცე მზად არის.", "success");
}

searchInputs.forEach((input) => {
  input.addEventListener("input", (event) => {
    filters[event.target.dataset.search] = event.target.value || "";
    applyFiltersAndRender();
  });
});

globalSearchInput?.addEventListener("input", (event) => {
  filters.global = event.target.value || "";
  applyFiltersAndRender();
});

openModalButtons.forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, type, id } = actionButton.dataset;
  const item = findItem(type, id);
  if (!item) return;

  if (action === "view") {
    openModal(type, "view", item);
  } else if (action === "edit") {
    openModal(type, "edit", item);
  } else if (action === "delete") {
    await deleteItem(type, id);
  }
});

closeModalButton?.addEventListener("click", closeModal);
modalBackdrop?.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

modalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const type = modalForm.dataset.modalType;
  const definition = modalDefinitions[type];
  if (!definition) return;

  setModalFeedback("ინახება...", "info");
  const { error } = await definition.submit(new FormData(modalForm));
  if (error) {
    setModalFeedback(error.message, "error");
    return;
  }

  setModalFeedback("წარმატებით დაემატა.", "success");
  await loadDashboardData();
  window.setTimeout(closeModal, 500);
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

initDashboard().catch((error) => {
  console.error(error);
  setStatus("კაბინეტის ჩატვირთვისას დაფიქსირდა შეცდომა.", "error");
});
