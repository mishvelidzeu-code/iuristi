import { supabase } from "./supabase.js";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");
const balance = document.querySelector("[data-balance]");
const transactionsList = document.querySelector("[data-transactions-list]");
const casesList = document.querySelector("[data-cases-list]");
const casesCount = document.querySelector("[data-cases-count]");
const deadlinesList = document.querySelector("[data-deadlines-list]");
const documentsList = document.querySelector("[data-documents-list]");
const transcriptionsList = document.querySelector("[data-transcriptions-list]");
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

function renderList(container, items, emptyText) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<li>${emptyText}</li>`;
    return;
  }
  container.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function safeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" });
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

async function initDashboard() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  const authUser = session.user;
  setStatus("მონაცემები წარმატებით ჩაიტვირთა.", "success");

  let profile = null;
  try {
    profile = await fetchSingle(
      supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()
    );
  } catch (error) {
    console.warn(error.message);
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || authUser.email || "მომხმარებელი";
  userName.textContent = displayName;
  userMeta.textContent = profile?.bureau_name
    ? `ბიურო: ${profile.bureau_name}`
    : `ელფოსტა: ${authUser.email || ""}`;

  const [transactions, activeCases, deadlines, documents, transcriptions] = await Promise.all([
    fetchOptional(
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(10)
    ),
    fetchOptional(
      supabase
        .from("cases")
        .select("*")
        .eq("owner_id", authUser.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8)
    ),
    fetchOptional(
      supabase
        .from("deadlines")
        .select("*")
        .eq("owner_id", authUser.id)
        .eq("status", "upcoming")
        .order("due_date", { ascending: true })
        .limit(8)
    ),
    fetchOptional(
      supabase
        .from("documents")
        .select("*")
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(8)
    ),
    fetchOptional(
      supabase
        .from("transcriptions")
        .select("*")
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(8)
    )
  ]);

  const totalBalance = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  balance.textContent = lari(totalBalance);
  casesCount.textContent = `${activeCases.length} ჩანაწერი`;

  renderList(
    transactionsList,
    transactions.map((item) => `${lari(item.amount)} • ${item.description || item.transaction_type || "ოპერაცია"}`),
    "ტრანზაქციები ჯერ არ არის."
  );

  renderList(
    casesList,
    activeCases.map((item) => `${item.title || "უსათაურო საქმე"}${item.hearing_date ? ` • სხდომა ${safeDate(item.hearing_date)}` : ""}`),
    "აქტიური საქმეები ჯერ არ არის."
  );

  renderList(
    deadlinesList,
    deadlines.map((item) => `${item.title || "ვადა"} • ${safeDate(item.due_date)}`),
    "მომავალი ვადები ჯერ არ არის."
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
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

initDashboard().catch((error) => {
  console.error(error);
  setStatus("კაბინეტის ჩატვირთვისას დაფიქსირდა შეცდომა.", "error");
});
