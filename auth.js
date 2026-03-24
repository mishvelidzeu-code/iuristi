import { supabase } from "./supabase.js";

const forms = document.querySelectorAll("[data-auth-form]");
const feedback = document.querySelector("[data-auth-feedback]");
const resetTitle = document.querySelector("[data-reset-title]");
const resetRequestForm = document.querySelector("[data-reset-request-form]");
const resetUpdateForm = document.querySelector("[data-reset-update-form]");

function setFeedback(message, type = "info") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = type;
}

async function redirectIfLoggedIn() {
  if (resetRequestForm || resetUpdateForm) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = "./dashboard.html";
  }
}

function toggleResetMode(isUpdateMode) {
  if (!resetRequestForm || !resetUpdateForm || !resetTitle) return;
  resetRequestForm.classList.toggle("hidden", isUpdateMode);
  resetUpdateForm.classList.toggle("hidden", !isUpdateMode);
  resetTitle.textContent = isUpdateMode ? "ახალი პაროლის დაყენება" : "აღდგენის ბმული";
}

async function initResetScreen() {
  if (!resetRequestForm || !resetUpdateForm) return;

  const hash = window.location.hash || "";
  const search = new URLSearchParams(window.location.search);
  const isRecovery = hash.includes("type=recovery") || search.get("type") === "recovery";

  if (!isRecovery) {
    toggleResetMode(false);
    return;
  }

  const { error } = await supabase.auth.getSession();
  if (error) {
    setFeedback("აღდგენის ბმული ვერ დამუშავდა. სცადე თავიდან.", "error");
    toggleResetMode(false);
    return;
  }

  toggleResetMode(true);
  setFeedback("შეიყვანე ახალი პაროლი.", "info");
}

async function handleRegister(submitForm) {
  const formData = new FormData(submitForm);
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const bureauName = String(formData.get("bureau_name") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!firstName || !lastName) {
    setFeedback("შეიყვანე სახელი და გვარი ცალ-ცალკე.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setFeedback("პაროლები არ ემთხვევა.", "error");
    return;
  }

  if (!phone) {
    setFeedback("შეიყვანე ტელეფონის ნომერი.", "error");
    return;
  }

  setFeedback("ვქმნი ანგარიშს...", "info");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        bureau_name: bureauName,
        phone
      }
    }
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  if (data.user?.id) {
    await supabase
      .from("profiles")
      .update({ bureau_name: bureauName || null, phone: phone || null })
      .eq("id", data.user.id);
  }

  if (data.session) {
    setFeedback("რეგისტრაცია წარმატებით დასრულდა. გადაგყავს კაბინეტში...", "success");
    window.setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 700);
    return;
  }

  setFeedback("რეგისტრაცია დასრულდა. თუ ელფოსტის დადასტურება ჩართულია, შეამოწმე მეილი.", "success");
  submitForm.reset();
}

async function handleResetRequest(submitForm) {
  const formData = new FormData(submitForm);
  const email = String(formData.get("email") || "").trim();

  setFeedback("აღდგენის წერილი იგზავნება...", "info");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname.replace("reset-password.html", "reset-password.html")}`
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  setFeedback("აღდგენის ბმული გამოგზავნილია ელფოსტაზე.", "success");
  submitForm.reset();
}

async function handleResetUpdate(submitForm) {
  const formData = new FormData(submitForm);
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (password !== confirmPassword) {
    setFeedback("პაროლები არ ემთხვევა.", "error");
    return;
  }

  setFeedback("პაროლი იცვლება...", "info");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  setFeedback("პაროლი წარმატებით შეიცვალა. ახლა შეგიძლია შეხვიდე.", "success");
  window.setTimeout(() => {
    window.location.href = "./login.html";
  }, 900);
}

async function handleLogin(submitForm) {
  const formData = new FormData(submitForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  setFeedback("შესვლა მიმდინარეობს...", "info");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  setFeedback("წარმატებით შეხვედი. გადაგყავს კაბინეტში...", "success");
  window.setTimeout(() => {
    window.location.href = "./dashboard.html";
  }, 500);
}

if (forms.length) {
  redirectIfLoggedIn();
  initResetScreen();

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const formMode = form.dataset.authForm;

        if (formMode === "register") {
          await handleRegister(form);
        } else if (formMode === "login") {
          await handleLogin(form);
        } else if (formMode === "reset-request") {
          await handleResetRequest(form);
        } else if (formMode === "reset-update") {
          await handleResetUpdate(form);
        }
      } catch (error) {
        setFeedback(error?.message || "დაფიქსირდა შეცდომა. სცადე თავიდან.", "error");
      }
    });
  });
}
