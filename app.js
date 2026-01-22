const app = document.getElementById("app");

let wordData = {};
let currentCategory = null;
let selectedWord = null;
let nineWords = [];

// mirrors Swift setting: highlightSelectedWord
let highlightSelectedWord = loadSetting();

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
   Swift: category list underlined, plus hidden settings tap
   ----------------------- */
function showCategories() {
  setPageClass("page-categories");
  currentCategory = null;
  selectedWord = null;

  // Swift uses jsonManager.categories.keys.sorted()
  const categories = Object.keys(wordData).sort((a, b) => a.localeCompare(b));

  app.innerHTML = `
    <div class="header">
      <h1 class="title">CATEGORIES</h1>
      <div class="headerUnderline"></div>
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

    <!-- Swift: invisible 30x30 NavigationLink bottom-left -->
    <div class="settingsHotspot" id="settingsHotspot" aria-label="Settings"></div>
  `;

  document.querySelectorAll(".categoryItem").forEach((item) => {
    item.addEventListener("click", () => showWordList(item.dataset.cat));
  });

  document.getElementById("settingsHotspot").addEventListener("click", showSettings);
}

/* -----------------------
   Settings screen (Swift SettingsView)
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

      <button class="linkBtn" id="teaserBtn">Learn the secret here!</button>

      <div class="spacer"></div>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", showCategories);

  document.getElementById("highlightToggle").addEventListener("change", (e) => {
    saveSetting(e.target.checked);
  });

  document.getElementById("teaserBtn").addEventListener("click", showTeaser);
}

/* -----------------------
   Teaser screen (Swift TeaserView)
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

  document.getElementById("backBtn").addEventListener("click", showSettings);
}

/* -----------------------
   Page 2: Word list (Swift Page2)
   - Header underlined only
   - Words are SHUFFLED on appear (not sorted)
   - Selecting turns text GREEN
   - Next button enabled only if selected
   ----------------------- */
function showWordList(category) {
  setPageClass("page-words");
  currentCategory = category;
  selectedWord = null;

  const straight = wordData[category]?.Straight ?? [];
  const curved = wordData[category]?.Curved ?? [];

  // Swift: (straight + curved).shuffled()
  const words = shuffleCopy([...straight, ...curved]);

  app.innerHTML = `
    <div class="backCircle" id="backBtn"><span>‹</span></div>

    <div class="header">
      <h1 class="title">${category.toUpperCase()}</h1>
      <div class="headerUnderline"></div>
    </div>

    <div class="scrollArea">
      <div class="list wordsList">
        ${words
          .map(
            (w) => `
          <div class="wordItem" data-word="${escapeHtml(w)}">${w}</div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="btnRow">
      <button class="nextBtn" id="nextBtn" disabled>Next</button>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", showCategories);

  document.querySelectorAll(".wordItem").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".wordItem").forEach((x) => x.classList.remove("selected"));
      item.classList.add("selected");
      selectedWord = item.dataset.word;
      document.getElementById("nextBtn").disabled = false;
    });
  });

  document.getElementById("nextBtn").addEventListener("click", showNineScreen);
}

/* -----------------------
   Page 3: 9 words (Swift Page3)
   - NO header
   - SHUFFLE changes words + positions but keeps trick logic
   - Highlight selected only if setting enabled
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
      <button class="shuffleBtn" id="shuffleBtn">SHUFFLE</button>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => showWordList(currentCategory));

  document.getElementById("shuffleBtn").addEventListener("click", () => {
    nineWords = buildNineWords(currentCategory, selectedWord);
    renderNineScreen();
  });
}

/* Trick logic matches Swift Page3:
   If selectedWord is in Straight -> decoys from Curved, else decoys from Straight
*/
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
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}