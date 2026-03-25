window.SUPABASE_URL = 'https://zwbgtfjvedsrxnblcsbf.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TS1wkstrtHqRt5cW2NGCtQ_B-1mT5mi';
window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.getProjectUrl = function getProjectUrl(targetFileName) {
  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace(/[^/]*$/, targetFileName);
  currentUrl.search = '';
  currentUrl.hash = '';
  return currentUrl.toString();
};
