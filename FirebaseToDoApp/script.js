// ===== Firebase init =====
const firebaseConfig = {
  apiKey: "AIzaSyCCFlBbSLio7bEWRKlcEMnBPTbC93VpZ6A",
  authDomain: "todofirebase-9efd6.firebaseapp.com",
  databaseURL: "https://todofirebase-9efd6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "todofirebase-9efd6",
  storageBucket: "todofirebase-9efd6.appspot.com",
  messagingSenderId: "153991891486",
  appId: "1:153991891486:web:540f4d6d3d8c7836d53c0f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== State =====
let editId = null;
let allTasks = {};      // cache fra realtime listener
let templates = {};     // { tplId: {name, steps:[{title,description,priority,offsetDays,labels[] }]} }

// ===== Utils =====
const prioWeight = p => (p === "High" ? 3 : p === "Medium" ? 2 : 1);
const byId = id => document.getElementById(id);

function parseLabels(str) {
  if (!str) return [];
  return str
    .split(/[\s,]+/)
    .map(s => s.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 10);
}

function toISODateOnly(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(baseISO, n) {
  const d = baseISO ? new Date(baseISO) : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nowTs() { return Date.now(); }

// ===== CRUD =====
function addTask() {
  const title = byId('taskTitle').value.trim();
  const desc = byId('taskDesc').value.trim();
  const priority = byId('taskPriority').value;
  const dueISO = toISODateOnly(byId('taskDue').value);
  const labels = parseLabels(byId('taskLabels').value);

  if (!title) { alert("Titel mangler"); return; }

  const taskData = {
    title,
    description: desc,
    priority,
    dueDate: dueISO || null,
    labels,
    isDone: false,
    updatedAt: nowTs()
  };

  if (editId) {
    db.ref('tasks/' + editId).update(taskData);
    byId('submitBtn').innerText = 'Tilføj opgave';
    editId = null;
  } else {
    const newRef = db.ref('tasks').push();
    taskData.createdAt = nowTs();
    newRef.set(taskData);
  }

  byId('taskTitle').value = '';
  byId('taskDesc').value = '';
  byId('taskPriority').value = 'Medium';
  byId('taskDue').value = '';
  byId('taskLabels').value = '';
}

function deleteTask(id) {
  if (confirm('Slet opgaven?')) {
    db.ref('tasks/' + id).remove();
    stopFocus(id); // ryd evt. lokalt fokus
  }
}

function editTask(id, task) {
  byId('taskTitle').value = task.title || '';
  byId('taskDesc').value = task.description || '';
  byId('taskPriority').value = task.priority || 'Medium';
  byId('taskDue').value = task.dueDate || '';
  byId('taskLabels').value = (task.labels || []).map(l => `#${l}`).join(' ');
  byId('submitBtn').innerText = 'Opdater opgave';
  editId = id;
}

function toggleIsDone(id, currentState) {
  db.ref('tasks/' + id).update({ isDone: !currentState, updatedAt: nowTs() });
}

// ===== Fokus / Pomodoro (lokal) =====
const FOCUS_KEY = "focusTimers"; // {taskId: endTimestamp}
function loadFocusMap() {
  try { return JSON.parse(localStorage.getItem(FOCUS_KEY) || "{}"); }
  catch { return {}; }
}
function saveFocusMap(map) { localStorage.setItem(FOCUS_KEY, JSON.stringify(map)); }
function startFocus(id, minutes = 25) {
  const endsAt = Date.now() + minutes * 60 * 1000;
  const map = loadFocusMap(); map[id] = endsAt; saveFocusMap(map);
  render(); // opdater knaptekst
}
function stopFocus(id) {
  const map = loadFocusMap(); delete map[id]; saveFocusMap(map);
  render();
}
function formatCountdown(ms) {
  if (ms <= 0) return "00:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}
setInterval(() => {
  const map = loadFocusMap();
  if (Object.keys(map).length) render(); // opdater hvert sekund ved aktive timere
}, 1000);

// ===== Templates =====
function saveTemplate() {
  const name = prompt("Navn på skabelon?");
  if (!name) return;

  const raw = prompt(
`Skriv én linje pr. opgave:
Titel | Beskrivelse | Prioritet(H/M/L) | +Nd | #labels

Eksempel:
Pak taske | tøj og pas | H | +0d | #rejse
Køb billet | find billig | M | +1d | #rejse`
  );
  if (!raw) return;

  const steps = [];
  raw.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const parts = line.split('|').map(s => s.trim());
    const [t, d, pRaw, offsetRaw, labelsRaw] = parts;
    if (!t) return;
    const pMap = { H: "High", M: "Medium", L: "Low" };
    const pr = pMap[(pRaw || 'M').toUpperCase()] || "Medium";
    const off = (offsetRaw || '+0d').toLowerCase().match(/\+?(\d+)d/);
    const offsetDays = off ? parseInt(off[1], 10) : 0;
    const labels = parseLabels(labelsRaw || '');
    steps.push({ title: t, description: d || '', priority: pr, offsetDays, labels });
  });

  if (!steps.length) { alert("Ingen gyldige linjer."); return; }

  const tplRef = db.ref('templates').push();
  tplRef.set({ name, steps }, (err) => {
    if (err) { alert("Kunne ikke gemme skabelon (tjek rules/netværk)."); return; }
    // Vælg den nyoprettede skabelon i dropdown’en
    const newId = tplRef.key;
    db.ref('templates').once('value', () => {
      const sel = byId('templateSelect');
      sel.value = newId;
    });
    alert(`Skabelon "${name}" gemt (${steps.length} opgaver).`);
  });
}

function loadTemplates() {
  db.ref('templates').on('value', snap => {
    templates = snap.val() || {};
    const sel = byId('templateSelect');
    sel.innerHTML = '';

    if (!Object.keys(templates).length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Ingen skabeloner endnu';
      opt.disabled = true;
      opt.selected = true;
      sel.appendChild(opt);
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Vælg skabelon …';
    placeholder.disabled = true;
    placeholder.selected = true;
    sel.appendChild(placeholder);

    Object.entries(templates).forEach(([id, tpl]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = tpl.name || id;
      sel.appendChild(opt);
    });
  });
}

// ===== Skabelon → tasks (med origin + label) =====
function applySelectedTemplate() {
  const sel = byId('templateSelect');
  const id = sel.value;
  if (!id) { alert("Vælg en skabelon først."); return; }
  const tpl = templates[id];
  if (!tpl || !Array.isArray(tpl.steps)) return;

  const base = toISODateOnly(byId('taskDue').value) || new Date().toISOString().slice(0,10);
  const batch = {};
  const skabelonLabel = `skabelon-${(tpl.name || 'ukendt').toLowerCase().replace(/\s+/g,'-')}`;

  tpl.steps.forEach(step => {
    const ref = db.ref('tasks').push();
    const due = addDays(base, step.offsetDays || 0);
    batch[ref.key] = {
      title: step.title,
      description: step.description || '',
      priority: step.priority || 'Medium',
      dueDate: due,
      labels: [...(step.labels || []), skabelonLabel],
      isDone: false,
      origin: { templateId: id, templateName: tpl.name || 'Skabelon' }, // <-- vigtigt
      createdAt: nowTs(),
      updatedAt: nowTs()
    };
  });
  db.ref('tasks').update(batch);
  alert(`Oprettede ${tpl.steps.length} opgaver fra "${tpl.name}".`);
}

// ===== Collapse state (Skjul/Vis per skabelon) =====
const COLLAPSE_KEY = "templateCollapse";
function getCollapseMap() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); }
  catch { return {}; }
}
function setCollapsed(templateId, collapsed) {
  const m = getCollapseMap(); m[templateId] = !!collapsed;
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(m));
}
function isCollapsed(templateId) {
  const m = getCollapseMap(); return !!m[templateId];
}

// ===== Render (grupperet) =====
function render() {
  const list = byId('taskList');
  list.innerHTML = '';
  const tpl = byId('taskItemTpl');

  // filtrer
  const fStatus = byId('filterStatus').value;     // all | open | done
  const fPrio = byId('filterPriority').value;     // all | High | Medium | Low
  const fLabel = (byId('filterLabel').value || '').replace(/^#/, '').trim();
  const sortBy = byId('sortBy').value;

  let items = Object.entries(allTasks).map(([id, t]) => ({ id, ...t }));
  if (fStatus !== 'all') items = items.filter(it => fStatus === 'done' ? it.isDone : !it.isDone);
  if (fPrio !== 'all') items = items.filter(it => (it.priority || 'Medium') === fPrio);
  if (fLabel) items = items.filter(it => (it.labels || []).includes(fLabel));

  items.sort((a, b) => {
    if (sortBy === 'dueDate') {
      const ad = a.dueDate || '9999-12-31', bd = b.dueDate || '9999-12-31';
      return ad.localeCompare(bd);
    }
    if (sortBy === 'priority') {
      return prioWeight(b.priority || 'Medium') - prioWeight(a.priority || 'Medium');
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0); // default: nyeste først
  });

  // Gruppér efter origin.templateId
  const groups = new Map(); // key: templateId|null -> {title, items:[]}
  for (const it of items) {
    const gkey = it.origin?.templateId || null;
    const gtitle = it.origin?.templateName || 'Individuelle opgaver';
    if (!groups.has(gkey)) groups.set(gkey, { title: gtitle, items: [] });
    groups.get(gkey).items.push(it);
  }

  const focusMap = loadFocusMap();
  const now = Date.now();

  for (const [gkey, g] of groups.entries()) {
    // Sektion wrapper
    const section = document.createElement('div');
    section.className = 'section';

    // Header
    const header = document.createElement('div');
    header.className = 'section-header';

    const h3 = document.createElement('h3');
    h3.textContent = (gkey ? `Skabelon: ${g.title}` : g.title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${g.items.length} opgave${g.items.length === 1 ? '' : 'r'}`;

    const btn = document.createElement('button');
    btn.className = 'collapse-btn';
    const collapsed = gkey ? isCollapsed(gkey) : false;
    btn.textContent = collapsed ? 'Vis' : 'Skjul';
    btn.onclick = () => { if (gkey) { setCollapsed(gkey, !isCollapsed(gkey)); render(); } };

    header.appendChild(h3);
    header.appendChild(meta);
    if (gkey) header.appendChild(btn);
    section.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'section-body';

    if (!collapsed) {
      for (const it of g.items) {
        const node = tpl.content.firstElementChild.cloneNode(true);

        if (it.isDone) node.classList.add('done');

        node.querySelector('.title').textContent = it.title || '(uden titel)';
        node.querySelector('.desc').textContent = it.description || '';

        const labWrap = node.querySelector('.labels');
        (it.labels || []).forEach(l => {
          const span = document.createElement('span');
          span.className = 'badge';
          span.textContent = '#' + l;
          labWrap.appendChild(span);
        });

        const p = (it.priority || 'Medium');
        const pr = node.querySelector('.badge.prio');
        pr.textContent = p;
        pr.dataset.p = p;

        const due = it.dueDate;
        const dueEl = node.querySelector('.badge.due');
        if (due) {
          const overdue = !it.isDone && new Date(due) < new Date(new Date().toISOString().slice(0,10));
          dueEl.textContent = due;
          if (overdue) dueEl.classList.add('overdue');
        } else {
          dueEl.textContent = 'ingen dato';
        }

        const doneBtn = node.querySelector('.done-btn');
        doneBtn.textContent = it.isDone ? 'Fortryd' : 'Udført';
        doneBtn.onclick = () => toggleIsDone(it.id, it.isDone);

        const editBtn = node.querySelector('.edit-btn');
        editBtn.onclick = () => editTask(it.id, it);

        const delBtn = node.querySelector('.delete-btn');
        delBtn.onclick = () => deleteTask(it.id);

        const focusBtn = node.querySelector('.focus-btn');
        if (focusMap[it.id] && focusMap[it.id] > now) {
          const remaining = focusMap[it.id] - now;
          focusBtn.textContent = `Fokus ${formatCountdown(remaining)}`;
          focusBtn.onclick = () => (confirm('Stop fokus?') && stopFocus(it.id));
        } else {
          focusBtn.textContent = 'Fokus';
          focusBtn.onclick = () => startFocus(it.id, 25);
        }

        body.appendChild(node);
      }
    }

    section.appendChild(body);
    list.appendChild(section);
  }
}

// ===== Realtime listeners =====
db.ref('tasks').on('value', snapshot => {
  allTasks = snapshot.val() || {};
  render();
});

loadTemplates();
render(); // initial tom render
