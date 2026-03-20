/**
 * =============================================================================
 * CodeFlip — Coding Flashcard App
 * =============================================================================
 * Author  : Your Name
 * Version : 1.0.0
 * File    : app.js
 * Role    : All application logic, state management, and DOM interaction
 * -----------------------------------------------------------------------------
 * TABLE OF CONTENTS
 *   1.  Flashcard Data
 *   2.  Application State
 *   3.  DOM References  (cached at startup)
 *   4.  Screen Navigation
 *   5.  Storage Helpers  (localStorage abstraction)
 *   6.  Validation Helpers
 *   7.  Alert / Message Helper
 *   8.  Auth Handlers  (sign-up, login, logout)
 *   9.  Quiz Lifecycle  (start, load card, flip, submit, next, results)
 *  10.  UI Updaters     (progress bar, score chips)
 *  11.  Event Listeners
 *  12.  App Initialiser
 * =============================================================================
 */


/* =============================================================================
   1. FLASHCARD DATA
   ─────────────────────────────────────────────────────────────────────────────
   Each card object contains:
     @property {string} category  – Topic label shown at the top of the card
     @property {string} question  – The question text shown on the front face
     @property {string} answer    – The canonical expected answer (used for comparison)
     @property {string} display   – Nicely formatted answer shown on the back face
                                    (may include examples, notes, or code snippets)
============================================================================= */
const FLASHCARDS = [
  {
    category: "Variables",
    question:  "Which keyword declares a block-scoped variable in modern JavaScript that CAN be reassigned later?",
    answer:    "let",
    display:   "let\n\nExample:\n  let score = 0;\n  score = 10; // ✓ allowed"
  },
  {
    category: "Data Types",
    question:  "What does the expression   typeof null   return in JavaScript?",
    answer:    "object",
    display:   '"object"\n\nThis is a well-known historical bug in JS.\nnull is NOT actually an object — it\'s a primitive.'
  },
  {
    category: "Functions",
    question:  "What keyword is used inside a function to send a value back to the caller?",
    answer:    "return",
    display:   "return\n\nExample:\n  function add(a, b) {\n    return a + b;\n  }"
  },
  {
    category: "Loops",
    question:  "Which loop is guaranteed to execute its body at least once, even if the condition is false from the start?",
    answer:    "do while",
    display:   "do...while\n\nExample:\n  do {\n    // runs at least once\n  } while (condition);"
  },
  {
    category: "Arrays",
    question:  "Which built-in Array method adds one or more elements to the END of an array and returns the new length?",
    answer:    "push",
    display:   ".push()\n\nExample:\n  const arr = [1, 2];\n  arr.push(3); // arr → [1, 2, 3]"
  },
  {
    category: "Objects",
    question:  "Write the dot-notation expression to access a property called 'name' on an object called 'user'.",
    answer:    "user.name",
    display:   "user.name\n\nAlternative (bracket notation):\n  user['name']\n\nUse bracket notation when the key is dynamic."
  },
  {
    category: "Operators",
    question:  "Which operator checks both VALUE and TYPE (strict equality) in JavaScript?",
    answer:    "===",
    display:   "===  (strict equality)\n\n5 === '5'  → false  (different types)\n5 ==  '5'  → true   (loose — coerces types)"
  },
  {
    category: "Strings",
    question:  "Which String method returns a new string with every character converted to uppercase?",
    answer:    "touppercase",
    display:   ".toUpperCase()\n\nExample:\n  'hello'.toUpperCase() // → 'HELLO'\n\n(No arguments needed)"
  },
  {
    category: "Classes",
    question:  "What is the name of the special method inside a JavaScript class that runs automatically when 'new ClassName()' is called?",
    answer:    "constructor",
    display:   "constructor()\n\nExample:\n  class Dog {\n    constructor(name) {\n      this.name = name;\n    }\n  }"
  },
  {
    category: "Async JS",
    question:  "Which keyword, used inside an async function, pauses execution until a Promise resolves?",
    answer:    "await",
    display:   "await\n\nExample:\n  async function getData() {\n    const res  = await fetch(url);\n    const data = await res.json();\n  }"
  }
];


/* =============================================================================
   2. APPLICATION STATE
   ─────────────────────────────────────────────────────────────────────────────
   A single source of truth for everything the app needs to track at runtime.
   Mutated only through the handler functions below — never directly from
   event listeners — which makes debugging much easier.
============================================================================= */
const state = {
  /** @type {string|null}  Username of the currently authenticated user */
  currentUser: null,

  /** @type {Array}  Shuffled copy of FLASHCARDS for the active round */
  deck: [],

  /** @type {number}  Zero-based index into `deck` for the current card */
  cardIndex: 0,

  /** @type {number}  Total correct submissions this session */
  correct: 0,

  /** @type {number}  Total wrong submissions this session */
  wrong: 0,

  /** @type {boolean}  Has the user already submitted an answer for the current card? */
  answered: false,

  /** @type {boolean}  Is the flip card currently showing the answer (back) face? */
  flipped: false,
};


/* =============================================================================
   3. DOM REFERENCES
   ─────────────────────────────────────────────────────────────────────────────
   Cache every DOM element we'll interact with during the app's lifetime.
   Querying the DOM once at startup is far cheaper than repeated getElementById
   calls every time an event fires.
============================================================================= */
const DOM = {
  // ── Screens ──────────────────────────────────────────────────────────────
  screens: {
    signup:   document.getElementById("screen-signup"),
    login:    document.getElementById("screen-login"),
    welcome:  document.getElementById("screen-welcome"),
    game:     document.getElementById("screen-game"),
    results:  document.getElementById("screen-results"),
  },

  // ── Sign-up form ─────────────────────────────────────────────────────────
  signup: {
    username: document.getElementById("signup-username"),
    passkey:  document.getElementById("signup-passkey"),
    msg:      document.getElementById("signup-msg"),
    btn:      document.getElementById("btn-signup"),
  },

  // ── Login form ───────────────────────────────────────────────────────────
  login: {
    username: document.getElementById("login-username"),
    passkey:  document.getElementById("login-passkey"),
    msg:      document.getElementById("login-msg"),
    btn:      document.getElementById("btn-login"),
  },

  // ── Welcome screen ───────────────────────────────────────────────────────
  welcome: {
    username:   document.getElementById("welcome-username"),
    btnStart:   document.getElementById("btn-start"),
    btnLogout:  document.getElementById("btn-welcome-logout"),
  },

  // ── Game screen ───────────────────────────────────────────────────────────
  game: {
    progressLabel: document.getElementById("progress-label"),
    progressPct:   document.getElementById("progress-pct"),
    progressFill:  document.getElementById("progress-fill"),
    scoreCorrect:  document.getElementById("score-correct"),
    scoreWrong:    document.getElementById("score-wrong"),
    cardScene:     document.getElementById("card-scene"),
    flashCard:     document.getElementById("flash-card"),
    cardCategory:  document.getElementById("card-category"),
    cardQuestion:  document.getElementById("card-question"),
    cardAnswer:    document.getElementById("card-answer"),
    userAnswer:    document.getElementById("user-answer"),
    btnSubmit:     document.getElementById("btn-submit"),
    feedback:      document.getElementById("feedback"),
    btnNext:       document.getElementById("btn-next"),
  },

  // ── Results screen ────────────────────────────────────────────────────────
  results: {
    emoji:      document.getElementById("results-emoji"),
    title:      document.getElementById("results-title"),
    sub:        document.getElementById("results-sub"),
    pct:        document.getElementById("results-pct"),
    correct:    document.getElementById("result-correct"),
    wrong:      document.getElementById("result-wrong"),
    btnReplay:  document.getElementById("btn-replay"),
    btnHome:    document.getElementById("btn-results-home"),
    btnLogout:  document.getElementById("btn-results-logout"),
  },
};


/* =============================================================================
   4. SCREEN NAVIGATION
   ─────────────────────────────────────────────────────────────────────────────
   showScreen() is the single function responsible for switching views.
   It removes the active class from ALL screens, then adds it to the target.
   The CSS animation is triggered automatically by the class addition.

   @param {string} screenKey  – Key from DOM.screens object (e.g. "login")
============================================================================= */
function showScreen(screenKey) {
  // Remove active class from every screen
  Object.values(DOM.screens).forEach((el) => el.classList.remove("screen--active"));

  // Add active class to the requested screen
  const target = DOM.screens[screenKey];
  if (target) {
    target.classList.add("screen--active");
  } else {
    console.warn(`[CodeFlip] showScreen: unknown screen key "${screenKey}"`);
  }
}


/* =============================================================================
   5. STORAGE HELPERS
   ─────────────────────────────────────────────────────────────────────────────
   Thin wrappers around localStorage so the rest of the code doesn't need to
   worry about JSON serialisation / error handling.
============================================================================= */

/**
 * Retrieve all stored accounts.
 * @returns {Object} Map of { username: passkey }
 */
function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem("codeflip_accounts")) || {};
  } catch {
    // If stored data is corrupted, start fresh
    return {};
  }
}

/**
 * Persist the accounts map back to localStorage.
 * @param {Object} accounts
 */
function saveAccounts(accounts) {
  localStorage.setItem("codeflip_accounts", JSON.stringify(accounts));
}


/* =============================================================================
   6. VALIDATION HELPERS
   ─────────────────────────────────────────────────────────────────────────────
   Pure functions that return an error string, or null if valid.
   Keeping validation logic separate from handlers makes it easy to test.
============================================================================= */

/**
 * Validate a username string.
 * @param   {string} value
 * @returns {string|null}  Error message, or null if valid
 */
function validateUsername(value) {
  if (!value) return "Please enter a username.";
  if (value.length < 2) return "Username must be at least 2 characters.";
  if (value.length > 20) return "Username must be 20 characters or fewer.";
  // Allow letters, numbers, underscores, and hyphens only
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return "Username can only contain letters, numbers, _ and -.";
  }
  return null;
}

/**
 * Validate a passkey string.
 * @param   {string} value
 * @returns {string|null}  Error message, or null if valid
 */
function validatePasskey(value) {
  if (!value) return "Please enter a passkey.";
  if (!/^\d{4}$/.test(value)) return "Passkey must be exactly 4 digits.";
  return null;
}


/* =============================================================================
   7. ALERT / MESSAGE HELPER
   ─────────────────────────────────────────────────────────────────────────────
   Displays an inline alert inside an auth panel.
   The CSS classes alert--error / alert--success control visibility and colour.

   @param {HTMLElement} el      – The .alert element to update
   @param {string}      message – Text to display
   @param {string}      type    – "error" | "success"
   @param {number}      [ttl]   – Auto-hide after N ms (default: 3500)
============================================================================= */
function showAlert(el, message, type = "error", ttl = 3500) {
  // Reset classes first so the CSS animation re-triggers
  el.className = "alert";
  el.textContent = message;

  // Force a reflow so the browser registers the class removal before re-adding
  void el.offsetHeight;

  el.classList.add(`alert--${type}`);

  // Auto-hide
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.className = "alert";
  }, ttl);
}


/* =============================================================================
   8. AUTH HANDLERS
============================================================================= */

/**
 * Handle sign-up form submission.
 * Validates inputs → checks username availability → saves account → logs in.
 */
function handleSignup() {
  const username = DOM.signup.username.value.trim();
  const passkey  = DOM.signup.passkey.value.trim();

  // ── Validate inputs ────────────────────────────────────────────────────
  const usernameError = validateUsername(username);
  if (usernameError) {
    showAlert(DOM.signup.msg, usernameError);
    DOM.signup.username.focus();
    return;
  }

  const passkeyError = validatePasskey(passkey);
  if (passkeyError) {
    showAlert(DOM.signup.msg, passkeyError);
    DOM.signup.passkey.focus();
    return;
  }

  // ── Check uniqueness ───────────────────────────────────────────────────
  const accounts = getAccounts();
  if (accounts[username] !== undefined) {
    showAlert(DOM.signup.msg, "That username is already taken. Please choose another.");
    DOM.signup.username.focus();
    return;
  }

  // ── Persist new account ────────────────────────────────────────────────
  accounts[username] = passkey;
  saveAccounts(accounts);

  // ── Log the new user in straight away ─────────────────────────────────
  state.currentUser = username;
  DOM.welcome.username.textContent = username;

  showAlert(DOM.signup.msg, `Account created! Welcome aboard, ${username} 🎉`, "success", 2000);

  // Brief delay so the success message is visible before screen transition
  setTimeout(() => showScreen("welcome"), 900);
}


/**
 * Handle login form submission.
 * Validates inputs → looks up account → compares passkey → logs in.
 */
function handleLogin() {
  const username = DOM.login.username.value.trim();
  const passkey  = DOM.login.passkey.value.trim();

  // ── Basic field presence ───────────────────────────────────────────────
  if (!username || !passkey) {
    showAlert(DOM.login.msg, "Please fill in both fields.");
    return;
  }

  const accounts = getAccounts();

  // ── Username lookup ────────────────────────────────────────────────────
  if (accounts[username] === undefined) {
    showAlert(DOM.login.msg, "No account found with that username.");
    DOM.login.username.focus();
    return;
  }

  // ── Passkey comparison ─────────────────────────────────────────────────
  if (accounts[username] !== passkey) {
    showAlert(DOM.login.msg, "Incorrect passkey. Please try again.");
    DOM.login.passkey.value = "";
    DOM.login.passkey.focus();
    return;
  }

  // ── Success ────────────────────────────────────────────────────────────
  state.currentUser = username;
  DOM.welcome.username.textContent = username;
  showScreen("welcome");
}


/**
 * Log the current user out.
 * Clears session state and returns to the sign-up screen.
 */
function handleLogout() {
  // Clear in-memory session data
  state.currentUser = null;

  // Clear form fields so they don't pre-fill on next visit
  DOM.login.username.value = "";
  DOM.login.passkey.value  = "";

  showScreen("signup");
}


/* =============================================================================
   9. QUIZ LIFECYCLE
============================================================================= */

/**
 * Fisher-Yates shuffle — returns a new randomly ordered array.
 * Does NOT mutate the original.
 *
 * Time complexity: O(n)
 *
 * @param   {Array} array  – Source array
 * @returns {Array}        – New shuffled array
 */
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];   // destructuring swap
  }
  return copy;
}


/**
 * Initialise a new quiz round.
 * Resets all session counters, shuffles the deck, loads the first card,
 * and switches to the game screen.
 */
function startQuiz() {
  // Reset state
  state.deck      = shuffle(FLASHCARDS);
  state.cardIndex = 0;
  state.correct   = 0;
  state.wrong     = 0;

  // Reset score chips to zero
  DOM.game.scoreCorrect.textContent = "0";
  DOM.game.scoreWrong.textContent   = "0";

  showScreen("game");
  loadCard(0);
}


/**
 * Populate the flip card with data for the card at `index` in the deck,
 * and reset all interactive elements to their default (unanswered) state.
 *
 * @param {number} index  – Zero-based index into state.deck
 */
function loadCard(index) {
  const card  = state.deck[index];
  const total = state.deck.length;

  // ── Populate card faces ──────────────────────────────────────────────
  DOM.game.cardCategory.textContent = card.category;
  DOM.game.cardQuestion.textContent = card.question;
  DOM.game.cardAnswer.textContent   = card.display;   // <pre> preserves newlines

  // ── Update progress bar ──────────────────────────────────────────────
  updateProgress(index, total);

  // ── Reset interaction state ──────────────────────────────────────────
  state.answered = false;
  state.flipped  = false;

  // Un-flip the card if it was showing the answer
  DOM.game.flashCard.classList.remove("card-3d--flipped");

  // Clear and re-enable the answer input
  DOM.game.userAnswer.value    = "";
  DOM.game.userAnswer.disabled = false;
  DOM.game.btnSubmit.disabled  = false;

  // Auto-focus the input so the user can start typing immediately
  DOM.game.userAnswer.focus();

  // Reset feedback message
  DOM.game.feedback.className  = "feedback";
  DOM.game.feedback.textContent = "";

  // Hide the "Next Card" button until an answer is submitted
  DOM.game.btnNext.hidden = true;
}


/**
 * Toggle the 3-D flip on the flashcard.
 * Only allowed AFTER the user has submitted an answer,
 * preventing "peeking" at the answer before guessing.
 */
function flipCard() {
  if (!state.answered) return;   // guard: no peeking before answering

  state.flipped = !state.flipped;
  DOM.game.flashCard.classList.toggle("card-3d--flipped", state.flipped);
}


/**
 * Handle the user submitting their answer.
 * Compares the normalised input against the normalised expected answer,
 * updates the score, shows feedback, and optionally reveals the answer.
 */
function submitAnswer() {
  // Prevent double-submission
  if (state.answered) return;

  const raw = DOM.game.userAnswer.value.trim();

  // Do nothing on empty submission
  if (!raw) {
    DOM.game.userAnswer.focus();
    return;
  }

  const card = state.deck[state.cardIndex];

  /*
   * Normalise both strings before comparing:
   *   - Convert to lowercase
   *   - Collapse all whitespace (so "do while" matches "dowhile")
   * This prevents penalising the user for capitalisation or spacing.
   */
  const normalise  = (str) => str.toLowerCase().replace(/\s+/g, "");
  const expected   = normalise(card.answer);
  const given      = normalise(raw);
  const isCorrect  = given === expected;

  // ── Update score ─────────────────────────────────────────────────────
  if (isCorrect) {
    state.correct++;
    DOM.game.scoreCorrect.textContent = state.correct;
  } else {
    state.wrong++;
    DOM.game.scoreWrong.textContent = state.wrong;
  }

  // ── Show feedback ─────────────────────────────────────────────────────
  const fb = DOM.game.feedback;
  if (isCorrect) {
    fb.textContent = "✓ Correct! Nailed it!";
    fb.className   = "feedback feedback--correct";
  } else {
    fb.textContent = `✗ Not quite. The answer was: "${card.answer}" — tap the card to see it.`;
    fb.className   = "feedback feedback--wrong";
    // Auto-flip so the user sees the correct answer immediately
    state.flipped = true;
    DOM.game.flashCard.classList.add("card-3d--flipped");
  }

  // ── Lock the input after submission ───────────────────────────────────
  state.answered               = true;
  DOM.game.userAnswer.disabled = true;
  DOM.game.btnSubmit.disabled  = true;

  // ── Reveal the next-card button ───────────────────────────────────────
  DOM.game.btnNext.hidden = false;
  DOM.game.btnNext.focus();
}


/**
 * Advance to the next card, or end the round if all cards have been played.
 */
function nextCard() {
  state.cardIndex++;

  if (state.cardIndex >= state.deck.length) {
    showResults();
  } else {
    loadCard(state.cardIndex);
  }
}


/* =============================================================================
  10. UI UPDATERS
============================================================================= */

/**
 * Update the progress bar label, percentage text, and fill width.
 *
 * @param {number} index  – Current card index (0-based)
 * @param {number} total  – Total number of cards
 */
function updateProgress(index, total) {
  const pct = Math.round((index / total) * 100);

  DOM.game.progressLabel.textContent      = `Card ${index + 1} of ${total}`;
  DOM.game.progressPct.textContent        = `${pct}%`;
  DOM.game.progressFill.style.width       = `${pct}%`;
  DOM.game.progressFill.closest("[role='progressbar']")
    ?.setAttribute("aria-valuenow", pct);
}


/**
 * Calculate session stats, pick appropriate copy, and display the results screen.
 */
function showResults() {
  const totalAttempts = state.correct + state.wrong;
  const accuracy      = totalAttempts > 0
    ? Math.round((state.correct / totalAttempts) * 100)
    : 0;

  // ── Pick emoji + headline based on accuracy ────────────────────────
  let emoji, title, sub;

  if (accuracy === 100) {
    emoji = "🏆"; title = "Perfect Score!";    sub  = "Absolutely flawless — you're a coding wizard!";
  } else if (accuracy >= 80) {
    emoji = "🎉"; title = "Excellent Work!";   sub  = "You really know your stuff. Keep it up!";
  } else if (accuracy >= 60) {
    emoji = "👍"; title = "Good Job!";         sub  = "Solid effort! A little more practice and you'll ace it.";
  } else if (accuracy >= 40) {
    emoji = "📚"; title = "Keep Studying!";    sub  = "You're getting there. Flip through the deck again!";
  } else {
    emoji = "💪"; title = "Keep Going!";       sub  = "Practice makes perfect — every attempt teaches you something.";
  }

  // ── Populate the results screen ────────────────────────────────────
  DOM.results.emoji.textContent   = emoji;
  DOM.results.title.textContent   = title;
  DOM.results.sub.textContent     = sub;
  DOM.results.pct.textContent     = `${accuracy}%`;
  DOM.results.correct.textContent = state.correct;
  DOM.results.wrong.textContent   = state.wrong;

  // Fill progress to 100% to mark the round as complete
  DOM.game.progressFill.style.width = "100%";

  showScreen("results");
}


/* =============================================================================
  11. EVENT LISTENERS
  ─────────────────────────────────────────────────────────────────────────────
  All event bindings are grouped here, making it easy to see every interaction
  point without hunting through the code.
============================================================================= */

// ── Auth screen buttons ───────────────────────────────────────────────────
DOM.signup.btn.addEventListener("click", handleSignup);
DOM.login.btn.addEventListener("click",  handleLogin);

// ── Screen-toggle links (sign-up ↔ login) ─────────────────────────────────
// Using event delegation on the whole document so we only need one listener
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if (btn) showScreen(btn.dataset.goto);
});

// ── Welcome screen ────────────────────────────────────────────────────────
DOM.welcome.btnStart.addEventListener("click",  startQuiz);
DOM.welcome.btnLogout.addEventListener("click", handleLogout);

// ── Game screen — flip card (click & keyboard) ────────────────────────────
DOM.game.cardScene.addEventListener("click", flipCard);
DOM.game.cardScene.addEventListener("keydown", (e) => {
  // Allow spacebar or Enter to flip the card for keyboard users
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    flipCard();
  }
});

// ── Game screen — submit & next ───────────────────────────────────────────
DOM.game.btnSubmit.addEventListener("click", submitAnswer);
DOM.game.btnNext.addEventListener("click",   nextCard);

// Allow Enter key in the answer input to submit
DOM.game.userAnswer.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});

// ── Results screen ────────────────────────────────────────────────────────
DOM.results.btnReplay.addEventListener("click",  startQuiz);
DOM.results.btnHome.addEventListener("click",    () => showScreen("welcome"));
DOM.results.btnLogout.addEventListener("click",  handleLogout);

// ── Global Enter key for auth screens ────────────────────────────────────
// Pressing Enter on either auth screen triggers the corresponding handler
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  // Find which screen is currently active
  if (DOM.screens.signup.classList.contains("screen--active")) handleSignup();
  if (DOM.screens.login.classList.contains("screen--active"))  handleLogin();
});


/* =============================================================================
  12. APP INITIALISER
  ─────────────────────────────────────────────────────────────────────────────
  Called once when the DOM is ready. Decides which screen to show first
  based on whether a session was saved (future feature) or just shows sign-up.
============================================================================= */
function init() {
  /*
   * For now, always start at sign-up.
   * Future enhancement: check localStorage for a saved session token
   * and auto-navigate to the welcome screen if one exists.
   */
  showScreen("signup");
  console.info("[CodeFlip] App initialised. Version 1.0.0");
}

// Run init() after the DOM is fully parsed
document.addEventListener("DOMContentLoaded", init);