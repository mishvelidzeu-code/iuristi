(function () {
  const STORAGE_KEY = 'lexmanage-calendar-events';
  const form = document.querySelector('#form');
  const hearingDateInput = document.querySelector('#fhearingDate');
  const hearingTimeInput = document.querySelector('#fhearingTime');
  const deadlineInput = document.querySelector('#fdeadline');
  const reminderInput = document.querySelector('#freminderDate');
  const meetingLocationInput = document.querySelector('#fmeetingLocation');
  const nextActionInput = document.querySelector('#fnextAction');

  if (!form || !hearingDateInput || !hearingTimeInput || !deadlineInput || !reminderInput) {
    return;
  }

  deadlineInput.type = 'hidden';
  reminderInput.type = 'hidden';

  const firstDateRow = deadlineInput.parentElement;
  const secondDateRow = reminderInput.parentElement;

  if (firstDateRow) firstDateRow.className = 'grid md:grid-cols-1 gap-4';
  if (secondDateRow) secondDateRow.className = 'grid md:grid-cols-1 gap-4';

  if (!document.querySelector('#caseScheduleAdd') && secondDateRow) {
    secondDateRow.insertAdjacentHTML('afterend', `
      <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div class="text-[13px] font-extrabold text-slate-800">საქმის კალენდარი</div>
            <div class="text-xs text-slate-500 mt-1">აქედან დაამატებ ვადებს, მითითებებს და შეხვედრებს ამ საქმეზე.</div>
          </div>
          <button type="button" id="caseScheduleAdd" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">მითითების დამატება</button>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button type="button" id="caseSchedulePrev" class="w-8 h-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">&larr;</button>
            <button type="button" id="caseScheduleNext" class="w-8 h-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">&rarr;</button>
          </div>
          <div id="caseScheduleMonth" class="text-[13px] font-extrabold text-slate-800"></div>
          <button type="button" id="caseScheduleToday" class="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700">დღეს</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-[9px] uppercase text-slate-400 font-bold">
          <div class="text-center">ორშ</div>
          <div class="text-center">სამ</div>
          <div class="text-center">ოთხ</div>
          <div class="text-center">ხუთ</div>
          <div class="text-center">პარ</div>
          <div class="text-center">შაბ</div>
          <div class="text-center">კვი</div>
        </div>
        <div id="caseScheduleGrid" class="grid grid-cols-7 gap-1"></div>
        <div class="rounded-2xl bg-white border border-slate-200 p-3 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <div id="caseScheduleSelected" class="text-[13px] font-extrabold text-slate-800"></div>
            <button type="button" id="caseScheduleEditorToggle" class="px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">რედაქტორი</button>
          </div>
          <div id="caseScheduleAgenda" class="space-y-2"></div>
        </div>
        <div id="caseScheduleEditor" class="off rounded-2xl bg-white border border-slate-200 p-3 space-y-3">
          <input id="caseScheduleEventId" type="hidden">
          <div class="grid md:grid-cols-2 gap-3">
            <input id="caseScheduleTitle" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white outline-none text-sm" placeholder="მოკლე სათაური">
            <select id="caseScheduleCategory" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white outline-none text-sm">
              <option>ვადა</option>
              <option>შეხვედრა</option>
              <option>შეხსენება</option>
              <option>საქმეზე შენიშვნა</option>
            </select>
          </div>
          <div class="grid md:grid-cols-2 gap-3">
            <input id="caseScheduleDate" type="date" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white outline-none text-sm">
            <input id="caseScheduleTime" type="time" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white outline-none text-sm">
          </div>
          <textarea id="caseScheduleNotes" rows="3" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white outline-none resize-none text-sm" placeholder="დეტალური მითითება ამ დღისთვის..."></textarea>
          <div id="caseScheduleMsg" class="off rounded-2xl border px-4 py-3 text-sm font-medium"></div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="caseScheduleSave" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">შენახვა</button>
            <button type="button" id="caseScheduleCancel" class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">დახურვა</button>
            <button type="button" id="caseScheduleReset" class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">გასუფთავება</button>
          </div>
        </div>
      </div>
    `);
  }

  const els = {
    add: document.querySelector('#caseScheduleAdd'),
    prev: document.querySelector('#caseSchedulePrev'),
    next: document.querySelector('#caseScheduleNext'),
    today: document.querySelector('#caseScheduleToday'),
    month: document.querySelector('#caseScheduleMonth'),
    grid: document.querySelector('#caseScheduleGrid'),
    selected: document.querySelector('#caseScheduleSelected'),
    agenda: document.querySelector('#caseScheduleAgenda'),
    editor: document.querySelector('#caseScheduleEditor'),
    toggle: document.querySelector('#caseScheduleEditorToggle'),
    eventId: document.querySelector('#caseScheduleEventId'),
    title: document.querySelector('#caseScheduleTitle'),
    category: document.querySelector('#caseScheduleCategory'),
    date: document.querySelector('#caseScheduleDate'),
    time: document.querySelector('#caseScheduleTime'),
    notes: document.querySelector('#caseScheduleNotes'),
    msg: document.querySelector('#caseScheduleMsg'),
    save: document.querySelector('#caseScheduleSave'),
    cancel: document.querySelector('#caseScheduleCancel'),
    reset: document.querySelector('#caseScheduleReset')
  };

  const state = {
    monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDateKey: '',
    draftEntries: [],
    persistedEntries: [],
    storeMode: 'local'
  };

  function formatKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseKey(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(value, amount) {
    const date = parseKey(value);
    date.setDate(date.getDate() + amount);
    return formatKey(date);
  }

  function defaultReminderDate(eventDate) {
    const todayKey = formatKey(new Date());
    return parseKey(eventDate) <= parseKey(todayKey) ? eventDate : addDays(eventDate, -1);
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat('ka-GE', { month: 'long', year: 'numeric' }).format(date);
  }

  function longDateLabel(value) {
    return new Intl.DateTimeFormat('ka-GE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(parseKey(value));
  }

  function badgeClass(category) {
    if (category === 'ვადა') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (category === 'შეხსენება') return 'bg-rose-50 text-rose-700 border-rose-100';
    if (category === 'პროცესი') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  function showScheduleMessage(type, text) {
    els.msg.className = `rounded-2xl border px-4 py-3 text-sm font-medium ${type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`;
    els.msg.textContent = text;
    els.msg.classList.remove('off');
  }

  function hideScheduleMessage() {
    els.msg.classList.add('off');
  }

  function readAllLocalEntries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function writeUserLocalEntries(userId, entries) {
    const others = readAllLocalEntries().filter((item) => item.user_id !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...entries]));
  }

  function sortEntries(entries) {
    return [...entries].sort((left, right) => {
      if (left.event_date !== right.event_date) return left.event_date.localeCompare(right.event_date);
      if (!left.event_time && !right.event_time) return left.title.localeCompare(right.title, 'ka');
      if (!left.event_time) return 1;
      if (!right.event_time) return -1;
      return left.event_time.localeCompare(right.event_time);
    });
  }

  async function loadPersistedEntries(caseId) {
    const user = await getCurrentUser();
    try {
      const { data, error } = await window.supabaseClient
        .from('calendar_events')
        .select('id,user_id,related_case_id,title,category,event_date,event_time,reminder_date,location,notes,created_at,updated_at')
        .eq('user_id', user.id)
        .eq('related_case_id', caseId)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;
      state.persistedEntries = data || [];
      state.storeMode = 'supabase';
    } catch (error) {
      state.persistedEntries = readAllLocalEntries().filter((item) => item.user_id === user.id && item.related_case_id === caseId);
      state.storeMode = 'local';
    }
  }

  async function saveEntryToStore(entry, caseId) {
    const user = await getCurrentUser();
    const row = {
      user_id: user.id,
      related_case_id: caseId,
      title: entry.title,
      category: entry.category,
      event_date: entry.event_date,
      event_time: entry.event_time || null,
      reminder_date: defaultReminderDate(entry.event_date),
      location: meetingLocationInput.value.trim() || null,
      notes: entry.notes || null
    };

    if (state.storeMode === 'supabase') {
      if (entry.id) {
        const { error } = await window.supabaseClient
          .from('calendar_events')
          .update(row)
          .eq('id', entry.id)
          .eq('user_id', user.id);
        if (error) throw error;
        return entry.id;
      }

      const { data, error } = await window.supabaseClient
        .from('calendar_events')
        .insert(row)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    }

    const allEntries = readAllLocalEntries();
    const userEntries = allEntries.filter((item) => item.user_id === user.id);
    const id = entry.id || crypto.randomUUID();
    const nextEntry = {
      id,
      ...row,
      created_at: entry.id ? (userEntries.find((item) => item.id === entry.id)?.created_at || new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    writeUserLocalEntries(user.id, [...userEntries.filter((item) => item.id !== id), nextEntry]);
    return id;
  }

  async function deleteEntryFromStore(entryId, caseId) {
    const user = await getCurrentUser();

    if (state.storeMode === 'supabase') {
      const { error } = await window.supabaseClient
        .from('calendar_events')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id)
        .eq('related_case_id', caseId);
      if (error) throw error;
      return;
    }

    const userEntries = readAllLocalEntries().filter((item) => item.user_id === user.id);
    writeUserLocalEntries(user.id, userEntries.filter((item) => item.id !== entryId));
  }

  function hearingEntry() {
    if (!hearingDateInput.value) return null;
    return {
      id: '__hearing__',
      title: 'ძირითადი თარიღი',
      category: 'პროცესი',
      event_date: hearingDateInput.value,
      event_time: hearingTimeInput.value || '',
      notes: nextActionInput.value.trim() || 'საქმის ძირითადი თარიღი',
      locked: true
    };
  }

  function activeEntries() {
    const baseEntries = (fields.id.value ? state.persistedEntries : state.draftEntries).map((item) => ({ ...item }));
    const hearing = hearingEntry();
    if (hearing) baseEntries.push(hearing);
    return sortEntries(baseEntries);
  }

  function entriesForDate(dateKey) {
    return activeEntries().filter((item) => item.event_date === dateKey);
  }

  function calendarDates() {
    const firstDay = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - offset);
    return Array.from({ length: 35 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      return current;
    });
  }

  function resetEditor(dateValue = state.selectedDateKey || hearingDateInput.value || formatKey(new Date())) {
    els.eventId.value = '';
    els.title.value = '';
    els.category.value = 'ვადა';
    els.date.value = dateValue;
    els.time.value = '';
    els.notes.value = '';
    hideScheduleMessage();
  }

  function openEditor(entry = null) {
    els.editor.classList.remove('off');
    resetEditor(entry ? entry.event_date : state.selectedDateKey);
    if (entry) {
      els.eventId.value = entry.id || '';
      els.title.value = entry.title || '';
      els.category.value = entry.category || 'ვადა';
      els.date.value = entry.event_date || state.selectedDateKey;
      els.time.value = entry.event_time || '';
      els.notes.value = entry.notes || '';
    }
    els.title.focus();
  }

  function closeEditor() {
    els.editor.classList.add('off');
    hideScheduleMessage();
  }

  function renderAgenda() {
    els.selected.textContent = longDateLabel(state.selectedDateKey);
    const items = entriesForDate(state.selectedDateKey);

    if (!items.length) {
      els.agenda.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ამ დღეზე ჩანაწერი არ არის.</div>';
      return;
    }

    els.agenda.innerHTML = items.map((entry) => `
      <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap gap-2 mb-2">
              <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeClass(entry.category)}">${entry.category}</span>
            </div>
            <div class="font-extrabold text-slate-800">${entry.title}</div>
            <div class="text-xs text-slate-500 mt-1">${entry.event_time || 'დრო არ არის მითითებული'}</div>
            <div class="text-sm text-slate-500 mt-2">${entry.notes || 'დეტალური ჩანაწერი არ არის.'}</div>
          </div>
          ${entry.locked ? '' : `<div class="flex flex-col gap-2"><button type="button" data-schedule-edit="${entry.id}" class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">რედაქტირება</button><button type="button" data-schedule-delete="${entry.id}" class="px-3 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600">წაშლა</button></div>`}
        </div>
      </article>
    `).join('');
  }

  function renderGrid() {
    els.month.textContent = monthLabel(state.monthCursor);
    const hearing = hearingEntry();
    if (!state.selectedDateKey) {
      state.selectedDateKey = hearing?.event_date || formatKey(new Date());
    }

    els.grid.innerHTML = calendarDates().map((date) => {
      const dateKey = formatKey(date);
      const items = entriesForDate(dateKey);
      const isCurrentMonth = date.getMonth() === state.monthCursor.getMonth();
      const isSelected = dateKey === state.selectedDateKey;
      const isToday = dateKey === formatKey(new Date());

      return `
        <button type="button" data-schedule-date="${dateKey}" class="min-h-[58px] rounded-xl border p-1.5 text-left transition ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'} ${isCurrentMonth ? '' : 'opacity-55'}">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="text-[11px] font-extrabold">${date.getDate()}</div>
            ${isToday ? '<span class="inline-flex items-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">დღეს</span>' : ''}
          </div>
          <div class="space-y-1">
            ${items.slice(0, 2).map((item) => `<div class="rounded-lg px-1.5 py-1 text-[9px] font-bold ${item.category === 'ვადა' ? 'bg-amber-50 text-amber-700' : item.category === 'პროცესი' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}">${item.title}</div>`).join('')}
            ${items.length > 2 ? `<div class="text-[9px] font-bold text-slate-400">+${items.length - 2}</div>` : ''}
          </div>
        </button>
      `;
    }).join('');
  }

  function renderSchedule() {
    if (!state.selectedDateKey) {
      state.selectedDateKey = hearingDateInput.value || formatKey(new Date());
    }
    const selectedDate = parseKey(state.selectedDateKey);
    state.monthCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderGrid();
    renderAgenda();
  }

  async function saveEditorEntry() {
    const payload = {
      id: els.eventId.value || null,
      title: els.title.value.trim(),
      category: els.category.value,
      event_date: els.date.value,
      event_time: els.time.value,
      notes: els.notes.value.trim()
    };

    if (!payload.title || !payload.event_date) {
      showScheduleMessage('err', 'შეავსე მინიმუმ სათაური და თარიღი.');
      return;
    }

    state.selectedDateKey = payload.event_date;

    if (fields.id.value) {
      await saveEntryToStore(payload, fields.id.value);
      await loadPersistedEntries(fields.id.value);
    } else {
      const draftId = payload.id || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextDraft = { id: draftId, ...payload, related_case_id: null };
      state.draftEntries = [...state.draftEntries.filter((item) => item.id !== draftId), nextDraft];
    }

    closeEditor();
    renderSchedule();
  }

  async function syncDraftEntries(caseId) {
    if (!state.draftEntries.length) return;
    for (const entry of [...state.draftEntries]) {
      await saveEntryToStore({ ...entry, id: null }, caseId);
    }
    state.draftEntries = [];
    await loadPersistedEntries(caseId);
    renderSchedule();
  }

  async function loadForCase(caseId) {
    state.selectedDateKey = hearingDateInput.value || state.selectedDateKey || formatKey(new Date());
    closeEditor();
    if (caseId) {
      await loadPersistedEntries(caseId);
    } else {
      state.persistedEntries = [];
    }
    renderSchedule();
  }

  function prepareNewCase() {
    state.persistedEntries = [];
    state.draftEntries = [];
    state.selectedDateKey = hearingDateInput.value || formatKey(new Date());
    closeEditor();
    renderSchedule();
  }

  const originalResetForm = typeof resetForm === 'function' ? resetForm : null;
  if (originalResetForm) {
    resetForm = function () {
      originalResetForm();
      prepareNewCase();
    };
  }

  const originalFill = typeof fill === 'function' ? fill : null;
  if (originalFill) {
    fill = function (item) {
      originalFill(item);
      Promise.resolve(loadForCase(item.id)).catch((error) => console.error(error));
    };
  }

  const originalSaveCaseToDb = typeof saveCaseToDb === 'function' ? saveCaseToDb : null;
  if (originalSaveCaseToDb) {
    saveCaseToDb = async function (payload) {
      const savedId = await originalSaveCaseToDb(payload);
      if (!payload.id && state.draftEntries.length) {
        await syncDraftEntries(savedId);
      } else if (payload.id) {
        await loadForCase(savedId);
      }
      return savedId;
    };
  }

  hearingDateInput.addEventListener('change', () => {
    state.selectedDateKey = hearingDateInput.value || state.selectedDateKey || formatKey(new Date());
    renderSchedule();
  });
  hearingTimeInput.addEventListener('change', renderSchedule);
  if (meetingLocationInput) meetingLocationInput.addEventListener('input', renderSchedule);
  if (nextActionInput) nextActionInput.addEventListener('input', renderSchedule);

  document.querySelector('#newCase')?.addEventListener('click', () => setTimeout(prepareNewCase, 0));
  document.querySelector('#primary')?.addEventListener('click', () => setTimeout(prepareNewCase, 0));

  els.add.addEventListener('click', () => openEditor());
  els.toggle.addEventListener('click', () => {
    if (els.editor.classList.contains('off')) openEditor();
    else closeEditor();
  });
  els.save.addEventListener('click', () => {
    Promise.resolve(saveEditorEntry()).catch((error) => {
      console.error(error);
      showScheduleMessage('err', error.message || 'შენახვა ვერ შესრულდა.');
    });
  });
  els.cancel.addEventListener('click', closeEditor);
  els.reset.addEventListener('click', () => {
    if (window.confirm('დარწმუნებული ხარ, რომ რედაქტორის გასუფთავება გინდა?')) {
      resetEditor();
    }
  });
  els.prev.addEventListener('click', () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() - 1, 1);
    renderGrid();
  });
  els.next.addEventListener('click', () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + 1, 1);
    renderGrid();
  });
  els.today.addEventListener('click', () => {
    state.selectedDateKey = formatKey(new Date());
    renderSchedule();
  });

  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-schedule-date]');
    if (!button) return;
    state.selectedDateKey = button.dataset.scheduleDate;
    renderSchedule();
  });

  els.agenda.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-schedule-edit]');
    if (editButton) {
      const items = fields.id.value ? state.persistedEntries : state.draftEntries;
      const entry = items.find((item) => item.id === editButton.dataset.scheduleEdit);
      if (entry) openEditor(entry);
      return;
    }

    const deleteButton = event.target.closest('[data-schedule-delete]');
    if (!deleteButton) return;
    if (!window.confirm('დარწმუნებული ხარ, რომ ამ მითითების წაშლა გინდა?')) return;

    const deleteId = deleteButton.dataset.scheduleDelete;
    Promise.resolve((async () => {
      if (fields.id.value) {
        await deleteEntryFromStore(deleteId, fields.id.value);
        await loadPersistedEntries(fields.id.value);
      } else {
        state.draftEntries = state.draftEntries.filter((item) => item.id !== deleteId);
      }
      renderSchedule();
    })()).catch((error) => console.error(error));
  });

  const initialCaseId = fields.id.value || (typeof selected !== 'undefined' ? selected : null);
  if (initialCaseId) {
    Promise.resolve(loadForCase(initialCaseId)).catch((error) => console.error(error));
  } else {
    prepareNewCase();
  }
})();
