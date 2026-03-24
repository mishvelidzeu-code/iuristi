import { supabase } from "./supabase.js";

const form = document.querySelector("[data-auth-form]");
const feedback = document.querySelector("[data-auth-feedback]");
const formMode = form?.dataset.authForm;

function setFeedback(message, type = "info") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = type;
}

async function redirectIfLoggedIn() {
  if (formMode === "reset") return;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = "./dashboard.html";
  }
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

async function handleReset(submitForm) {
  const formData = new FormData(submitForm);
  const email = String(formData.get("email") || "").trim();

  setFeedback("აღდგენის წერილი იგზავნება...", "info");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname.replace("reset-password.html", "login.html")}`
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  setFeedback("აღდგენის ბმული გამოგზავნილია ელფოსტაზე.", "success");
  submitForm.reset();
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

if (form) {
  redirectIfLoggedIn();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      if (formMode === "register") {
        await handleRegister(form);
      } else if (formMode === "login") {
        await handleLogin(form);
      } else if (formMode === "reset") {
        await handleReset(form);
      }
    } catch (error) {
      setFeedback(error?.message || "დაფიქსირდა შეცდომა. სცადე თავიდან.", "error");
    }
  });
}
