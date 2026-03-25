import { supabase } from "./supabase.js";

const userNameEl = document.querySelector("[data-user-name]");
const userMetaEl = document.querySelector("[data-user-meta]");
const statusEl = document.querySelector("[data-page-status]");
const logoutButton = document.querySelector("[data-logout]");
const form = document.querySelector("[data-transcription-form]");
const formFeedback = document.querySelector("[data-form-feedback]");
const submitButton = document.querySelector("[data-submit-button]");
const audioInput = document.querySelector("[data-audio-input]");
const audioPreviewWrap = document.querySelector("[data-audio-preview-wrap]");
const audioPreview = document.querySelector("[data-audio-preview]");
const audioNameEl = document.querySelector("[data-audio-name]");
const audioSizeEl = document.querySelector("[data-audio-size]");
const caseSelect = document.querySelector("[data-case-select]");
const titleInput = document.querySelector("[data-title-input]");
const docNameInput = document.querySelector("[data-doc-name-input]");
const latestOutputEl = document.querySelector("[data-latest-output]");
const historyListEl = document.querySelector("[data-history-list]");
const excelNavLink = document.querySelector('.studio-nav a[href="sheets.html"]');

const DATE_TIME = new Intl.DateTimeFormat("ka-GE", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tbilisi"
});

let authUserId = null;
let profile = null;
let cases = [];
let transcriptions = [];
let latestDownloadMeta = null;

const formatDateTime = (value) => {
  if (!value) return "თარიღი უცნობია";
  return DATE_TIME.format(new Date(value));
};

const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return "";
  const size = Number(bytes);
  if (size >= 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u10A0-\u10FF]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "audio-word";

const getCaseTitle = (caseId) => {
  const match = cases.find((item) => item.id === caseId);
  return match?.title || "საქმის გარეშე";
};

const buildDefaultTranscript = ({ title, caseTitle, fileName, languageLabel }) => `
LexFlow AI აუდიოს ტექსტად გარდაქმნა

სათაური: ${title}
საქმე: ${caseTitle}
ფაილი: ${fileName}
ენა: ${languageLabel}
შექმნის თარიღი: ${formatDateTime(new Date().toISOString())}

ტრანსკრიფციის ტექსტი:

[აქ ჩასვი საბოლოო ტექსტი ან შეასწორე ავტოგენერირებული მასალა.]
`.trim();

const buildWordDocument = ({ title, caseTitle, fileName, languageLabel, transcriptText }) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 36px; color: #1d2833; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { margin: 0 0 8px; color: #556270; font-size: 13px; }
    .divider { margin: 20px 0; border: 0; border-top: 1px solid #d5dce3; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta"><strong>საქმე:</strong> ${escapeHtml(caseTitle)}</p>
  <p class="meta"><strong>აუდიო ფაილი:</strong> ${escapeHtml(fileName)}</p>
  <p class="meta"><strong>ენა:</strong> ${escapeHtml(languageLabel)}</p>
  <p class="meta"><strong>შექმნის დრო:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
  <hr class="divider" />
  <pre>${escapeHtml(transcriptText)}</pre>
</body>
</html>`;

const createSignedUrl = async (bucket, path) => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) {
    console.error(error);
    return null;
  }
  return data?.signedUrl || null;
};

const setLoadingState = (loading, text) => {
  submitButton.disabled = loading;
  submitButton.textContent = loading ? text : "Word ფაილის გენერაცია";
};

const renderCaseOptions = () => {
  caseSelect.innerHTML = `
    <option value="">საქმის გარეშე</option>
    ${cases
      .map(
        (item) =>
          `<option value="${item.id}">${escapeHtml(item.title)}${item.case_number ? ` • ${escapeHtml(item.case_number)}` : ""}</option>`
      )
      .join("")}
  `;
};

const renderLatestOutput = async () => {
  if (!transcriptions.length) {
    latestOutputEl.className = "latest-output empty";
    latestOutputEl.innerHTML = `
      <strong>ჯერ არაფერია გენერირებული</strong>
      <p>პირველი Word ფაილის შექმნის შემდეგ აქ გამოჩნდება ჩამოსატვირთი შედეგი.</p>
    `;
    latestDownloadMeta = null;
    return;
  }

  const latest = transcriptions[0];
  const downloadUrl = latest.docx_file_path
    ? await createSignedUrl("case-files", latest.docx_file_path)
    : null;

  latestDownloadMeta = downloadUrl
    ? { url: downloadUrl, name: `${slugify(latest.title)}.doc` }
    : null;

  latestOutputEl.className = "latest-output";
  latestOutputEl.innerHTML = `
    <span class="status-pill ${latest.status === "completed" ? "is-success" : ""}">${escapeHtml(latest.status || "completed")}</span>
    <strong>${escapeHtml(latest.title)}</strong>
    <p>${escapeHtml(getCaseTitle(latest.case_id))} • ${escapeHtml(formatDateTime(latest.created_at))}</p>
    <div class="latest-output-actions">
      <button type="button" class="nav-cta" data-latest-download ${!downloadUrl ? "disabled" : ""}>Word ფაილის ჩამოტვირთვა</button>
      <button type="button" class="nav-login" data-latest-open-audio ${!latest.source_file_path ? "disabled" : ""}>აუდიოს გახსნა</button>
    </div>
  `;
};

const renderHistory = async () => {
  if (!transcriptions.length) {
    historyListEl.innerHTML = `<div class="history-empty">ჯერ ტრანსკრიფციის ჩანაწერი არ არის შექმნილი.</div>`;
    return;
  }

  const itemsHtml = await Promise.all(
    transcriptions.slice(0, 8).map(async (item) => {
      const wordUrl = item.docx_file_path ? await createSignedUrl("case-files", item.docx_file_path) : null;
      const audioUrl = item.source_file_path ? await createSignedUrl("audio-files", item.source_file_path) : null;

      return `
        <article class="history-card">
          <div class="history-card-top">
            <div>
              <span class="status-pill ${item.status === "completed" ? "is-success" : ""}">${escapeHtml(item.status || "completed")}</span>
              <h4>${escapeHtml(item.title)}</h4>
            </div>
            <span class="history-date">${escapeHtml(formatDateTime(item.created_at))}</span>
          </div>
          <div class="history-meta">
            <span>საქმე: ${escapeHtml(getCaseTitle(item.case_id))}</span>
            <span>ენა: ${escapeHtml(item.language_code || "ka")}</span>
          </div>
          <p>${escapeHtml((item.edited_text || item.raw_text || "Word ფაილი შექმნილია სამუშაო ტექსტით.").slice(0, 180))}</p>
          <div class="history-actions">
            <button type="button" class="mini-button primary" data-download-url="${escapeHtml(wordUrl || "")}" data-download-name="${escapeHtml(`${slugify(item.title)}.doc`)}" ${!wordUrl ? "disabled" : ""}>Word ჩამოტვირთვა</button>
            <button type="button" class="mini-button" data-open-url="${escapeHtml(audioUrl || "")}" ${!audioUrl ? "disabled" : ""}>აუდიოს გახსნა</button>
          </div>
        </article>
      `;
    })
  );

  historyListEl.innerHTML = itemsHtml.join("");
};

const refreshHistory = async () => {
  const [{ data: caseRows, error: caseError }, { data: transcriptionRows, error: transcriptionError }] =
    await Promise.all([
      supabase.from("cases").select("id, title, case_number").eq("owner_id", authUserId).order("created_at", { ascending: false }),
      supabase
        .from("transcriptions")
        .select("id, title, case_id, language_code, status, raw_text, edited_text, source_file_path, docx_file_path, created_at")
        .eq("owner_id", authUserId)
        .order("created_at", { ascending: false })
    ]);

  if (caseError || transcriptionError) {
    console.error(caseError || transcriptionError);
    statusEl.textContent = "მონაცემების ჩატვირთვა ვერ მოხერხდა.";
    historyListEl.innerHTML = `<div class="history-empty">ჩატვირთვა ვერ მოხერხდა.</div>`;
    return;
  }

  cases = caseRows || [];
  transcriptions = transcriptionRows || [];
  renderCaseOptions();
  await renderLatestOutput();
  await renderHistory();
  statusEl.textContent = transcriptions.length
    ? `ბოლო გენერაცია: ${transcriptions[0].title}`
    : "მზად არის ახალი ფაილის მისაღებად";
};

const uploadAudioFile = async (file) => {
  const path = `${authUserId}/audio/${Date.now()}-${slugify(file.name)}.${file.name.split(".").pop() || "mp3"}`;
  const { error } = await supabase.storage.from("audio-files").upload(path, file, {
    upsert: false,
    contentType: file.type || undefined
  });

  if (error) throw error;
  return path;
};

const uploadWordFile = async (blob, baseName) => {
  const safeName = `${slugify(baseName)}-${Date.now()}.doc`;
  const path = `${authUserId}/transcriptions/${safeName}`;
  const { error } = await supabase.storage.from("case-files").upload(path, blob, {
    upsert: false,
    contentType: "application/msword"
  });

  if (error) throw error;
  return { path, fileName: safeName };
};

const createWordAndRecords = async ({
  title,
  caseId,
  languageCode,
  transcriptText,
  audioPath,
  audioFileName,
  documentBaseName
}) => {
  const languageLabels = { ka: "ქართული", en: "ინგლისური", ru: "რუსული" };
  const caseTitle = getCaseTitle(caseId);
  const finalText =
    transcriptText.trim() ||
    buildDefaultTranscript({
      title,
      caseTitle,
      fileName: audioFileName,
      languageLabel: languageLabels[languageCode] || languageCode
    });

  const htmlContent = buildWordDocument({
    title,
    caseTitle,
    fileName: audioFileName,
    languageLabel: languageLabels[languageCode] || languageCode,
    transcriptText: finalText
  });

  const wordBlob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
  const { path: wordPath, fileName } = await uploadWordFile(wordBlob, documentBaseName || title);

  const { data: transcriptionRow, error: transcriptionError } = await supabase
    .from("transcriptions")
    .insert({
      owner_id: authUserId,
      case_id: caseId || null,
      title,
      source_file_path: audioPath,
      language_code: languageCode,
      status: "completed",
      raw_text: finalText,
      edited_text: finalText,
      docx_file_path: wordPath,
      duration_seconds: 0
    })
    .select("id")
    .single();

  if (transcriptionError) throw transcriptionError;

  const { error: documentError } = await supabase.from("documents").insert({
    owner_id: authUserId,
    case_id: caseId || null,
    title,
    status: "generated",
    body: finalText,
    file_path: wordPath,
    generated_data: { source: "transcriptions-studio", transcription_id: transcriptionRow.id }
  });

  if (documentError) throw documentError;

  if (caseId) {
    const { error: fileError } = await supabase.from("files").insert({
      owner_id: authUserId,
      case_id: caseId,
      file_kind: "document",
      file_name: fileName,
      storage_path: wordPath,
      mime_type: "application/msword",
      size_bytes: wordBlob.size
    });

    if (fileError) throw fileError;
  }
};

audioInput?.addEventListener("change", () => {
  const file = audioInput.files?.[0];
  if (!file) {
    audioPreviewWrap.classList.add("hidden");
    audioPreview.removeAttribute("src");
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  audioPreview.src = objectUrl;
  audioNameEl.textContent = file.name;
  audioSizeEl.textContent = formatFileSize(file.size);
  audioPreviewWrap.classList.remove("hidden");

  if (!titleInput.value.trim()) {
    titleInput.value = file.name.replace(/\.[^.]+$/, "");
  }

  if (!docNameInput.value.trim()) {
    docNameInput.value = slugify(file.name.replace(/\.[^.]+$/, ""));
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = audioInput.files?.[0];
  if (!file) {
    formFeedback.textContent = "აირჩიე MP3 ან MP4 ფაილი.";
    return;
  }

  formFeedback.textContent = "";
  setLoadingState(true, "მუშავდება...");
  statusEl.textContent = "ფაილი იტვირთება და Word მზადდება...";

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const caseId = String(formData.get("case_id") || "").trim();
  const languageCode = String(formData.get("language_code") || "ka").trim();
  const transcriptText = String(formData.get("transcript_text") || "");
  const documentBaseName = String(formData.get("doc_name") || "").trim();

  try {
    const audioPath = await uploadAudioFile(file);

    await createWordAndRecords({
      title,
      caseId,
      languageCode,
      transcriptText,
      audioPath,
      audioFileName: file.name,
      documentBaseName
    });

    form.reset();
    audioPreviewWrap.classList.add("hidden");
    audioPreview.removeAttribute("src");
    formFeedback.textContent = "Word ფაილი წარმატებით შეიქმნა და შენახულია.";
    statusEl.textContent = "ახალი Word ფაილი წარმატებით შეიქმნა.";
    await refreshHistory();
  } catch (error) {
    console.error(error);
    formFeedback.textContent = `შეცდომა: ${error.message || "გენერაცია ვერ შესრულდა."}`;
    statusEl.textContent = "გენერაცია ვერ შესრულდა.";
  } finally {
    setLoadingState(false);
  }
});

latestOutputEl?.addEventListener("click", async (event) => {
  const downloadButton = event.target.closest("[data-latest-download]");
  if (downloadButton && latestDownloadMeta?.url) {
    const link = document.createElement("a");
    link.href = latestDownloadMeta.url;
    link.download = latestDownloadMeta.name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const audioButton = event.target.closest("[data-latest-open-audio]");
  if (audioButton && transcriptions[0]?.source_file_path) {
    const audioUrl = await createSignedUrl("audio-files", transcriptions[0].source_file_path);
    if (audioUrl) {
      window.open(audioUrl, "_blank", "noopener,noreferrer");
    }
  }
});

historyListEl?.addEventListener("click", (event) => {
  const downloadButton = event.target.closest("[data-download-url]");
  if (downloadButton) {
    const url = downloadButton.dataset.downloadUrl;
    const name = downloadButton.dataset.downloadName || "lexflow-word.doc";
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const openButton = event.target.closest("[data-open-url]");
  if (openButton?.dataset.openUrl) {
    window.open(openButton.dataset.openUrl, "_blank", "noopener,noreferrer");
  }
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

async function initExcelLink() {
  excelNavLink?.addEventListener("click", async (event) => {
    event.preventDefault();
    const { data } = await supabase.from("profiles").select("sheet_url").eq("id", authUserId).single();
    window.open(data?.sheet_url || "./sheets.html?manage=1", "_blank", "noopener,noreferrer");
  });
}

async function init() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  authUserId = session.user.id;

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, bureau_name")
    .eq("id", authUserId)
    .single();

  if (profileError) {
    console.error(profileError);
  } else {
    profile = profileRow;
    userNameEl.textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "LexFlow Studio";
    userMetaEl.textContent = profile.bureau_name || "აუდიოდან Word ფაილის სამუშაო სივრცე";
  }

  await initExcelLink();
  await refreshHistory();
}

init();
