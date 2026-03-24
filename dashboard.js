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
    fields: `
      <div class="auth-form-grid">
        <label>სახელი<input name="first_name" type="text" required></label>
        <label>გვარი<input name="last_name" type="text" required></label>
      </div>
      <div class="auth-form-grid">
        <label>ტელეფონი<input name="phone" type="tel"></label>
        <label>ელფოსტა<input name="email" type="email"></label>
      </div>
      <label>პირადი ნომერი<input name="personal_id" type="text"></label>
      <label>მისამართი<input name="address" type="text"></label>
      <label>შენიშვნა<textarea name="notes" rows="3"></textarea></label>
      <button type="submit">კლიენტის დამატება</button>
    `,
    async submit(formData) {
      return supabase.from("clients").insert({
        owner_id: authUserId,
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || null,
        email: String(formData.get("email") || "").trim() || null,
        personal_id: String(formData.get("personal_id") || "").trim() || null,
        address: String(formData.get("address") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null
      });
    }
  },
  case: {
    title: "ახალი საქმე",
    fields: `
      <label>საქმის სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>საქმის ნომერი<input name="case_number" type="text"></label>
        <label>სასამართლო<input name="court_name" type="text"></label>
      </div>
      <label>სხდომის თარიღი<input name="hearing_date" type="datetime-local"></label>
      <label>აღწერა<textarea name="description" rows="3"></textarea></label>
      <button type="submit">საქმის დამატება</button>
    `,
    async submit(formData) {
      const hearingDate = String(formData.get("hearing_date") || "").trim();
      return supabase.from("cases").insert({
        owner_id: authUserId,
        title: String(formData.get("title") || "").trim(),
        case_number: String(formData.get("case_number") || "").trim() || null,
        court_name: String(formData.get("court_name") || "").trim() || null,
        description: String(formData.get("description") || "").trim() || null,
        hearing_date: hearingDate || null,
        status: "active"
      });
    }
  },
  document: {
    title: "ახალი დოკუმენტი",
    fields: `
      <label>დოკუმენტის სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>სტატუსი
          <select name="status">
            <option value="draft">draft</option>
            <option value="generated">generated</option>
            <option value="signed">signed</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label>ფაილის ბმული / path<input name="file_path" type="text"></label>
      </div>
      <label>შინაარსი<textarea name="body" rows="4"></textarea></label>
      <button type="submit">დოკუმენტის დამატება</button>
    `,
    async submit(formData) {
      return supabase.from("documents").insert({
        owner_id: authUserId,
        title: String(formData.get("title") || "").trim(),
        status: String(formData.get("status") || "draft"),
        body: String(formData.get("body") || "").trim() || null,
        file_path: String(formData.get("file_path") || "").trim() || null,
        generated_data: {}
      });
    }
  },
  transcription: {
    title: "ახალი ტრანსკრიფცია",
    fields: `
      <label>სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>ენა
          <select name="language_code">
            <option value="ka">ქართული</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <label>სტატუსი
          <select name="status">
            <option value="uploaded">uploaded</option>
            <option value="processing">processing</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </label>
      </div>
      <label>ნედლი ტექსტი<textarea name="raw_text" rows="4"></textarea></label>
      <button type="submit">ტრანსკრიფციის დამატება</button>
    `,
    async submit(formData) {
      return supabase.from("transcriptions").insert({
        owner_id: authUserId,
        title: String(formData.get("title") || "").trim(),
        language_code: String(formData.get("language_code") || "ka"),
        status: String(formData.get("status") || "uploaded"),
        raw_text: String(formData.get("raw_text") || "").trim() || null
      });
    }
  },
  deadline: {
    title: "ახალი ვადა",
    fields: `
      <label>ვადის სათაური<input name="title" type="text" required></label>
      <div class="auth-form-grid">
        <label>საწყისი თარიღი<input name="base_date" type="date" required></label>
        <label>ბოლო ვადა<input name="due_date" type="date" required></label>
      </div>
      <label>შენიშვნა<textarea name="notes" rows="3"></textarea></label>
      <button type="submit">ვადის დამატება</button>
    `,
    async submit(formData) {
      return supabase.from("deadlines").insert({
        owner_id: authUserId,
        title: String(formData.get("title") || "").trim(),
        base_date: String(formData.get("base_date") || "").trim(),
        due_date: String(formData.get("due_date") || "").trim(),
        status: "upcoming",
        notes: String(formData.get("notes") || "").trim() || null
      });
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
  renderList(
    casesList,
    filteredCases.map((item) => `${item.title || "უსათაურო საქმე"}${item.court_name ? ` • ${item.court_name}` : ""}${item.hearing_date ? ` • სხდომა ${safeDate(item.hearing_date)}` : ""}`),
    "საქმეები ვერ მოიძებნა."
  );
  renderList(
    deadlinesList,
    filteredDeadlines.map((item) => `${item.title || "ვადა"} • ${safeDate(item.due_date)}${item.notes ? ` • ${item.notes}` : ""}`),
    "ვადები ვერ მოიძებნა."
  );
  renderList(
    documentsList,
    filteredDocuments.map((item) => `${item.title || "დოკუმენტი"} • ${item.status || "draft"}`),
    "დოკუმენტები ვერ მოიძებნა."
  );
  renderList(
    transcriptionsList,
    filteredTranscriptions.map((item) => `${item.title || "ტრანსკრიფცია"} • ${item.status || "uploaded"}`),
    "ტრანსკრიფციები ვერ მოიძებნა."
  );
  renderList(
    eventsList,
    filteredEvents.map((item) => `${item.title || "მოვლენა"} • ${safeDate(item.starts_at, true)}${item.location ? ` • ${item.location}` : ""}`),
    "მოვლენები ვერ მოიძებნა."
  );
  renderList(
    clientsList,
    filteredClients.map((item) => `${[item.first_name, item.last_name].filter(Boolean).join(" ") || "კლიენტი"}${item.phone ? ` • ${item.phone}` : ""}${item.email ? ` • ${item.email}` : ""}`),
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

function openModal(type) {
  const definition = modalDefinitions[type];
  if (!definition) return;
  modalTitle.textContent = definition.title;
  modalForm.innerHTML = definition.fields;
  modalForm.dataset.modalType = type;
  setModalFeedback("", "info");
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalForm.innerHTML = "";
  modalForm.dataset.modalType = "";
  setModalFeedback("", "info");
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
