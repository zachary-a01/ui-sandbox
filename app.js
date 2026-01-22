const app = document.getElementById("app");

let wordData = {};
let currentCategory = null;
let selectedWord = null;
let nineWords = [];

// mirrors Swift setting: highlightSelectedWord
let highlightSelectedWord = loadSetting();

// Current page for swipe-back routing
let currentPage = "categories";

/* -----------------------
   FAST TAP (no lag, no ghost click)
   ----------------------- */
function fastTap(el, handler) {
  if (!el) return;

  let lastTouchTime = 0;

  const run = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    handler(e);
  };

  el.addEventListener(
    "touchend",
    (e) => {
      lastTouchTime = Date.now();
      run(e);
    },
    { passive: false }
  );

  el.addEventListener(
    "pointerup",
    (e) => {
      if (Date.now() - lastTouchTime < 350) return;
      run(e);
    },
    { passive: false }
  );

  el.addEventListener("click", (e) => {
    if (Date.now() - lastTouchTime < 700) return;
    run(e);
  });
}

// Prevent dblclick zoom (no tap throttling)
document.addEventListener(
  "dblclick",
  (e) => e.preventDefault(),
  { passive: false }
);

/* -----------------------
   iOS RUBBER-BAND KILLER
   - Body is overflow:hidden in CSS, but iOS can still "rubber band"
   - This forces: only .scrollArea can scroll
   - Prevents bounce at top/bottom edges of the scrollArea
   ----------------------- */
(function lockOverscrollIOS() {
  function closestScrollArea(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains("scrollArea")) return el;
      el = el.parentNode;
    }
    return null;
  }

  let activeSA = null;
  let lastY = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;

      activeSA = closestScrollArea(e.target);
      lastY = e.touches[0].clientY;

      // If we're not starting inside the scroll area, we will block page-drag on touchmove.
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 1) return;

      const y = e.touches[0].clientY;
      const dy = y - lastY;
      lastY = y;

      // Not in a scrollArea -> prevent the whole page from dragging/bouncing
      if (!activeSA) {
        e.preventDefault();
        return;
      }

      // If content doesn't actually scroll, block any movement (prevents bounce)
      if (activeSA.scrollHeight <= activeSA.clientHeight) {
        e.preventDefault();
        return;
      }

      const atTop = activeSA.scrollTop <= 0;
      const atBottom = activeSA.scrollTop + activeSA.clientHeight >= activeSA.scrollHeight - 1;

      // dy > 0 = finger moved down -> user trying to scroll up
      if (atTop && dy > 0) {
        e.preventDefault(); // stop bounce at top
        return;
      }

      // dy < 0 = finger moved up -> user trying to scroll down
      if (atBottom && dy < 0) {
        e.preventDefault(); // stop bounce at bottom
        return;
      }

      // Otherwise allow normal scroll inside the scroll area
    },
    { passive: false }
  );

  document.addEventListener(
    "touchend",
    () => {
      activeSA = null;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchcancel",
    () => {
      activeSA = null;
    },
    { passive: true }
  );
})();

/* -----------------------
   SWIPE BACK (left-edge, iOS-like)
   - start within 24px of left edge
   - horizontal swipe right >= 70px
   - ignores vertical scroll gestures
   ----------------------- */
(function enableSwipeBack() {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let decided = false;
  let isHorizontal = false;

  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;

      tracking = startX <= 24; // edge only
      decided = false;
      isHorizontal = false;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!tracking) return;

      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (!decided) {
        decided = true;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      // If it’s a horizontal edge swipe, prevent browser from doing anything weird
      if (isHorizontal && dx > 0) {
        e.preventDefault();
      } else {
        // vertical gesture -> cancel swipe so scrolling works
        tracking = false;
      }
    },
    { passive: false }
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
  // categories -> do nothing
}

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

function setPageClass(name) {
  document.body.classList.remove("page-categories", "page-words", "page-nine", "page-settings", "page-teaser");
  document.body.classList.add(name);

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
   Settings
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

  document.getElementById("highlightToggle").addEventListener("change", (e) => {
    saveSetting(e.target.checked);
  });

  fastTap(document.getElementById("teaserBtn"), showTeaser);
}

/* -----------------------
   Teaser
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
   Page 3: Nine words
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
