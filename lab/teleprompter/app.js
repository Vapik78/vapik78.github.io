(() => {
  "use strict";

  const LS_SETTINGS = "teleprompter.settings";

  const defaultSettings = {
    wpm: 140,
    fontSize: 56,
    width: 70,
    lineHeight: 1.4,
    align: "center",
    theme: "dark",
    countdown: 3,
    guide: true,
    guidePos: 40,
    mirror: false,
    flipV: false,
    camera: false,
    fullscreen: true
  };

  const state = {
    settings: { ...defaultSettings },
    playing: false,
    speedPxPerSec: 0,
    rafId: null,
    lastFrameTime: 0,
    cameraStream: null,
    idleTimer: null
  };

  // ---------- persistence ----------
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_SETTINGS));
      if (saved) state.settings = { ...defaultSettings, ...saved };
    } catch { /* keep defaults */ }
  }
  function saveSettings() {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings));
  }

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);

  const editorView = $("editorView");
  const prompterView = $("prompterView");
  const scriptTitle = $("scriptTitle");
  const scriptText = $("scriptText");
  const wordCountEl = $("wordCount");
  const estTimeEl = $("estTime");
  const startBtn = $("startBtn");

  const wpmRange = $("wpmRange"), wpmLabel = $("wpmLabel");
  const fontRange = $("fontRange"), fontLabel = $("fontLabel");
  const widthRange = $("widthRange"), widthLabel = $("widthLabel");
  const lineHeightRange = $("lineHeightRange"), lineHeightLabel = $("lineHeightLabel");
  const alignSelect = $("alignSelect");
  const themeSelect = $("themeSelect");
  const countdownSelect = $("countdownSelect");
  const guideToggle = $("guideToggle");
  const guidePosField = $("guidePosField");
  const guidePosRange = $("guidePosRange"), guidePosLabel = $("guidePosLabel");
  const mirrorToggle = $("mirrorToggle");
  const flipVToggle = $("flipVToggle");
  const cameraToggle = $("cameraToggle");
  const fullscreenToggle = $("fullscreenToggle");

  const stage = $("stage");
  const camFeed = $("camFeed");
  const camError = $("camError");
  const guideLine = $("guideLine");
  const scrollContainer = $("scrollContainer");
  const scrollContent = $("scrollContent");
  const countdownOverlay = $("countdownOverlay");
  const countdownNum = $("countdownNum");
  const countdownCancel = $("countdownCancel");
  const prompterChrome = document.querySelector(".prompter-chrome");
  const exitBtn = $("exitBtn");
  const progressBar = $("progressBar");
  const elapsedTimeEl = $("elapsedTime");
  const remainingTimeEl = $("remainingTime");
  const playPauseBtn = $("playPauseBtn");
  const resetBtn = $("resetBtn");
  const speedVal = $("speedVal");
  const fontVal = $("fontVal");
  const mirrorBtn = $("mirrorBtn");
  const camBtn = $("camBtn");
  const fullscreenBtn = $("fullscreenBtn");

  const helpBtn = $("helpBtn");
  const helpModal = $("helpModal");
  const helpCloseBtn = $("helpCloseBtn");

  // ---------- helpers ----------
  function wordCount(text) {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }
  function formatTime(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function updateStats() {
    const words = wordCount(scriptText.value);
    wordCountEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
    const secs = (words / state.settings.wpm) * 60;
    estTimeEl.textContent = `${formatTime(secs)} at ${state.settings.wpm} wpm`;
  }

  // ---------- settings wiring ----------
  function syncSettingsUI() {
    const s = state.settings;
    wpmRange.value = s.wpm; wpmLabel.textContent = `${s.wpm} wpm`;
    fontRange.value = s.fontSize; fontLabel.textContent = `${s.fontSize}px`;
    widthRange.value = s.width; widthLabel.textContent = `${s.width}%`;
    lineHeightRange.value = s.lineHeight; lineHeightLabel.textContent = s.lineHeight.toFixed(1);
    alignSelect.value = s.align;
    themeSelect.value = s.theme;
    countdownSelect.value = String(s.countdown);
    guideToggle.checked = s.guide;
    guidePosRange.value = s.guidePos; guidePosLabel.textContent = `${s.guidePos}%`;
    guidePosField.classList.toggle("hidden", !s.guide);
    mirrorToggle.checked = s.mirror;
    flipVToggle.checked = s.flipV;
    cameraToggle.checked = s.camera;
    fullscreenToggle.checked = s.fullscreen;

    speedVal.textContent = `${s.wpm} wpm`;
    fontVal.textContent = `${s.fontSize}px`;
    mirrorBtn.classList.toggle("active", s.mirror);
    camBtn.classList.toggle("active", s.camera);
  }

  function applyPrompterStyles() {
    const s = state.settings;
    scrollContent.style.fontSize = s.fontSize + "px";
    scrollContent.style.lineHeight = s.lineHeight;
    scrollContent.style.maxWidth = s.width + "%";
    prompterView.classList.remove("theme-dark", "theme-light", "theme-yellow");
    prompterView.classList.add("theme-" + s.theme);
    prompterView.classList.remove("text-align-left", "text-align-center");
    prompterView.classList.add("text-align-" + s.align);
    guideLine.classList.toggle("hidden", !s.guide);
    guideLine.style.top = s.guidePos + "%";
    stage.style.transform = `scaleX(${s.mirror ? -1 : 1}) scaleY(${s.flipV ? -1 : 1})`;
    camFeed.classList.toggle("hidden", !s.camera || !state.cameraStream);

    const h = scrollContainer.clientHeight || window.innerHeight;
    scrollContent.style.paddingTop = s.guide ? (h * s.guidePos) / 100 + "px" : h * 0.4 + "px";
    scrollContent.style.paddingBottom = h + "px";
  }

  function recomputeSpeed() {
    const words = Math.max(wordCount(scriptText.value), 1);
    const scrollable = Math.max(scrollContent.scrollHeight - scrollContainer.clientHeight, 0);
    const duration = (words / state.settings.wpm) * 60;
    state.speedPxPerSec = duration > 0 ? scrollable / duration : 0;
    updateProgressUI();
  }

  function updateProgressUI() {
    const scrollable = Math.max(scrollContent.scrollHeight - scrollContainer.clientHeight, 0);
    const pos = scrollContainer.scrollTop;
    const pct = scrollable > 0 ? Math.min((pos / scrollable) * 100, 100) : 0;
    progressBar.style.width = pct + "%";
    const speed = state.speedPxPerSec || 1;
    elapsedTimeEl.textContent = formatTime(pos / speed);
    remainingTimeEl.textContent = formatTime(Math.max(scrollable - pos, 0) / speed);
  }

  // ---------- prompter playback ----------
  function tick(ts) {
    if (!state.playing) return;
    if (!state.lastFrameTime) state.lastFrameTime = ts;
    const dt = (ts - state.lastFrameTime) / 1000;
    state.lastFrameTime = ts;

    const scrollable = scrollContent.scrollHeight - scrollContainer.clientHeight;
    scrollContainer.scrollTop += state.speedPxPerSec * dt;
    updateProgressUI();

    if (scrollContainer.scrollTop >= scrollable) {
      pausePlayback();
      return;
    }
    state.rafId = requestAnimationFrame(tick);
  }

  function startPlayback() {
    state.playing = true;
    state.lastFrameTime = 0;
    playPauseBtn.textContent = "❚❚";
    state.rafId = requestAnimationFrame(tick);
    scheduleIdle();
  }
  function pausePlayback() {
    state.playing = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    playPauseBtn.textContent = "▶";
    showChrome();
  }
  function togglePlay() {
    if (state.playing) pausePlayback(); else startPlayback();
  }
  function resetScroll() {
    scrollContainer.scrollTop = 0;
    updateProgressUI();
  }

  // ---------- camera ----------
  async function enableCamera() {
    if (state.cameraStream) return;
    try {
      state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camFeed.srcObject = state.cameraStream;
      camError.classList.add("hidden");
      camFeed.classList.remove("hidden");
    } catch (err) {
      state.settings.camera = false;
      syncSettingsUI();
      camError.classList.remove("hidden");
      setTimeout(() => camError.classList.add("hidden"), 3000);
    }
  }
  function disableCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((t) => t.stop());
      state.cameraStream = null;
    }
    camFeed.classList.add("hidden");
  }
  function toggleCamera() {
    state.settings.camera = !state.settings.camera;
    saveSettings();
    syncSettingsUI();
    if (state.settings.camera) enableCamera(); else disableCamera();
  }

  // ---------- fullscreen ----------
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      prompterView.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ---------- chrome auto-hide ----------
  function showChrome() {
    prompterChrome.classList.remove("idle");
    clearTimeout(state.idleTimer);
    if (state.playing) scheduleIdle();
  }
  function scheduleIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      if (state.playing) prompterChrome.classList.add("idle");
    }, 2800);
  }

  // ---------- enter / exit prompter ----------
  function startPrompter() {
    scrollContent.textContent = scriptText.value;
    applyPrompterStyles();
    editorView.classList.add("hidden");
    prompterView.classList.remove("hidden");
    requestAnimationFrame(() => {
      resetScroll();
      recomputeSpeed();
      applyPrompterStyles();
      recomputeSpeed();
    });

    if (state.settings.fullscreen) {
      prompterView.requestFullscreen().catch(() => {});
    }
    if (state.settings.camera) enableCamera();

    const cd = Number(state.settings.countdown);
    if (cd > 0) runCountdown(cd, startPlayback);
    else startPlayback();

    showChrome();
  }

  function runCountdown(seconds, onDone) {
    let n = seconds;
    countdownNum.textContent = n;
    countdownOverlay.classList.remove("hidden");
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        countdownOverlay.classList.add("hidden");
        onDone();
      } else {
        countdownNum.textContent = n;
      }
    }, 1000);
    countdownCancel.onclick = () => {
      clearInterval(iv);
      countdownOverlay.classList.add("hidden");
      exitPrompter();
    };
  }

  function exitPrompter() {
    pausePlayback();
    disableCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    prompterView.classList.add("hidden");
    editorView.classList.remove("hidden");
    prompterChrome.classList.remove("idle");
  }

  // ---------- adjustments ----------
  function adjustWpm(delta) {
    state.settings.wpm = Math.max(60, Math.min(300, state.settings.wpm + delta));
    saveSettings();
    syncSettingsUI();
    updateStats();
    recomputeSpeed();
  }
  function adjustFont(delta) {
    state.settings.fontSize = Math.max(24, Math.min(120, state.settings.fontSize + delta));
    saveSettings();
    syncSettingsUI();
    applyPrompterStyles();
    recomputeSpeed();
  }
  function toggleMirror() {
    state.settings.mirror = !state.settings.mirror;
    saveSettings(); syncSettingsUI(); applyPrompterStyles();
  }
  function toggleFlipV() {
    state.settings.flipV = !state.settings.flipV;
    saveSettings(); syncSettingsUI(); applyPrompterStyles();
  }

  // ---------- events: editor ----------
  scriptText.addEventListener("input", updateStats);
  startBtn.addEventListener("click", startPrompter);

  wpmRange.addEventListener("input", () => {
    state.settings.wpm = Number(wpmRange.value);
    saveSettings(); syncSettingsUI(); updateStats();
  });
  fontRange.addEventListener("input", () => {
    state.settings.fontSize = Number(fontRange.value);
    saveSettings(); syncSettingsUI();
  });
  widthRange.addEventListener("input", () => {
    state.settings.width = Number(widthRange.value);
    saveSettings(); syncSettingsUI();
  });
  lineHeightRange.addEventListener("input", () => {
    state.settings.lineHeight = Number(lineHeightRange.value);
    saveSettings(); syncSettingsUI();
  });
  alignSelect.addEventListener("change", () => {
    state.settings.align = alignSelect.value;
    saveSettings();
  });
  themeSelect.addEventListener("change", () => {
    state.settings.theme = themeSelect.value;
    saveSettings();
  });
  countdownSelect.addEventListener("change", () => {
    state.settings.countdown = Number(countdownSelect.value);
    saveSettings();
  });
  guideToggle.addEventListener("change", () => {
    state.settings.guide = guideToggle.checked;
    saveSettings(); syncSettingsUI();
  });
  guidePosRange.addEventListener("input", () => {
    state.settings.guidePos = Number(guidePosRange.value);
    saveSettings(); syncSettingsUI();
  });
  mirrorToggle.addEventListener("change", () => {
    state.settings.mirror = mirrorToggle.checked;
    saveSettings(); syncSettingsUI();
  });
  flipVToggle.addEventListener("change", () => {
    state.settings.flipV = flipVToggle.checked;
    saveSettings(); syncSettingsUI();
  });
  cameraToggle.addEventListener("change", () => {
    state.settings.camera = cameraToggle.checked;
    saveSettings(); syncSettingsUI();
  });
  fullscreenToggle.addEventListener("change", () => {
    state.settings.fullscreen = fullscreenToggle.checked;
    saveSettings();
  });

  // ---------- events: prompter ----------
  exitBtn.addEventListener("click", exitPrompter);
  playPauseBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", resetScroll);
  mirrorBtn.addEventListener("click", toggleMirror);
  camBtn.addEventListener("click", toggleCamera);
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.querySelectorAll("[data-adjust]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir);
      if (btn.dataset.adjust === "speed") adjustWpm(dir * 10);
      else adjustFont(dir * 2);
    });
  });

  ["mousemove", "pointerdown", "touchstart"].forEach((evt) => {
    prompterView.addEventListener(evt, showChrome);
  });
  scrollContainer.addEventListener("wheel", () => { if (state.playing) pausePlayback(); }, { passive: true });
  scrollContainer.addEventListener("touchmove", () => { if (state.playing) pausePlayback(); }, { passive: true });
  scrollContainer.addEventListener("scroll", updateProgressUI);

  window.addEventListener("resize", () => {
    if (!prompterView.classList.contains("hidden")) {
      applyPrompterStyles();
      recomputeSpeed();
    }
  });

  // ---------- help modal ----------
  function toggleHelp() { helpModal.classList.toggle("hidden"); }
  helpBtn.addEventListener("click", toggleHelp);
  helpCloseBtn.addEventListener("click", toggleHelp);
  helpModal.addEventListener("click", (e) => { if (e.target === helpModal) toggleHelp(); });

  // ---------- keyboard shortcuts ----------
  document.addEventListener("keydown", (e) => {
    if (e.target === scriptText || e.target === scriptTitle) return;

    if (e.key === "?" ) { toggleHelp(); return; }

    if (prompterView.classList.contains("hidden")) return; // rest only apply in prompter

    switch (e.key) {
      case " ":
        e.preventDefault(); togglePlay(); showChrome(); break;
      case "ArrowUp": e.preventDefault(); adjustWpm(10); break;
      case "ArrowDown": e.preventDefault(); adjustWpm(-10); break;
      case "ArrowLeft": e.preventDefault(); adjustFont(-2); break;
      case "ArrowRight": e.preventDefault(); adjustFont(2); break;
      case "r": case "R": resetScroll(); break;
      case "m": case "M": toggleMirror(); break;
      case "v": case "V": toggleFlipV(); break;
      case "c": case "C": toggleCamera(); break;
      case "f": case "F": toggleFullscreen(); break;
      case "Escape": exitPrompter(); break;
    }
  });

  // ---------- init ----------
  function init() {
    loadSettings();
    syncSettingsUI();
    updateStats();
  }
  init();
})();
