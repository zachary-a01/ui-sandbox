const app = document.getElementById("app");

let wordData = {};
let currentCategory = null;
let selectedWord = null;
let nineWords = [];

// mirrors Swift setting: highlightSelectedWord
let highlightSelectedWord = loadSetting();

// Track which screen we’re on (for swipe-back)
let currentPage = "categories";

/* -----------------------
   iOS/PWA fast-tap helper (no lag, no ghost click)
   ----------------------- */
function fastTap(el, handler) {
  if (!el) return;

  let lastTouchTime = 0;

  const run = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    handler(e);
  };

  // Touch is most reliable on iOS
  el.addEventListener(
    "touchend",
    (e) => {
      lastTouchTime = Date.now();
      run(e);
    },
    { passive: false }
  );

  // Pointer events cover modern browsers
  el.addEventListener(
    "pointerup",
    (e) => {
      if (Date.now() - lastTouchTime < 350) return; // avoid duplicate
      run(e);
    },
    { passive: false }
  );

  // Fallback click (desktop / non-touch)
  el.addEventListener("click", (e) => {
    if (Date.now() - lastTouchTime < 700) return; // ignore iOS ghost click
    run(e);
  });
}

// Block dblclick zoom behavior without slowing taps
document.addEventListener(
  "dblclick",
  (e) => e.preventDefault(),
  { passive: false }
);

/* -----------------------
   Load data then start
   ----------------------- */
fetch("words.json")
  .then((res) => res.json())
  .then((data) => {
    wordData = data;
    showCategories();
  })
  .catch((err) => {
    app.innerHTML = `<h1 style="color:white">Error loading words.json</h1><pre style="color:white">${err}</pre>`;
  });

/* -----------------------
   Page helpers
   ----------------------- */
function setPageClass(name) {
  document.body.classList.remove("page-categories", "page-words", "page-nine", "page-settings", "page-teaser");
  document.body.classList.add(name);

  // Map body class -> our currentPage string
  if (name === "page-categories") currentPage = "categories";
  else if (name === "page-words") currentPage = "words";
  else if (name === "page-nine") currentPage = "nine";
  else if (name === "page-settings") currentPage = "settings";
  else if (name === "page-teaser") currentPage = "teaser";
}

function loadSetting() {
  try {
    const v = localStorage.getItem("highlightSelectedWord");
    return v === "true";
  } catch {
    return false;
  }
}

function saveSetting(value) {
  highlightSelectedWord = !!value;
  try {
    localStorage.setItem("highlightSelectedWord", highlightSelectedWord ? "true" : "false");
  } catch {}
}

/* -----------------------
   Swipe-back (iOS-style)
   - Start near left edge
   - Move right enough
   - Ignore if mostly vertical (scrolling)
   ----------------------- */
(function enableSwipeBack() {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;

      // Only edge swipe (left 24px)
      tracking = startX <= 24;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!tracking) return;

      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);

      // If vertical movement dominates, treat as scroll, cancel swipe tracking
      if (dy > dx) tracking = false;
    },
    { passive: true }
  );

  document.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;

    if (dx >= 70) {
      goBack();
    }
  });
})();

function goBack() {
  // Mirror your back button behavior
  if (currentPage === "words") {
    showCategories();
    return;
  }
  if (currentPage === "nine") {
    if (currentCategory) showWordList(currentCategory);
    else showCategories();
    return;
  }
  if (currentPage === "settings") {
    showCategories();
    return;
  }
  if (currentPage === "teaser") {
    showSettings();
    return;
  }
  // categories: no-op
}

/* -----------------------
   Page 1: Categories
   ----------------------- */
function showCategories() {
  setPageClass("page-categories");
  currentCategory = null;
  selectedWord = null;

  const categories = Object.keys(wordData).sort((a, b) => a.localeCompare(b));

  app.innerHTML = `
    <div class="header">
      <h1 class="title">CATEGORIES</h1>
    </div>

    <div class="list categoriesList">
      ${categories
        .map(
          (cat) => `
        <div class="categoryItem" data-cat="${escapeHtml(cat)}">
          <div class="categoryText">${cat}</div>
          <div class="categoryUnderline"></div>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="settingsHotspot" id="settingsHotspot" aria-label="Settings"></div>
  `;

  document.querySelectorAll(".categoryItem").forEach((item) => {
    fastTap(item, () => showWordList(item.dataset.cat));
  });

  fastTap(document.getElementById("settingsHotspot"), showSettings);
}

/* -----------------------
   Settings screen
   ----------------------- */
function showSettings() {
  setPageClass("page-settings");

  app.innerHTML = `
    <div class="backCircle" id="backBtn"><span>‹</span></div>

    <div class="settingsWrap">
      <div class="settingsTitle">Settings</div>

      <label class="toggleRow">
        <span class="toggleLabel">Highlight Selected Word</span>
        <input type="checkbox" id="highlightToggle" ${highlightSelectedWord ? "checked" : ""}/>
      </label>

      <button class="linkBtn" id="teaserBtn" type="button">Learn the secret here!</button>

      <div class="spacer"></div>
    </div>
  `;

  fastTap(document.getElementById("backBtn"), showCategories);

  // checkbox should remain normal
  document.getElementById("highlightToggle").addEventListener("change", (e) => {
    saveSetting(e.target.checked);
  });

  fastTap(document.getElementById("teaserBtn"), showTeaser);
}

/* -----------------------
   Teaser screen
   ----------------------- */
function showTeaser() {
  setPageClass("page-teaser");

  app.innerHTML = `
    <div class="backCircle" id="backBtn"><span>‹</span></div>

    <div class="teaserWrap">
      <div class="teaserText">Look for visual cues and expressions</div>
      <div class="teaserText">Good luck! :)</div>
    </div>
  `;

  fastTap(document.getElementById("backBtn"), showSettings);
}

/* -----------------------
   Page 2: Word list
   - shuffled on appear
   - select turns green
   - Next enabled only if selected
   ----------------------- */
function showWordList(category) {
  setPageClass("page-words");
  currentCategory = category;
  selectedWord = null;

  const straight = wordData[category]?.Straight ?? [];
  const curved = wordData[category]?.Curved ?? [];

  const words = shuffleCopy([...straight, ...curved]);

  app.innerHTML = `
    <div class="backCircle" id="backBtn"><span>‹</span></div>

    <div class="header">
      <h1 class="title">${category.toUpperCase()}</h1>
    </div>

    <div class="scrollArea">
      <div class="list wordsList">
        ${words
          .map((w) => `<div class="wordItem" data-word="${escapeHtml(w)}">${w}</div>`)
          .join("")}
      </div>
    </div>

    <div class="btnRow">
      <button class="nextBtn" id="nextBtn" type="button" disabled>Next</button>
    </div>
  `;

  fastTap(document.getElementById("backBtn"), showCategories);

  document.querySelectorAll(".wordItem").forEach((item) => {
    fastTap(item, () => {
      document.querySelectorAll(".wordItem").forEach((x) => x.classList.remove("selected"));
      item.classList.add("selected");
      selectedWord = item.dataset.word;
      document.getElementById("nextBtn").disabled = false;
    });
  });

  fastTap(document.getElementById("nextBtn"), () => {
    if (!document.getElementById("nextBtn").disabled) showNineScreen();
  });
}

/* -----------------------
   Page 3: 9 words
   - no header
   - shuffle rebuilds list with trick logic
   ----------------------- */
function showNineScreen() {
  if (!currentCategory || !selectedWord) return;
  setPageClass("page-nine");
  nineWords = buildNineWords(currentCategory, selectedWord);
  renderNineScreen();
}

function renderNineScreen() {
  setPageClass("page-nine");

  app.innerHTML = `
    <div class="backCircle" id="backBtn"><span>‹</span></div>

    <div class="nineList">
      ${nineWords
        .map((w) => {
          const shouldHighlight = highlightSelectedWord && w === selectedWord;
          return `<div class="nineItem ${shouldHighlight ? "nineHighlight" : ""}">${w}</div>`;
        })
        .join("")}
    </div>

    <div class="btnRow shuffleRow">
      <button class="shuffleBtn" id="shuffleBtn" type="button">SHUFFLE</button>
    </div>
  `;

  fastTap(document.getElementById("backBtn"), () => {
    if (currentCategory) showWordList(currentCategory);
    else showCategories();
  });

  fastTap(document.getElementById("shuffleBtn"), () => {
    nineWords = buildNineWords(currentCategory, selectedWord);
    renderNineScreen();
  });
}

/* -----------------------
   Trick logic
   If chosen is Straight -> decoys from Curved
   else -> decoys from Straight
   ----------------------- */
function buildNineWords(category, chosen) {
  const categoryData = wordData[category];
  if (!categoryData) return [];

  const straight = categoryData.Straight ?? [];
  const curved = categoryData.Curved ?? [];

  const chosenIsStraight = straight.includes(chosen);
  const decoyPool = chosenIsStraight ? curved : straight;

  let randomWords = shuffleCopy(decoyPool).slice(0, 9);

  if (!randomWords.includes(chosen)) {
    randomWords[Math.floor(Math.random() * 9)] = chosen;
  }

  return shuffleCopy(randomWords).slice(0, 9);
}

function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
