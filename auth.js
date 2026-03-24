import { supabase } from "./supabase.js";

const form = document.querySelector("[data-auth-form]");
const feedback = document.querySelector("[data-auth-feedback]");
const formMode = form?.dataset.authForm;

function setFeedback(message, type = "info") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = type;
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

async function redirectIfLoggedIn() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = "./dashboard.html";
  }
}

async function handleRegister(submitForm) {
  const formData = new FormData(submitForm);
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const bureauName = String(formData.get("bureau_name") || "").trim();
  const password = String(formData.get("password") || "");
  const { firstName, lastName } = splitName(fullName);

  if (!fullName) {
    setFeedback("შეიყვანე სახელი და გვარი.", "error");
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
        bureau_name: bureauName
      }
    }
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  if (data.user?.id && bureauName) {
    await supabase
      .from("profiles")
      .update({ bureau_name: bureauName })
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
      }
    } catch (error) {
      setFeedback(error?.message || "დაფიქსირდა შეცდომა. სცადე თავიდან.", "error");
    }
  });
}
