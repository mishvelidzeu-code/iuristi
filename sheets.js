import { supabase } from "./supabase.js";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbskafP7Y7t1bmQYW6kkMrmes5spDf-uXumTcnALajOW8j8dBG6KroONkNPQINNUZTcXxVeK-iyvaY/pubhtml?widget=true&headers=false";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const logoutButton = document.querySelector("[data-logout]");
const statusEl = document.querySelector("[data-sheets-status]");
const form = document.querySelector("[data-sheets-form]");
const input = document.querySelector("[data-sheets-input]");
const frame = document.querySelector("[data-sheets-frame]");
const empty = document.querySelector("[data-sheets-empty]");
const openButton = document.querySelector("[data-open-sheet]");
const clearButton = document.querySelector("[data-clear-sheet]");

let currentUserId = null;
let currentSheetUrl = "";

const normalizeSheetUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.includes("/pubhtml")) return url;
  if (url.includes("/preview")) return url;
  if (url.includes("/edit")) return url.replace("/edit", "/preview");
  return url;
};

const setStatus = (message) => {
  if (statusEl) statusEl.textContent = message;
};

const renderSheet = (url) => {
  const normalized = normalizeSheetUrl(url);
  currentSheetUrl = normalized;

  if (!normalized) {
    frame.classList.add("hidden");
    frame.removeAttribute("src");
    empty.classList.remove("hidden");
    setStatus("ჩასვი Sheets embed ბმული და შეინახე.");
    return;
  }

  frame.src = normalized;
  frame.classList.remove("hidden");
  empty.classList.add("hidden");
  setStatus("ცხრილი ჩაშენებულია. შეგიძლია იმუშაო პირდაპირ ამ გვერდიდან.");
};

async function initPage() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  currentUserId = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUserId)
    .single();

  if (profile) {
    userName.textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "კაბინეტი";
    userMeta.textContent = profile.bureau_name || "ცხრილების სამუშაო სივრცე";
  }

  const savedUrl = profile?.sheet_url || DEFAULT_SHEET_URL;
  input.value = savedUrl;
  renderSheet(savedUrl);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUserId) return;

  const value = normalizeSheetUrl(input.value);
  setStatus("ცხრილის ბმული ინახება...");

  const { error } = await supabase
    .from("profiles")
    .update({ sheet_url: value || null })
    .eq("id", currentUserId);

  if (error) {
    setStatus(`შენახვა ვერ მოხერხდა: ${error.message}`);
    return;
  }

  input.value = value;
  renderSheet(value);
});

openButton?.addEventListener("click", () => {
  const url = normalizeSheetUrl(input.value || currentSheetUrl);
  if (!url) {
    setStatus("ჯერ ბმული ჩასვი, მერე გახსენი ახალ ტაბში.");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
});

clearButton?.addEventListener("click", async () => {
  if (!currentUserId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ sheet_url: null })
    .eq("id", currentUserId);

  if (error) {
    setStatus(`გასუფთავება ვერ მოხერხდა: ${error.message}`);
    return;
  }

  input.value = "";
  renderSheet("");
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

initPage();
