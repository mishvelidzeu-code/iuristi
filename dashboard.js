import { supabase } from "./supabase.js";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");
const todayFocus = document.querySelector("[data-today-focus]");
const balanceEl = document.querySelector("[data-balance]");
const casesCount = document.querySelector("[data-cases-count]");
const clientsCount = document.querySelector("[data-clients-count]");
const transcriptionsCount = document.querySelector("[data-transcriptions-count]");
const nextHearing = document.querySelector("[data-next-hearing]");
const nextDeadline = document.querySelector("[data-next-deadline]");
const logoutButton = document.querySelector("[data-logout]");

const previewLists = {
  cases: document.querySelector('[data-preview-list="cases"]'),
  clients: document.querySelector('[data-preview-list="clients"]'),
  documents: document.querySelector('[data-preview-list="documents"]'),
  transcriptions: document.querySelector('[data-preview-list="transcriptions"]'),
  deadlines: document.querySelector('[data-preview-list="deadlines"]'),
  events: document.querySelector('[data-preview-list="events"]')
};

const previewCounters = {
  cases: document.querySelector("[data-cases-preview-count]"),
  clients: document.querySelector("[data-clients-preview-count]"),
  documents: document.querySelector("[data-documents-preview-count]"),
  transcriptions: document.querySelector("[data-transcriptions-preview-count]"),
  deadlines: document.querySelector("[data-deadlines-preview-count]"),
  events: document.querySelector("[data-events-preview-count]")
};

const formatDateTime = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return new Intl.DateTimeFormat("ka-GE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const formatDate = (value) => {
  if (!value) return "თარიღი მითითებული არ არის";
  return new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium" }).format(new Date(value));
};

const formatMoney = (value) => `₾ ${Number(value || 0).toFixed(2)}`;

const setListFallback = (list, text) => {
  if (!list) return;
  list.innerHTML = `<li>${text}</li>`;
};

const renderPreviewList = (list, items, renderItem, emptyText) => {
  if (!list) return;
  if (!items.length) {
    setListFallback(list, emptyText);
    return;
  }

  list.innerHTML = items.map(renderItem).join("");
};

const renderLabelValue = (label, value) => `
  <li class="preview-item">
    <span class="preview-item-label">${label}</span>
    <strong>${value}</strong>
  </li>
`;

async function loadDashboard() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  const authUserId = session.user.id;

  const [
    profileRes,
    transactionsRes,
    casesRes,
    clientsRes,
    documentsRes,
    transcriptionsRes,
    deadlinesRes,
    eventsRes
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUserId).single(),
    supabase.from("wallet_transactions").select("amount").eq("user_id", authUserId).order("created_at", { ascending: false }),
    supabase.from("cases").select("id, title, case_number, court_name, hearing_date, status").eq("owner_id", authUserId).order("hearing_date", { ascending: true, nullsFirst: false }),
    supabase.from("clients").select("id, first_name, last_name, phone, email, created_at").eq("owner_id", authUserId).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, title, status, created_at").eq("owner_id", authUserId).order("created_at", { ascending: false }),
    supabase.from("transcriptions").select("id, title, status, language_code, created_at").eq("owner_id", authUserId).order("created_at", { ascending: false }),
    supabase.from("deadlines").select("id, title, due_date, status").eq("owner_id", authUserId).order("due_date", { ascending: true }),
    supabase.from("calendar_events").select("id, title, location, starts_at").eq("owner_id", authUserId).order("starts_at", { ascending: true })
  ]);

  if (profileRes.error) {
    dashboardStatus.textContent = "პროფილის ჩატვირთვა ვერ მოხერხდა.";
    return;
  }

  const profile = profileRes.data;
  const transactions = transactionsRes.data || [];
  const cases = (casesRes.data || []).filter((item) => item.status !== "archived");
  const clients = clientsRes.data || [];
  const documents = documentsRes.data || [];
  const transcriptions = transcriptionsRes.data || [];
  const deadlines = (deadlinesRes.data || []).filter((item) => item.status === "upcoming");
  const now = new Date();
  const events = (eventsRes.data || []).filter((item) => new Date(item.starts_at) >= now);

  const userFullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "კაბინეტი";
  userName.textContent = userFullName;
  userMeta.textContent = profile.bureau_name
    ? `${profile.bureau_name} • ${profile.phone || "ტელეფონი არაა დამატებული"}`
    : profile.phone || "დაამატე ბიურო და საკონტაქტო ინფორმაცია პროფილში.";

  const walletBalance = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  balanceEl.textContent = formatMoney(walletBalance);
  casesCount.textContent = String(cases.length);
  clientsCount.textContent = String(clients.length);
  transcriptionsCount.textContent = String(transcriptions.length);

  previewCounters.cases.textContent = `${cases.length} აქტიური საქმე`;
  previewCounters.clients.textContent = `${clients.length} კლიენტი`;
  previewCounters.documents.textContent = `${documents.length} დოკუმენტი`;
  previewCounters.transcriptions.textContent = `${transcriptions.length} ჩანაწერი`;
  previewCounters.deadlines.textContent = `${deadlines.length} აქტიური ვადა`;
  previewCounters.events.textContent = `${events.length} მომავალი მოვლენა`;

  const nearestEvent = events[0];
  const nearestDeadline = deadlines[0];
  nextHearing.textContent = nearestEvent ? `${nearestEvent.title} • ${formatDateTime(nearestEvent.starts_at)}` : "ჯერ არ არის დაგეგმილი";
  nextDeadline.textContent = nearestDeadline ? `${nearestDeadline.title} • ${formatDate(nearestDeadline.due_date)}` : "აქტიური ვადა არ არის";

  const focusSource = nearestDeadline || nearestEvent || cases[0];
  todayFocus.textContent = focusSource
    ? focusSource.title || "დღის აქტიური ბლოკი"
    : "დღისთვის ჯერ კონკრეტული პრიორიტეტი არ არის ჩაწერილი.";

  dashboardStatus.textContent = nearestDeadline
    ? `ყველაზე ახლო ვადაა: ${nearestDeadline.title}`
    : nearestEvent
      ? `უახლოესი მოვლენა: ${nearestEvent.title}`
      : "მთავარ overview-ზე მხოლოდ უახლესი აქტივობა ჩანს.";

  renderPreviewList(
    previewLists.events,
    events.slice(0, 3),
    (item) => renderLabelValue(item.title, `${formatDateTime(item.starts_at)}${item.location ? ` • ${item.location}` : ""}`),
    "მომავალი სხდომა ან მოვლენა ჯერ არ არის."
  );

  renderPreviewList(
    previewLists.deadlines,
    deadlines.slice(0, 3),
    (item) => renderLabelValue(item.title, `${formatDate(item.due_date)} • ${item.status}`),
    "აქტიური ვადები ჯერ არ არის."
  );

  renderPreviewList(
    previewLists.cases,
    cases.slice(0, 3),
    (item) => renderLabelValue(item.title, `${item.case_number || "ნომრის გარეშე"}${item.court_name ? ` • ${item.court_name}` : ""}`),
    "აქტიური საქმეები ჯერ არ არის დამატებული."
  );

  renderPreviewList(
    previewLists.documents,
    documents.slice(0, 3),
    (item) => renderLabelValue(item.title, item.status || "სტატუსი უცნობია"),
    "დოკუმენტები ჯერ არ არის დამატებული."
  );

  renderPreviewList(
    previewLists.transcriptions,
    transcriptions.slice(0, 3),
    (item) => renderLabelValue(item.title, `${item.status || "უცნობი"}${item.language_code ? ` • ${item.language_code}` : ""}`),
    "ტრანსკრიფციები ჯერ არ არის დამატებული."
  );

  renderPreviewList(
    previewLists.clients,
    clients.slice(0, 3),
    (item) => renderLabelValue(`${item.first_name || ""} ${item.last_name || ""}`.trim(), item.phone || item.email || "საკონტაქტო ინფორმაცია არაა"),
    "კლიენტები ჯერ არ არის დამატებული."
  );
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

loadDashboard();
