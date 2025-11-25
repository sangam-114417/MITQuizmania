/* Jeopardy Board with editable media attachments */

// ---------- Default board data ----------
const DEFAULT_DATA = {
  title: "Jeopardy Round",
  categories: [
    { name: "Geography", clues: [5, 10, 25, 50].map(points => sampleClue(points)) },
    { name: "Science", clues: [5, 10, 25, 50].map(points => sampleClue(points)) },
    { name: "Current Affairs", clues: [5, 10, 25, 50].map(points => sampleClue(points)) },
    { name: "Media", clues: [5, 10, 25, 50].map(points => sampleClue(points)) },
    { name: "Sports", clues: [5, 10, 25, 50].map(points => sampleClue(points)) }
  ],
  teams: [
    { name: "Team 1", score: 0 },
    { name: "Team 2", score: 0 },
    { name: "Team 3", score: 0 }
  ]
};

function sampleClue(points) {
  return {
    points,
    question: `Sample question for ${points} points. Replace me.`,
    answer: "Sample answer",
    used: false,
    media: {
      imageUrl: "",
      audioUrl: "",
      videoUrl: "",
      alt: ""
    }
  };
}

// ---------- Persistence ----------
const STORAGE_KEY = "jeopardy_board_v1";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_DATA);
  try {
    const parsed = JSON.parse(raw);
    return normalizeData(parsed);
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

// Ensure data conforms to expected shape: exactly 4 clue rows per category
function normalizeData(data) {
  if (!data || !Array.isArray(data.categories)) return structuredClone(DEFAULT_DATA);
  const targetClueCount = 4;
  const defaultPoints = [5, 10, 25, 50];

  data.categories = data.categories.map(cat => {
    const clues = Array.isArray(cat.clues) ? cat.clues.slice(0, targetClueCount) : [];
    // Fill missing clues with sample clues using standard point values
    for (let i = clues.length; i < targetClueCount; i++) {
      clues.push(sampleClue(defaultPoints[i] ?? defaultPoints[defaultPoints.length - 1]));
    }
    return { ...cat, clues };
  });

  if (!Array.isArray(data.teams)) data.teams = structuredClone(DEFAULT_DATA.teams);
  data.title = data.title || DEFAULT_DATA.title;
  return data;
}

// ---------- IndexedDB (snapshots) ----------
const DB_NAME = "jeopardyDB";
const DB_VERSION = 1;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("snapshots")) {
        const store = db.createObjectStore("snapshots", { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAddSnapshot(entry) {
  return openIndexedDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite");
    const store = tx.objectStore("snapshots");
    const r = store.add(entry);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function idbGetAllSnapshots() {
  return openIndexedDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readonly");
    const store = tx.objectStore("snapshots");
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function idbImportSnapshots(snapshotArray) {
  return openIndexedDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite");
    const store = tx.objectStore("snapshots");
    try {
      for (const s of snapshotArray) store.add(s);
    } catch (err) {
      reject(err);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  }));
}

async function saveSnapshot() {
  try {
    const entry = { data: structuredClone(state.data), timestamp: Date.now(), title: state.data.title };
    await idbAddSnapshot(entry);
    return true;
  } catch (err) {
    console.error("Failed saving snapshot:", err);
    return false;
  }
}

async function exportDatabase() {
  const snaps = await idbGetAllSnapshots();
  const blob = new Blob([JSON.stringify({ snapshots: snaps }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jeopardy-db.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importDatabaseFromObject(obj) {
  if (!obj || !Array.isArray(obj.snapshots)) throw new Error("Invalid DB format");
  await idbImportSnapshots(obj.snapshots);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  // Save a snapshot of the board asynchronously so history of changes is preserved
  saveSnapshot().catch(err => console.error("Snapshot error:", err));
}

// ---------- App state ----------
const state = {
  data: loadData(),
  editMode: false,
  current: null // {catIndex, clueIndex}
};

// ---------- DOM refs ----------
const boardEl = document.getElementById("board");
const roundTitleEl = document.getElementById("roundTitle");
const teamsEl = document.getElementById("teams");
const toggleEditBtn = document.getElementById("toggleEdit");
const newBoardBtn = document.getElementById("newBoard");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFileInput = document.getElementById("importFile");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const resetUsedBtn = document.getElementById("resetUsed");
const teamCountInput = document.getElementById("teamCount");
const applyTeamsBtn = document.getElementById("applyTeams");

// Modals
const clueModal = document.getElementById("clueModal");
const closeClueBtn = document.getElementById("closeClue");
const clueTitleEl = document.getElementById("clueTitle");
const clueBodyEl = document.getElementById("clueBody");
const mediaContainerEl = document.getElementById("mediaContainer");
const playAudioBtn = document.getElementById("playAudio");
const revealBtn = document.getElementById("revealBtn");
const hideBtn = document.getElementById("hideBtn");
const answerPanel = document.getElementById("answerPanel");
const answerText = document.getElementById("answerText");
const markUsedBtn = document.getElementById("markUsed");
const awardToSelect = document.getElementById("awardTo");
const awardPointsBtn = document.getElementById("awardPoints");
const deductPointsBtn = document.getElementById("deductPoints");

const editModal = document.getElementById("editModal");
const closeEditBtn = document.getElementById("closeEdit");
const editForm = document.getElementById("editForm");
const editCategoryName = document.getElementById("editCategoryName");
const editPoints = document.getElementById("editPoints");
const editQuestion = document.getElementById("editQuestion");
const editAnswer = document.getElementById("editAnswer");
const editImageUrl = document.getElementById("editImageUrl");
const editAudioUrl = document.getElementById("editAudioUrl");
const editVideoUrl = document.getElementById("editVideoUrl");
const editImageFile = document.getElementById("editImageFile");
const editAudioFile = document.getElementById("editAudioFile");
const editVideoFile = document.getElementById("editVideoFile");
const editUsed = document.getElementById("editUsed");
const editAlt = document.getElementById("editAlt");
const saveEditBtn = document.getElementById("saveEdit");
const deleteClueBtn = document.getElementById("deleteClue");

// ---------- Renderers ----------
function renderBoard() {
  boardEl.innerHTML = "";
  if (roundTitleEl) roundTitleEl.textContent = state.data.title || "Jeopardy Round";

  const columns = state.data.categories.length;
  boardEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  state.data.categories.forEach((cat, catIndex) => {
    const catEl = document.createElement("div");
    catEl.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = cat.name;
    catEl.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "cards";

    cat.clues.forEach((clue, clueIndex) => {
      const card = document.createElement("button");
      card.className = "card";
      card.textContent = clue.points;
      if (clue.used) card.classList.add("used");
      if (state.editMode) card.classList.add("editable");

      card.addEventListener("click", () => {
        state.current = { catIndex, clueIndex };
        if (state.editMode) openEditModal();
        else openClueModal();
      });

      grid.appendChild(card);
    });

    catEl.appendChild(grid);
    boardEl.appendChild(catEl);
  });
}

function renderTeams() {
  teamsEl.innerHTML = "";
  state.data.teams.forEach((team, idx) => {
    const row = document.createElement("div");
    row.className = "team";

    const name = document.createElement("input");
    name.className = "team-name";
    name.value = team.name;
    name.addEventListener("input", e => {
      team.name = e.target.value;
      updateAwardList();
      saveData();
    });

    const score = document.createElement("div");
    score.className = "team-score";
    score.textContent = team.score;

    const resetBtn = document.createElement("button");
    resetBtn.className = "btn";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => {
      team.score = 0;
      renderTeams();
      updateAwardList();
      saveData();
    });

    row.appendChild(name);
    row.appendChild(score);
    row.appendChild(resetBtn);
    teamsEl.appendChild(row);
  });

  updateAwardList();
}

function updateAwardList() {
  awardToSelect.innerHTML = "";
  state.data.teams.forEach((t, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = t.name;
    awardToSelect.appendChild(opt);
  });
}

// ---------- Clue modal ----------
function openClueModal() {
  const { catIndex, clueIndex } = state.current;
  const cat = state.data.categories[catIndex];
  const clue = cat.clues[clueIndex];

  clueTitleEl.textContent = `${cat.name} — ${clue.points}`;
  clueBodyEl.textContent = clue.question;
  answerText.textContent = clue.answer;
  answerPanel.classList.add("hidden");
  hideBtn.disabled = true;
  revealBtn.disabled = false;

  mediaContainerEl.innerHTML = "";
  let audioNode = null;

  if (clue.media.imageUrl) {
    const img = document.createElement("img");
    img.src = clue.media.imageUrl;
    img.alt = clue.media.alt || "Clue image";
    mediaContainerEl.appendChild(img);
  }
  if (clue.media.videoUrl) {
    const video = document.createElement("video");
    video.src = clue.media.videoUrl;
    video.controls = true;
    video.preload = "metadata";
    mediaContainerEl.appendChild(video);
  }
  if (clue.media.audioUrl) {
    const audio = document.createElement("audio");
    audio.src = clue.media.audioUrl;
    audio.controls = true;
    mediaContainerEl.appendChild(audio);
    audioNode = audio;
  }

  playAudioBtn.disabled = !audioNode;
  playAudioBtn.onclick = () => audioNode?.play();

  markUsedBtn.onclick = () => {
    clue.used = true;
    saveData();
    renderBoard();
  };

  awardPointsBtn.onclick = () => adjustScore(clue.points);
  deductPointsBtn.onclick = () => adjustScore(-clue.points);

  revealBtn.onclick = () => {
    answerPanel.classList.remove("hidden");
    revealBtn.disabled = true;
    hideBtn.disabled = false;
  };
  hideBtn.onclick = () => {
    answerPanel.classList.add("hidden");
    hideBtn.disabled = true;
    revealBtn.disabled = false;
  };

  showModal(clueModal);
}

function adjustScore(delta) {
  const idx = parseInt(awardToSelect.value, 10);
  if (Number.isInteger(idx)) {
    state.data.teams[idx].score += delta;
    renderTeams();
    saveData();
  }
}

// ---------- Edit modal ----------
function openEditModal() {
  const { catIndex, clueIndex } = state.current;
  const cat = state.data.categories[catIndex];
  const clue = cat.clues[clueIndex];

  editCategoryName.value = cat.name;
  editPoints.value = clue.points;
  editQuestion.value = clue.question || "";
  editAnswer.value = clue.answer || "";
  editImageUrl.value = clue.media.imageUrl || "";
  editAudioUrl.value = clue.media.audioUrl || "";
  editVideoUrl.value = clue.media.videoUrl || "";
  editAlt.value = clue.media.alt || "";
  editUsed.checked = !!clue.used;

  saveEditBtn.onclick = () => {
    cat.name = editCategoryName.value.trim() || cat.name;
    clue.points = Number(editPoints.value) || clue.points;
    clue.question = editQuestion.value.trim();
    clue.answer = editAnswer.value.trim();
    clue.media.imageUrl = editImageUrl.value.trim();
    clue.media.audioUrl = editAudioUrl.value.trim();
    clue.media.videoUrl = editVideoUrl.value.trim();
    clue.media.alt = editAlt.value.trim();
    clue.used = editUsed.checked;

    saveData();
    renderBoard();
    closeModal(editModal);
  };

  deleteClueBtn.onclick = () => {
    cat.clues.splice(clueIndex, 1);
    saveData();
    renderBoard();
    closeModal(editModal);
  };

  // Handle local file uploads by reading as data URLs
  wireFileToUrl(editImageFile, editImageUrl);
  wireFileToUrl(editAudioFile, editAudioUrl);
  wireFileToUrl(editVideoFile, editVideoUrl);

  showModal(editModal);
}

function wireFileToUrl(fileInput, urlInput) {
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    urlInput.value = dataUrl;
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ---------- Modal helpers ----------
function showModal(el) {
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(el) {
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}

// ---------- Events ----------
toggleEditBtn.addEventListener("click", () => {
  state.editMode = !state.editMode;
  toggleEditBtn.textContent = `Edit mode: ${state.editMode ? "On" : "Off"}`;
  renderBoard();
});

newBoardBtn.addEventListener("click", () => {
  if (!confirm("Start a new board? This will overwrite the current data.")) return;
  state.data = structuredClone(DEFAULT_DATA);
  saveData();
  renderBoard();
  renderTeams();
});

importBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    if (!validateData(parsed)) throw new Error("Invalid schema");
    state.data = normalizeData(parsed);
    saveData();
    renderBoard();
    renderTeams();
  } catch (err) {
    alert("Invalid JSON file.");
  } finally {
    importFileInput.value = "";
  }
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jeopardy-board.json";
  a.click();
  URL.revokeObjectURL(url);
});

// DB UI handlers
const saveSnapshotBtn = document.getElementById("saveSnapshotBtn");
const exportDbBtn = document.getElementById("exportDbBtn");
const importDbBtn = document.getElementById("importDbBtn");
const importDbFile = document.getElementById("importDbFile");

if (saveSnapshotBtn) saveSnapshotBtn.addEventListener("click", async () => {
  const ok = await saveSnapshot();
  alert(ok ? "Snapshot saved." : "Failed to save snapshot. Check console.");
});

if (exportDbBtn) exportDbBtn.addEventListener("click", async () => {
  try {
    await exportDatabase();
  } catch (err) {
    console.error(err);
    alert("Failed exporting DB.");
  }
});

if (importDbBtn) importDbBtn.addEventListener("click", () => importDbFile.click());
if (importDbFile) importDbFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    await importDatabaseFromObject(parsed);
    alert("Database imported.");
  } catch (err) {
    console.error(err);
    alert("Invalid DB file.");
  } finally {
    importDbFile.value = "";
  }
});

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

resetUsedBtn.addEventListener("click", () => {
  state.data.categories.forEach(cat => cat.clues.forEach(c => c.used = false));
  saveData();
  renderBoard();
});

applyTeamsBtn.addEventListener("click", () => {
  const count = Math.max(0, Math.min(10, parseInt(teamCountInput.value, 10)));
  const current = state.data.teams.length;
  if (count > current) {
    for (let i = current; i < count; i++) state.data.teams.push({ name: `Team ${i + 1}`, score: 0 });
  } else if (count < current) {
    state.data.teams = state.data.teams.slice(0, count);
  }
  saveData();
  renderTeams();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal(clueModal);
    closeModal(editModal);
  }
  if (e.key === " " && clueModal.classList.contains("show")) {
    e.preventDefault();
    const hidden = answerPanel.classList.contains("hidden");
    if (hidden) {
      answerPanel.classList.remove("hidden");
      revealBtn.disabled = true;
      hideBtn.disabled = false;
    } else {
      answerPanel.classList.add("hidden");
      revealBtn.disabled = false;
      hideBtn.disabled = true;
    }
  }
});

// Close buttons
closeClueBtn.addEventListener("click", () => closeModal(clueModal));
closeEditBtn.addEventListener("click", () => closeModal(editModal));

// ---------- Validation ----------
function validateData(data) {
  if (!data || !Array.isArray(data.categories)) return false;
  for (const cat of data.categories) {
    if (typeof cat.name !== "string" || !Array.isArray(cat.clues)) return false;
    for (const clue of cat.clues) {
      if (typeof clue.points !== "number") return false;
      if (typeof clue.question !== "string") return false;
      if (typeof clue.answer !== "string") return false;
      if (!clue.media || typeof clue.media !== "object") return false;
    }
  }
  if (!Array.isArray(data.teams)) return false;
  return true;
}

// ---------- Bootstrap ----------
function init() {
  renderBoard();
  renderTeams();
}
init();
