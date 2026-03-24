import { supabase } from "./supabase.js";

const loginLink = document.querySelector("[data-auth-login]");
const registerLink = document.querySelector("[data-auth-register]");
const dashboardLink = document.querySelector("[data-auth-dashboard]");
const logoutButton = document.querySelector("[data-auth-logout]");

function toggleLoggedInState(isLoggedIn) {
  loginLink?.classList.toggle("hidden", isLoggedIn);
  registerLink?.classList.toggle("hidden", isLoggedIn);
  dashboardLink?.classList.toggle("hidden", !isLoggedIn);
  logoutButton?.classList.toggle("hidden", !isLoggedIn);
}

async function initHomeAuth() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  toggleLoggedInState(Boolean(session));
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  toggleLoggedInState(false);
});

initHomeAuth();
