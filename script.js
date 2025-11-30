/* ========= CONFIG & TEST MODE ======= */
// se true: agenda o alarme para 1 minuto no futuro (para testes rápidos)
const TEST_MODE = false;

if ("Notification" in window) {
  // pede permissão uma vez ao carregar o app (mostra prompt)
  Notification.requestPermission().then((perm) => {
    console.log("Permissão de notificação:", perm);
  }).catch(()=>{});
}

/* ========= Config ======= */
const FIRST_HOUR = 5;
const LAST_HOUR = 23;
const STEP_MIN = 30; // 30 em 30 minutos

/* ========= Util ======= */
function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateFromYMD(ymd) {
  const [y,m,d] = ymd.split("-").map(Number);
  return new Date(y,m-1,d);
}
function todayLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()); // midnight local
}

/* ========= DOM ======= */
const mesAnoEl = document.getElementById("mes-ano");
const grid = document.getElementById("grid-calendario");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

const telaDia = document.getElementById("tela-dia");
const tituloDia = document.getElementById("titulo-dia");
const btnVoltar = document.getElementById("btn-voltar");
const gradeHoras = document.getElementById("grade-horas");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-titulo");
const modalInput = document.getElementById("modal-input");
const modalCheckbox = document.getElementById("modal-checkbox");
const modalSave = document.getElementById("modal-save");
const modalCancel = document.getElementById("modal-cancel");
const modalDelete = document.getElementById("modal-delete");

const btnCopyDay = document.getElementById("btn-copy-day");
const btnCopyWeek = document.getElementById("btn-copy-week");
const btnApplyRest = document.getElementById("btn-apply-rest");

/* ========= Estado ======= */
let viewDate = todayLocal(); // usado para mostrar mês (primeiro dia do mês)
viewDate.setDate(1);

let selectedDay = null; // 'YYYY-MM-DD'
let selectedTime = null; // 'HH:MM'

// Map para manter timers agendados na sessão atual e evitar duplicatas
// chave: `${ymd}|${time}`
const scheduledAlarms = new Map();

/* ========= Inicial ======= */
renderCalendar(viewDate);
setupListeners();
startAutoAdvanceCheck();

/* ========= Funções de renderização do calendário ======= */
function renderCalendar(baseDate) {
  grid.innerHTML = "";
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  mesAnoEl.textContent = baseDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  // primeiro dia da semana (segunda = 1)
  const firstOfMonth = new Date(year, month, 1);
  // em JS domingo=0, segunda=1 ... convert to Monday-based index
  const shift = (firstOfMonth.getDay() + 6) % 7; // number of blank cells before day 1

  // dias do mês
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Add blanks
  for (let i = 0; i < shift; i++) {
    const blank = document.createElement("div");
    blank.className = "dia-card past";
    blank.style.visibility = "hidden";
    grid.appendChild(blank);
  }

  const today = todayLocal();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const ymd = formatDateYMD(dateObj);

    const card = document.createElement("div");
    card.className = "dia-card";
    // highlight today
    if (formatDateYMD(today) === ymd) card.classList.add("today");

    // past date (before today) should be blocked only if it's strictly before today local
    if (dateObj < today) card.classList.add("past");

    // Top row: number + weekday name + month day
    const top = document.createElement("div");
    top.className = "dia-top";

    const num = document.createElement("div");
    num.className = "dia-num";
    num.textContent = day;

    const weekname = document.createElement("div");
    weekname.className = "dia-week";
    const weekday = dateObj.toLocaleString("pt-BR", { weekday: "long" });
    weekname.textContent = `${weekday} • ${String(day).padStart(2,"0")}/${String(month+1).padStart(2,"0")}`;

    top.appendChild(num);
    top.appendChild(weekname);

    // preview of up to 2 activities
    const preview = document.createElement("div");
    preview.className = "preview";

    const dayKey = `rotina-${ymd}`;
    const saved = JSON.parse(localStorage.getItem(dayKey) || "null") || {};

    const times = Object.keys(saved).sort();
    if (times.length === 0) {
      const empty = document.createElement("div");
      empty.style.color = "var(--muted)";
      empty.style.fontSize = "13px";
      empty.textContent = "vazio";
      preview.appendChild(empty);
    } else {
      for (let i = 0; i < Math.min(2, times.length); i++) {
        const t = times[i];
        const row = document.createElement("div");
        row.className = "item";
        const text = document.createElement("div");
        text.className = "texto";
        text.textContent = `${t} • ${saved[t].texto || ""}`;
        const icon = document.createElement("div");
        icon.textContent = saved[t].lembrete ? "🔔" : "";
        row.appendChild(text);
        row.appendChild(icon);
        preview.appendChild(row);
      }
    }

    card.appendChild(top);
    card.appendChild(preview);

    // evento click: abre dia, mas impede editar dias anteriores a hoje
    card.addEventListener("click", () => {
      const todayStr = formatDateYMD(today);
      if (formatDateYMD(dateObj) < formatDateYMD(today)) {
        if (formatDateYMD(today) !== ymd) {
          // bloqueado
          window.alert("Não é possível editar dias anteriores a hoje.");
          return;
        }
      }
      openDay(ymd);
    });

    grid.appendChild(card);
  }

  // Depois de renderizar o calendário, agendamos alarmes para o mês visível
  // Mas só se a tela do calendário estiver visível (não sobrescrever quando no detalhe de dia)
  if (document.querySelector(".calendario-wrap") && document.querySelector(".calendario-wrap").classList.contains("hidden") === false) {
    scheduleAlarmsForVisibleMonth(baseDate);
  }
}

/* ========= Navegação e listeners ======= */
function setupListeners() {
  btnPrev.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar(viewDate);
  });
  btnNext.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar(viewDate);
  });

  btnVoltar.addEventListener("click", () => {
    telaDia.classList.add("hidden");
    document.querySelector(".calendario-wrap").classList.remove("hidden");
  });

  modalCancel.addEventListener("click", closeModal);
  modalSave.addEventListener("click", onModalSave);
  modalDelete.addEventListener("click", onModalDelete);

  btnCopyDay.addEventListener("click", copyToNextDay);
  btnCopyWeek.addEventListener("click", copyToNextWeek);
  btnApplyRest.addEventListener("click", applyToRestOfMonth);
}

/* ========= Dia -> Horas ======= */
function openDay(ymd) {
  selectedDay = ymd;

  tituloDia.textContent = dateFromYMD(ymd).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  document.querySelector(".calendario-wrap").classList.add("hidden");
  telaDia.classList.remove("hidden");

  renderHoursForDay(ymd);

  // 🔔 Reagendar alarmes das atividades desse dia
  const saved = JSON.parse(localStorage.getItem(`rotina-${ymd}`) || "null") || {};
  Object.keys(saved).forEach(t => {
    if (saved[t].lembrete) {
      scheduleAlarm(ymd, t, saved[t].texto);
    }
  });
}

function renderHoursForDay(ymd) {
  gradeHoras.innerHTML = "";
  const dayKey = `rotina-${ymd}`;
  const saved = JSON.parse(localStorage.getItem(dayKey) || "null") || {};

  // build times array (30min step)
  const times = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    times.push(`${String(h).padStart(2,"0")}:00`);
    if (!(h === LAST_HOUR && STEP_MIN === 60)) times.push(`${String(h).padStart(2,"0")}:30`);
  }

  times.forEach(t => {
    const card = document.createElement("div");
    card.className = "hora-card";
    const small = document.createElement("small");
    small.textContent = t;
    const txt = document.createElement("div");
    txt.className = "text";
    txt.textContent = saved[t]?.texto || "";

    const notif = document.createElement("div");
    notif.className = "notif-icone";
    notif.textContent = saved[t]?.lembrete ? "🔔" : "";

    card.appendChild(small);
    card.appendChild(txt);
    card.appendChild(notif);

    // prevent editing if date < today
    const dateObj = dateFromYMD(ymd);
    const today = todayLocal();
    const disabled = dateObj < today && formatDateYMD(today) !== ymd;

    if (disabled) {
      card.classList.add("past");
      card.title = "Dia anterior - edição bloqueada";
    } else {
      card.addEventListener("click", () => openModalForTime(t, saved[t]));
    }

    gradeHoras.appendChild(card);
  });
}

/* ========= Modal handling ======= */
function openModalForTime(time, existing) {
  selectedTime = time;
  // use dateFromYMD to avoid timezone shift
  modalTitle.textContent = `${dateFromYMD(selectedDay).toLocaleDateString("pt-BR")} • ${time}`;
  modalInput.value = existing?.texto || "";
  modalCheckbox.checked = !!existing?.lembrete;
  modal.classList.remove("hidden");
  modalInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modalInput.value = "";
  modalCheckbox.checked = false;
  selectedTime = null;
}

function onModalSave() {
  if (!selectedDay || !selectedTime) return;
  const key = `rotina-${selectedDay}`;
  const stored = JSON.parse(localStorage.getItem(key) || "null") || {};
  const text = modalInput.value.trim();
  const lemb = modalCheckbox.checked;

  if (!text) {
    delete stored[selectedTime];
    // se remover lembrete, cancelar alarmes agendados para este horário
    cancelScheduledAlarm(`${selectedDay}|${selectedTime}`);
  } else {
    stored[selectedTime] = { texto: text, lembrete: lemb };
  }

  if (Object.keys(stored).length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(stored));
  }

  closeModal();
  renderHoursForDay(selectedDay);
  renderCalendar(viewDate);

  if (lemb && text) {
    // pede permissão e, se concedida, agenda o alarme
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        scheduleAlarm(selectedDay, selectedTime, text);
      } else {
        console.log("Permissão de notificação não concedida:", perm);
      }
    }).catch(()=>{});
  } else {
    // se desmarcou lembrete, certificar-se que não há timer pendente
    cancelScheduledAlarm(`${selectedDay}|${selectedTime}`);
  }
}

function onModalDelete() {
  if (!selectedDay || !selectedTime) return;
  const key = `rotina-${selectedDay}`;
  const stored = JSON.parse(localStorage.getItem(key) || "null") || {};
  delete stored[selectedTime];
  if (Object.keys(stored).length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(stored));

  // cancelar alarm
  cancelScheduledAlarm(`${selectedDay}|${selectedTime}`);

  closeModal();
  renderHoursForDay(selectedDay);
  renderCalendar(viewDate);
}

/* ========= Copiar / Aplicar ações ======= */
// copia todo o dia selecionado para o próximo dia (dia+1)
function copyToNextDay() {
  if (!selectedDay) return alert("Abra um dia primeiro.");
  const srcKey = `rotina-${selectedDay}`;
  const src = JSON.parse(localStorage.getItem(srcKey) || "null") || {};
  if (Object.keys(src).length === 0) return alert("Dia vazio para copiar.");

  const dateObj = dateFromYMD(selectedDay);
  const next = new Date(dateObj); next.setDate(dateObj.getDate() + 1);
  const nextYmd = formatDateYMD(next);

  // prevent copying into past
  const today = todayLocal();
  if (next < today) return alert("Não é possível copiar para um dia anterior a hoje.");

  localStorage.setItem(`rotina-${nextYmd}`, JSON.stringify(src));
  alert(`Atividades copiadas para ${nextYmd}`);
  renderCalendar(viewDate);
}

// copia a semana do dia selecionado para a próxima semana (diariamente +7 dias)
function copyToNextWeek() {
  if (!selectedDay) return alert("Abra um dia primeiro.");
  const dateObj = dateFromYMD(selectedDay);
  const year = dateObj.getFullYear(), month = dateObj.getMonth(), day = dateObj.getDate();

  // for each of 7 days starting at selectedDay, copy to +7
  let any = false;
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month, day + i);
    const key = `rotina-${formatDateYMD(d)}`;
    const src = JSON.parse(localStorage.getItem(key) || "null") || {};
    if (Object.keys(src).length === 0) continue;
    const target = new Date(d); target.setDate(d.getDate() + 7);
    if (target < todayLocal()) continue; // don't write into past
    localStorage.setItem(`rotina-${formatDateYMD(target)}`, JSON.stringify(src));
    any = true;
  }
  alert(any ? "Semana copiada para a próxima semana." : "Nenhuma atividade encontrada na semana atual para copiar.");
  renderCalendar(viewDate);
}

// aplica o dia selecionado (se tiver atividades) para todos os dias restantes do mês
function applyToRestOfMonth() {
  if (!selectedDay) return alert("Abra um dia primeiro.");
  const key = `rotina-${selectedDay}`;
  const src = JSON.parse(localStorage.getItem(key) || "null") || {};
  if (Object.keys(src).length === 0) return alert("Dia selecionado está vazio.");

  const dateObj = dateFromYMD(selectedDay);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const start = dateObj.getDate() + 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = start; d <= daysInMonth; d++) {
    const target = new Date(year, month, d);
    if (target < todayLocal()) continue;
    localStorage.setItem(`rotina-${formatDateYMD(target)}`, JSON.stringify(src));
    count++;
  }
  alert(`Aplicado para ${count} dias restantes do mês.`);
  renderCalendar(viewDate);
}

/* ========= Auto-advance quando muda o dia ======= */
function startAutoAdvanceCheck() {
  let currentMonth = todayLocal().getMonth();
  setInterval(() => {
    const now = todayLocal();
    if (now.getMonth() !== currentMonth) {
      currentMonth = now.getMonth();
      // update viewDate to new month automatically (Option 1)
      viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
      // apenas renderiza se não estiver no detalhe do dia (evita sobrescrever tela aberta)
      if (document.querySelector(".calendario-wrap") && document.querySelector(".calendario-wrap").classList.contains("hidden") === false) {
        renderCalendar(viewDate);
      }
    } else {
      // atualiza highlights sem forçar perder contexto: se calendar estiver visível, re-render; se estiver no detalhe, apenas torna invisíveis os dias passados (simples solução)
      if (document.querySelector(".calendario-wrap") && document.querySelector(".calendario-wrap").classList.contains("hidden") === false) {
        renderCalendar(viewDate);
      } else {
        // se estiver no detalhe (telaDia aberta), atualiza a grade de horas (para bloquear/mostrar mudanças de "today")
        if (selectedDay) renderHoursForDay(selectedDay);
      }
    }
  }, 30 * 1000);
}

/* ========= helpers de agendamento ======= */
function alarmKey(ymd, time) {
  return `${ymd}|${time}`;
}
function cancelScheduledAlarm(key) {
  const item = scheduledAlarms.get(key);
  if (item) {
    clearTimeout(item.timeoutId);
    scheduledAlarms.delete(key);
    console.log("Alarm cancelled:", key);
  }
}

/* scheduleAlarm:
   - agenda notificação 20 minutos antes (ou 1 minuto se TEST_MODE)
   - evita duplicados dentro da sessão
*/
function scheduleAlarm(ymd, time, text) {
  const key = alarmKey(ymd, time);

  // se já existe um timer para essa chave, cancelamos e re-agendamos
  if (scheduledAlarms.has(key)) {
    cancelScheduledAlarm(key);
  }

  // constroi o datetime local do evento
  const [h, m] = time.split(":").map(Number);
  const eventDate = dateFromYMD(ymd);
  eventDate.setHours(h, m, 0, 0);

  let alarmTime;
  if (TEST_MODE) {
    // para testes: tocar em 1 minuto
    alarmTime = new Date(Date.now() + 60 * 1000);
  } else {
    // horário real: 20 minutos antes
    alarmTime = new Date(eventDate.getTime() - 20 * 60 * 1000);
  }

  const now = new Date();
  if (alarmTime <= now) {
    // já passou; não agendamos
    return;
  }

  const delay = alarmTime - now;

  const timeoutId = setTimeout(() => {
    // checar permissão
    if (Notification.permission === "granted") {
      try {
        new Notification("Lembrete da sua atividade", {
          body: `${time} — ${text}`,
          tag: key
        });
      } catch (e) {
        console.error("Erro exibindo notificação:", e);
      }
    } else {
      console.log("Notificação não enviada — permissão não concedida.");
    }
    // remover do mapa depois de disparado
    scheduledAlarms.delete(key);
  }, delay);

  scheduledAlarms.set(key, { timeoutId, alarmTime });
  console.log("Alarm scheduled", key, "at", alarmTime.toString());
}

/* agenda alarmes para os dias do mês visível (somente do hoje em diante) */
function scheduleAlarmsForVisibleMonth(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    if (dateObj < today) continue; // só daqui pra frente
    const ymd = formatDateYMD(dateObj);
    const stored = JSON.parse(localStorage.getItem(`rotina-${ymd}`) || "null") || {};
    Object.keys(stored).forEach(t => {
      if (stored[t].lembrete) {
        scheduleAlarm(ymd, t, stored[t].texto);
      }
    });
  }
}

/* ========= Refresh quando voltar ao mês atual (se usuário navegar) ======= */
// se o usuário navega e quer forçar ver mês atual, ele pode clicar duas vezes no mes-ano para resetar
mesAnoEl.addEventListener("dblclick", () => {
  const now = todayLocal();
  viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar(viewDate);
});
