/* site.js: the pager prompt, less-style keys, the help screen, theme switching
   and the name's decrypt effect. The page is complete without any of this. */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const touchOnly = matchMedia("(hover: none)");
  const systemDark = matchMedia("(prefers-color-scheme: dark)");

  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
    },
  };

  const prompt = $("#prompt");
  const promptText = $("#prompt-text");
  const announce = $("#announce");
  const help = $("#help");
  const pageName = prompt?.dataset.page || "gureet(8)";
  const handle = prompt?.dataset.handle || "gureet";

  // Controls that only work with JavaScript start out hidden in the HTML.
  $$("[data-theme-toggle]").forEach((el) => { el.hidden = false; });
  if (prompt) prompt.hidden = false;

  /* ── Theme ─────────────────────────────────────────────── */
  const themeButtons = $$("[data-theme-toggle]");
  const currentTheme = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

  function paintThemeButtons() {
    const now = currentTheme();
    const next = now === "dark" ? "light" : "dark";
    themeButtons.forEach((btn) => {
      btn.textContent = `theme: ${now}`;
      btn.setAttribute("aria-label", `Switch to ${next} theme`);
    });
  }

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("theme", next);
  }

  const themeChanged = () => {
    paintThemeButtons();
    window.dispatchEvent(new CustomEvent("themechange"));
  };

  themeButtons.forEach((btn) => btn.addEventListener("click", toggleTheme));
  systemDark.addEventListener("change", themeChanged);
  // Also catches a theme stamped on <html> by whatever hosts the page.
  new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  paintThemeButtons();

  /* ── Pager prompt: "Manual page gureet(8) line 12/240" ─ */
  let message = "";
  let messageUntil = 0;

  const lineHeight = () => parseFloat(getComputedStyle(document.body).lineHeight) || 28;

  function renderPrompt() {
    if (!prompt || !promptText) return;
    if (performance.now() < messageUntil) {
      promptText.textContent = message;
      return;
    }
    const lh = lineHeight();
    const docHeight = root.scrollHeight;
    const y = window.scrollY;
    const line = Math.floor(y / lh) + 1;
    const total = Math.max(line, Math.ceil(docHeight / lh));
    const atEnd = y > 0 && y + window.innerHeight >= docHeight - 4;
    const touch = touchOnly.matches;

    if (atEnd) {
      promptText.textContent = touch ? "(END) · tap for help" : "(END)";
    } else if (touch) {
      promptText.textContent = `${pageName} line ${line}/${total} · tap for help`;
    } else {
      promptText.textContent = `Manual page ${pageName} line ${line}/${total} (press h for help or q to quit)`;
    }
  }

  let scheduled = false;
  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      renderPrompt();
    });
  }, { passive: true });
  window.addEventListener("resize", renderPrompt);
  renderPrompt();

  // less prints its messages in the prompt line, so this page does too.
  function say(text, ms = 3800) {
    message = text;
    messageUntil = performance.now() + ms;
    renderPrompt();
    if (announce) announce.textContent = text;
    setTimeout(renderPrompt, ms + 30);
  }

  /* ── Help screen ───────────────────────────────────────── */
  function openHelp() {
    if (help && !help.open && typeof help.showModal === "function") help.showModal();
  }
  const closeHelp = () => help?.open && help.close();

  prompt?.addEventListener("click", openHelp);
  help?.addEventListener("click", (e) => {
    if (e.target === help) closeHelp(); // a click on the backdrop
  });
  $$("[data-close]", help || document).forEach((btn) => btn.addEventListener("click", closeHelp));
  $$(".help-toc a", help || document).forEach((a) => a.addEventListener("click", closeHelp));

  /* ── Keys ──────────────────────────────────────────────── */
  const keysBox = $("#opt-keys");
  let keysOn = store.get("keys") !== "off";
  if (keysBox) {
    keysBox.checked = keysOn;
    keysBox.addEventListener("change", () => {
      keysOn = keysBox.checked;
      store.set("keys", keysOn ? "on" : "off");
    });
  }

  const sections = $$("main .sh");
  const smooth = () => (reduceMotion.matches ? "auto" : "smooth");

  function jumpSection(dir) {
    const y = window.scrollY;
    const tops = sections.map((s) => s.getBoundingClientRect().top + y - 20);
    const target = dir > 0
      ? tops.find((t) => t > y + 4)
      : tops.slice().reverse().find((t) => t < y - 4);
    if (target !== undefined) window.scrollTo({ top: Math.max(0, target), behavior: smooth() });
  }

  const quitLines = [
    "can't quit a website. closing the tab works, though",
    "still here. try ctrl+w",
    "q is decorative on the web. h is not",
  ];
  let quits = 0;
  let typed = "";

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

    if (help?.open) {
      if (e.key === "q" || e.key === "h" || e.key === "?") {
        e.preventDefault();
        closeHelp();
      }
      return;
    }
    if (!keysOn) return;

    if (e.key.length === 1) typed = (typed + e.key).slice(-4);
    if (typed === "sudo") {
      typed = "";
      say(`${handle} is not in the sudoers file. This incident will be reported.`);
      return;
    }

    const lh = lineHeight();
    const win = window.innerHeight;
    const scroll = (dy) => {
      e.preventDefault();
      window.scrollBy({ top: dy, behavior: "auto" });
    };

    switch (e.key) {
      case "j": case "e": scroll(lh); break;
      case "k": case "y": scroll(-lh); break;
      case "f": scroll(win * 0.9); break;
      case "b": scroll(-win * 0.9); break;
      case "d": scroll(win / 2); break;
      case "u": scroll(-win / 2); break;
      case "g": case "<":
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: smooth() });
        break;
      case "G": case ">":
        e.preventDefault();
        window.scrollTo({ top: root.scrollHeight, behavior: smooth() });
        break;
      case "n": e.preventDefault(); jumpSection(1); break;
      case "N": case "p": e.preventDefault(); jumpSection(-1); break;
      case "h": case "?": e.preventDefault(); openHelp(); break;
      case "q": case "Q":
        e.preventDefault();
        say(quitLines[Math.min(quits++, quitLines.length - 1)]);
        break;
      case "t": e.preventDefault(); toggleTheme(); break;
      default: break;
    }
  });

  /* ── The name decrypts itself ──────────────────────────── */
  const HEX = "0123456789abcdef";
  const nameEl = $("[data-scramble]");

  function decrypt(el) {
    if (!el || reduceMotion.matches || el.dataset.busy) return;
    const plain = el.dataset.text || el.textContent;
    el.dataset.text = plain;
    el.dataset.busy = "1";
    const start = performance.now();
    const step = 45;   // ms between letters
    const hold = 230;  // ms each letter stays encrypted

    const frame = (now) => {
      const t = now - start;
      let out = "";
      let done = true;
      for (let i = 0; i < plain.length; i++) {
        const ch = plain[i];
        const from = i * step;
        if (ch === " " || t < from || t >= from + hold) {
          out += ch;
          if (t < from + hold && ch !== " ") done = false;
        } else {
          out += HEX[(Math.random() * 16) | 0];
          done = false;
        }
      }
      el.textContent = out;
      if (done) {
        el.textContent = plain;
        delete el.dataset.busy;
      } else {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }

  if (nameEl) {
    setTimeout(() => decrypt(nameEl), 650);
    nameEl.closest("h1")?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") decrypt(nameEl);
    });
  }
})();
