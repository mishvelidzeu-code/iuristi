import { supabase } from "./supabase.js";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");
const todayFocus = document.querySelector("[data-today-focus]");
const balance = document.querySelector("[data-balance]");
const casesCount = document.querySelector("[data-cases-count]");
const eventsCount = document.querySelector("[data-events-count]");
const transcriptionsCount = document.querySelector("[data-transcriptions-count]");
const transactionsList = document.querySelector("[data-transactions-list]");
const casesList = document.querySelector("[data-cases-list]");
const deadlinesList = document.querySelector("[data-deadlines-list]");
const documentsList = document.querySelector("[data-documents-list]");
const transcriptionsList = document.querySelector("[data-transcriptions-list]");
const eventsList = document.querySelector("[data-events-list]");
const clientsList = document.querySelector("[data-clients-list]");
const logoutButton = document.querySelector("[data-logout]");

function setStatus(message, type = "info") {
  if (!dashboardStatus) return;
  dashboardStatus.textContent = message;
  dashboardStatus.dataset.state = type;
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
  const urgentDeadlines = deadlines.filter((item) => item?.due_date).length;
  const todayEvents = events.filter((item) => item?.starts_at).length;
  const activeCount = activeCases.length;
  return `${urgentDeadlines} აქტიური ვადა • ${todayEvents} სხდომა/მოვლენა • ${activeCount} სამუშაო საქმე`;
}

async function initDashboard() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  const authUser = session.user;
  setStatus("სამუშაო სივრცე მზადდება...", "info");

  let profile = null;
  try {
    profile = await fetchSingle(
      supabase.from("profiles").select("*").eq("id", authUser.id).single()
    );
  } catch (error) {
    console.warn(error.message);
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    authUser.email ||
    "მომხმარებელი";

  userName.textContent = displayName;
  userMeta.textContent = profile?.bureau_name
    ? `${profile.bureau_name} • შენი ციფრული იურიდიული სამუშაო მაგიდა`
    : `${authUser.email || ""} • შენი ციფრული იურიდიული სამუშაო მაგიდა`;

  const [transactions, activeCases, deadlines, documents, transcriptions, events, clients] = await Promise.all([
    fetchOptional(
      supabase.from("wallet_transactions").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(6)
    ),
    fetchOptional(
      supabase.from("cases").select("*").eq("owner_id", authUser.id).eq("status", "active").order("created_at", { ascending: false }).limit(6)
    ),
    fetchOptional(
      supabase.from("deadlines").select("*").eq("owner_id", authUser.id).eq("status", "upcoming").order("due_date", { ascending: true }).limit(6)
    ),
    fetchOptional(
      supabase.from("documents").select("*").eq("owner_id", authUser.id).order("created_at", { ascending: false }).limit(6)
    ),
    fetchOptional(
      supabase.from("transcriptions").select("*").eq("owner_id", authUser.id).order("created_at", { ascending: false }).limit(6)
    ),
    fetchOptional(
      supabase.from("calendar_events").select("*").eq("owner_id", authUser.id).order("starts_at", { ascending: true }).limit(6)
    ),
    fetchOptional(
      supabase.from("clients").select("*").eq("owner_id", authUser.id).order("created_at", { ascending: false }).limit(6)
    )
  ]);

  const totalBalance = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  balance.textContent = lari(totalBalance);
  casesCount.textContent = String(activeCases.length);
  eventsCount.textContent = String(events.length);
  transcriptionsCount.textContent = String(transcriptions.length);
  todayFocus.textContent = summarizeDay(activeCases, deadlines, events);

  renderList(
    transactionsList,
    transactions.map((item) => `${lari(item.amount)} • ${item.description || item.transaction_type || "ოპერაცია"}`),
    "ფინანსური ოპერაციები ჯერ არ არის."
  );

  renderList(
    casesList,
    activeCases.map((item) => `${item.title || "უსათაურო საქმე"}${item.court_name ? ` • ${item.court_name}` : ""}${item.hearing_date ? ` • სხდომა ${safeDate(item.hearing_date)}` : ""}`),
    "აქტიური საქმეები ჯერ არ არის."
  );

  renderList(
    deadlinesList,
    deadlines.map((item) => `${item.title || "ვადა"} • ${safeDate(item.due_date)}`),
    "უახლოესი ვადები ჯერ არ არის."
  );

  renderList(
    documentsList,
    documents.map((item) => `${item.title || "დოკუმენტი"} • ${item.status || "draft"}`),
    "დოკუმენტები ჯერ არ არის."
  );

  renderList(
    transcriptionsList,
    transcriptions.map((item) => `${item.title || "ტრანსკრიფცია"} • ${item.status || "uploaded"}`),
    "ტრანსკრიფციები ჯერ არ არის."
  );

  renderList(
    eventsList,
    events.map((item) => `${item.title || "მოვლენა"} • ${safeDate(item.starts_at, true)}${item.location ? ` • ${item.location}` : ""}`),
    "დღის სხდომები და მოვლენები ჯერ არ არის."
  );

  renderList(
    clientsList,
    clients.map((item) => `${[item.first_name, item.last_name].filter(Boolean).join(" ") || "კლიენტი"}${item.phone ? ` • ${item.phone}` : ""}`),
    "კლიენტების ბაზაში ჩანაწერები ჯერ არ არის."
  );

  setStatus("სამუშაო სივრცე მზად არის.", "success");
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

initDashboard().catch((error) => {
  console.error(error);
  setStatus("კაბინეტის ჩატვირთვისას დაფიქსირდა შეცდომა.", "error");
});
