import { supabase } from "./supabase.js";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1hMopI0YHEJWzvOKMPflmUeEamZ6RM__OJv-ZUNONhOE/edit?usp=sharing";

const userName = document.querySelector("[data-user-name]");
const userMeta = document.querySelector("[data-user-meta]");
const logoutButton = document.querySelector("[data-logout]");
const statusEl = document.querySelector("[data-sheets-status]");
const form = document.querySelector("[data-sheets-form]");
const input = document.querySelector("[data-sheets-input]");
const frame = document.querySelector("[data-sheets-frame]");
const empty = document.querySelector("[data-sheets-empty]");
const previewCard = document.querySelector("[data-sheets-preview-card]");
const openButton = document.querySelector("[data-open-sheet]");
const clearButton = document.querySelector("[data-clear-sheet]");

let currentUserId = null;
let currentSheetUrl = "";

const normalizeSheetUrl = (value) => String(value || "").trim();

const setStatus = (message) => {
  if (statusEl) statusEl.textContent = message;
};

const renderSheetState = (url) => {
  currentSheetUrl = normalizeSheetUrl(url);

  if (!currentSheetUrl) {
    previewCard?.classList.remove("hidden");
    frame?.classList.add("hidden");
    frame?.removeAttribute("src");
    empty?.classList.remove("hidden");
    setStatus("ჩასვი Google Sheet-ის მისამართი და დააჭირე შენახვას.");
    return;
  }

  previewCard?.classList.add("hidden");
  setStatus("ბმული შენახულია. მენიუდან „ექსელი“ შენს Sheet-ს გახსნის.");
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
    userMeta.textContent = profile.bureau_name || "Google Sheet · პირდაპირი ბმული";
  }

  const savedUrl = profile?.sheet_url || DEFAULT_SHEET_URL;
  input.value = savedUrl;
  renderSheetState(savedUrl);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUserId) return;

  const value = normalizeSheetUrl(input.value);
  setStatus("ბმული ინახება...");

  const { error } = await supabase
    .from("profiles")
    .update({ sheet_url: value || null })
    .eq("id", currentUserId);

  if (error) {
    setStatus(`შენახვა ვერ მოხერხდა: ${error.message}`);
    return;
  }

  input.value = value;
  renderSheetState(value);
  setStatus("შენახულია. მენიუდან „ექსელი“ იგივე Sheet-ს გახსნის.");
});

openButton?.addEventListener("click", () => {
  const url = normalizeSheetUrl(input.value || currentSheetUrl);
  if (!url) {
    setStatus("ჯერ ჩასვი Sheet-ის მისამართი.");
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
  renderSheetState("");
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

initPage();
