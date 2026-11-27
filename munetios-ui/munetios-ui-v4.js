/*!
 * Munetios UI v4 behavior
 * - MunetiosUI.theme.set('light' | 'dark' | 'system')
 * - <select class="mu-select"> becomes a liquid-glass dropdown (native select stays the source of truth)
 * - [data-mu-open="modalId"] opens a .mu-modal (again = duplicate in place); [data-mu-close] or Escape closes it;
 *   clicks pass through modals, outside clicks don't close them, danger actions are locked while one is open
 * - MunetiosUI.toast(message, { type, icon, duration }) at top center, newest on top;
 *   a close button appears only when duration is longer than the 2600ms default
 * - .mu-segmented buttons and .mu-chip toggles manage aria-pressed
 * - .mu-tabs buttons manage aria-selected and show [data-mu-panel]
 * - [data-mu-resizable] sidebars get a drag / keyboard resize handle; the width is remembered per key
 * No tracking, no network requests.
 */
(function () {
  "use strict";
  if (window.MunetiosUI) return;
  const root = document.documentElement;
  const THEME_KEY = "munetios-ui-theme";

  // ------------------------------------------------------------- theme
  const media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;
  function resolve(pref) {
    return pref === "light" || pref === "dark"
      ? pref
      : media && media.matches
        ? "light"
        : "dark";
  }
  const theme = {
    get() {
      try {
        return localStorage.getItem(THEME_KEY) || "system";
      } catch (e) {
        return "system";
      }
    },
    set(pref) {
      try {
        localStorage.setItem(THEME_KEY, pref);
      } catch (e) {}
      root.setAttribute("data-mu-theme", resolve(pref));
      document.dispatchEvent(
        new CustomEvent("mu-theme", {
          detail: { preference: pref, theme: resolve(pref) },
        }),
      );
    },
  };
  root.setAttribute("data-mu-theme", resolve(theme.get()));
  if (media && media.addEventListener)
    media.addEventListener("change", () => {
      if (theme.get() === "system") theme.set("system");
    });

  // ------------------------------------------------------------- select
  let openSelect = null;
  const label = (o) => (o ? (o.label || o.textContent || "").trim() : "");
  function sync(select) {
    const s = select._mu;
    if (!s) return;
    s.label.textContent = label(select.options[select.selectedIndex]) || " ";
    const ariaLabel = select.getAttribute("aria-label");
    if (ariaLabel) s.button.setAttribute("aria-label", ariaLabel);
  }
  function closeSelect(focus) {
    if (!openSelect) return;
    openSelect.menu.remove();
    openSelect.button.classList.remove("is-open");
    openSelect.button.setAttribute("aria-expanded", "false");
    if (focus) openSelect.button.focus();
    openSelect = null;
  }
  function openMenu(select) {
    const s = select._mu;
    if (openSelect && openSelect.select === select) {
      closeSelect(true);
      return;
    }
    closeSelect(false);
    const menu = document.createElement("div");
    menu.className = "mu-menu mu-menu-floating mu-scroll";
    menu.setAttribute("role", "listbox");
    Array.from(select.options).forEach((opt, i) => {
      if (opt.hidden) return;
      const item = document.createElement("div");
      item.className =
        "mu-menu-item" + (i === select.selectedIndex ? " is-selected" : "");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(i === select.selectedIndex));
      item.dataset.index = i;
      const text = document.createElement("span");
      text.textContent = label(opt);
      item.appendChild(text);
      if (i === select.selectedIndex) {
        const c = document.createElement("span");
        c.className = "mu-icon mu-menu-check";
        c.setAttribute("aria-hidden", "true");
        c.textContent = "check";
        item.appendChild(c);
      }
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    const r = s.button.getBoundingClientRect();
    menu.style.minWidth = r.width + "px";
    const below = window.innerHeight - r.bottom - 20;
    const up = menu.offsetHeight > below && r.top > below;
    menu.style.left =
      Math.min(r.left, window.innerWidth - menu.offsetWidth - 12) + "px";
    menu.style.top = (up ? r.top - menu.offsetHeight - 8 : r.bottom + 8) + "px";
    s.button.classList.add("is-open");
    s.button.setAttribute("aria-expanded", "true");
    const items = Array.from(menu.querySelectorAll(".mu-menu-item"));
    let active = Math.max(
      0,
      items.findIndex((i) => i.classList.contains("is-selected")),
    );
    const setActive = (n) => {
      active = Math.max(0, Math.min(items.length - 1, n));
      items.forEach((it, k) => it.classList.toggle("is-active", k === active));
      items[active].scrollIntoView({ block: "nearest" });
    };
    setActive(active);
    const choose = (n) => {
      const idx = Number(items[n].dataset.index);
      const changed = idx !== select.selectedIndex;
      select.selectedIndex = idx;
      sync(select);
      closeSelect(true);
      if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    menu.addEventListener("mousedown", (e) => e.preventDefault());
    menu.addEventListener("click", (e) => {
      const it = e.target.closest(".mu-menu-item");
      if (it) choose(items.indexOf(it));
    });
    openSelect = {
      select,
      menu,
      button: s.button,
      setActive,
      choose,
      get active() {
        return active;
      },
    };
  }
  function enhanceSelect(select) {
    if (select._mu || select.multiple) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mu-select-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const text = document.createElement("span");
    text.className = "mu-select-label";
    const chev = document.createElement("span");
    chev.className = "mu-icon";
    chev.setAttribute("aria-hidden", "true");
    chev.textContent = "expand_more";
    button.append(text, chev);
    const field = select.labels?.[0];
    const lbl = field?.querySelector('.mu-field-label') || field;
    if (select.getAttribute("aria-label"))
      button.setAttribute("aria-label", select.getAttribute("aria-label"));
    else if (lbl) {
      lbl.id = lbl.id || "mu-l-" + Math.random().toString(36).slice(2, 8);
      button.setAttribute("aria-labelledby", lbl.id);
    }
    select.classList.add("mu-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.after(button);
    select._mu = { button, label: text };
    button.addEventListener("click", () => openMenu(select));
    button.addEventListener("keydown", (e) => {
      const isOpen = openSelect && openSelect.select === select;
      if (!isOpen && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu(select);
        return;
      }
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        openSelect.setActive(openSelect.active + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        openSelect.setActive(openSelect.active - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSelect.choose(openSelect.active);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeSelect(true);
      } else if (e.key === "Tab") closeSelect(false);
    });
    select.addEventListener("change", () => sync(select));
    sync(select);
  }
  document.addEventListener("mousedown", (e) => {
    if (
      openSelect &&
      !openSelect.menu.contains(e.target) &&
      !openSelect.button.contains(e.target)
    )
      closeSelect(false);
  });
  window.addEventListener("resize", () => closeSelect(false));
  // A fixed menu can't follow its button when the page or a dialog scrolls, so close it.
  document.addEventListener("scroll", (e) => {
    if (openSelect && !(e.target instanceof Node && openSelect.menu.contains(e.target))) closeSelect(false);
  }, true);

  // ------------------------------------------------------------- modal
  // Modals are non-blocking: clicks pass through to the page, clicking
  // outside never closes them, and opening one that's already open stacks an
  // exact duplicate in the same position. Danger actions outside an open
  // modal are locked until every modal is closed.
  const focusStack = [];
  let lastOpen = { id: "", time: 0 };
  const focusFirst = (modal) => {
    const el =
      modal.querySelector(
        'input, select, textarea, button:not([data-mu-close]), [tabindex]:not([tabindex="-1"])',
      ) || modal.querySelector("button");
    if (el) el.focus();
  };
  function duplicateModal(original) {
    const clone = original.cloneNode(true);
    const suffix = "-dup" + Math.random().toString(36).slice(2, 7);
    clone.removeAttribute("id");
    clone.classList.add("is-duplicate");
    clone.dataset.muDuplicateOf = original.id;
    // Keep ids unique inside the copy and point labels at the new ids.
    clone.querySelectorAll("[id]").forEach((el) => {
      el.id = el.id + suffix;
    });
    clone
      .querySelectorAll("[aria-labelledby],[aria-describedby],[for]")
      .forEach((el) => {
        ["aria-labelledby", "aria-describedby", "for"].forEach((attr) => {
          if (el.hasAttribute(attr))
            el.setAttribute(
              attr,
              el
                .getAttribute(attr)
                .split(" ")
                .map((v) => v + suffix)
                .join(" "),
            );
        });
      });
    clone.querySelectorAll(".mu-select-button").forEach((b) => b.remove());
    clone.querySelectorAll("select").forEach((sel) => {
      sel._mu = null;
      sel.classList.remove("mu-select-native");
      sel.removeAttribute("aria-hidden");
      sel.removeAttribute("tabindex");
    });
    clone.querySelectorAll(".mu-ripple-layer").forEach((r) => r.remove());
    clone.hidden = false;
    document.body.appendChild(clone);
    scan(clone);
    return clone;
  }
  const DANGER_SELECTOR =
    ".mu-danger-zone, .mu-btn-danger, .mu-btn-danger-outline, .mu-btn-warning-outline, .mu-action-card.is-danger, .mu-menu-item.is-danger, [data-mu-danger]";
  const anyModalOpen = () =>
    !!document.querySelector('.mu-modal:not([hidden]), .mu-dialog-layer[data-mu-dialog-open="true"]');
  function syncModalLock() {
    const open = anyModalOpen();
    root.classList.toggle("mu-modal-open", open);
    // Keyboard users can't reach locked danger actions either.
    document.querySelectorAll(DANGER_SELECTOR).forEach((el) => {
      if (open && !el.closest(".mu-modal, .mu-dialog-layer")) {
        if (!el.hasAttribute("inert")) {
          el.setAttribute("inert", "");
          el.dataset.muLocked = "true";
        }
      } else if (el.dataset.muLocked === "true") {
        el.removeAttribute("inert");
        delete el.dataset.muLocked;
      }
    });
  }
  // Belt and braces: block danger actions behind an open modal.
  document.addEventListener(
    "click",
    (e) => {
      if (!anyModalOpen() || !e.target.closest) return;
      const danger = e.target.closest(DANGER_SELECTOR);
      if (danger && !danger.closest(".mu-modal, .mu-dialog-layer")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  const dialogLayers = new WeakMap();
  function enhanceDialogLayer(layer) {
    if (!layer || dialogLayers.has(layer)) return;
    layer.classList.add('mu-dialog-layer');
    const update = () => {
      const styles = getComputedStyle(layer);
      const open = layer.isConnected && !layer.hidden && styles.display !== 'none' && styles.visibility !== 'hidden';
      const value = String(open);
      if (layer.dataset.muDialogOpen !== value) layer.dataset.muDialogOpen = value;
      if (layer.getAttribute('aria-modal') !== 'false') layer.setAttribute('aria-modal', 'false');
      syncModalLock();
    };
    const observer = new MutationObserver(update);
    dialogLayers.set(layer, observer);
    observer.observe(layer, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    update();
  }
  function releaseDialogLayers(node) {
    if (!(node instanceof Element) || node.isConnected) return;
    const layers = [...(node.matches('.mu-dialog-layer') ? [node] : []), ...node.querySelectorAll('.mu-dialog-layer')];
    for (const layer of layers) { dialogLayers.get(layer)?.disconnect(); dialogLayers.delete(layer); }
    if (layers.length) syncModalLock();
  }
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    focusStack.push(document.activeElement);
    // Fixed elements inside a glass (backdrop-filter) parent are positioned
    // against that parent, not the screen. Move modals to <body> so every
    // modal and duplicate always sits in the same screen position.
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    let shown = modal;
    if (!modal.hidden) shown = duplicateModal(modal);
    else modal.hidden = false;
    lastOpen = { id, time: Date.now() };
    syncModalLock();
    focusFirst(shown);
    return shown;
  }
  function closeModal(modal) {
    if (!modal) return;
    if (modal.classList.contains("is-duplicate")) modal.remove();
    else modal.hidden = true;
    syncModalLock();
    const back = focusStack.pop();
    if (back && back.focus && back.isConnected) back.focus();
  }

  // ------------------------------------------------------------- ripple
  const RIPPLE_SELECTOR =
    "[data-mu-ripple], .mu-btn, .mu-icon-btn, .mu-capsule-btn, .mu-nav-item, .mu-menu-item, .mu-tile, .mu-option-tile, .mu-action-card, .mu-chip, .mu-toolbar-field, .mu-select-button, .mu-segmented button, .mu-tabs button, .mu-pagination button, .mu-rating button, .mu-tag button, .mu-pick, .mu-row, .mu-palette-item, .mu-notification, .mu-calendar-day, .mu-task";
  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || (reduceMotion && reduceMotion.matches)) return;
      const host = e.target.closest(RIPPLE_SELECTOR);
      if (!host || host.disabled || host.closest("[data-mu-no-ripple]")) return;
      if (getComputedStyle(host).position === "static")
        host.style.position = "relative";
      let layer = host.querySelector(":scope > .mu-ripple-layer");
      if (!layer) {
        layer = document.createElement("span");
        layer.className = "mu-ripple-layer";
        layer.setAttribute("aria-hidden", "true");
        host.prepend(layer);
      }
      const rect = host.getBoundingClientRect();
      const size = Math.hypot(rect.width, rect.height) * 2;
      const dot = document.createElement("span");
      dot.className = "mu-ripple";
      dot.style.width = dot.style.height = size + "px";
      dot.style.left = e.clientX - rect.left - size / 2 + "px";
      dot.style.top = e.clientY - rect.top - size / 2 + "px";
      layer.appendChild(dot);
      const release = () => {
        dot.classList.add("is-out");
        setTimeout(() => dot.remove(), 600);
        document.removeEventListener("pointerup", release);
        document.removeEventListener("pointercancel", release);
      };
      document.addEventListener("pointerup", release);
      document.addEventListener("pointercancel", release);
    },
    { passive: true },
  );

  // ------------------------------------------------------------- custom slider fill
  function paintRange(input) {
    const min = Number(input.min || 0),
      max = Number(input.max || 100),
      val = Number(input.value);
    input.style.setProperty(
      "--mu-fill",
      (max > min ? ((val - min) / (max - min)) * 100 : 0) + "%",
    );
  }
  document.addEventListener("input", (e) => {
    if (
      e.target.matches &&
      e.target.matches('.mu-range, .mu-slider input[type="range"]')
    ) {
      paintRange(e.target);
      const out = e.target
        .closest(".mu-slider")
        ?.querySelector(".mu-slider-value");
      if (out) out.textContent = e.target.value;
    }
  });

  // ------------------------------------------------------------- toast
  const TOAST_DEFAULT_DURATION = 2600;
  function toast(message, options) {
    const opts = options || {};
    let stack = document.querySelector(".mu-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "mu-toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const type = opts.type || "info";
    const icon =
      opts.icon ||
      (type === "success"
        ? "check_circle"
        : type === "error"
          ? "error"
          : type === "warning"
            ? "warning"
            : "info");
    const el = document.createElement("div");
    el.className = "mu-toast is-" + type;
    el.innerHTML =
      '<span class="mu-icon-circle"><span class="mu-icon" aria-hidden="true"></span></span><span class="mu-toast-text"></span><button type="button" class="mu-icon-btn mu-icon-btn-sm" aria-label="Close"><span class="mu-icon" aria-hidden="true">close</span></button>';
    el.querySelector(".mu-icon-circle .mu-icon").textContent = icon;
    el.querySelector(".mu-toast-text").textContent = message;
    const remove = () => el.remove();
    const duration =
      typeof opts.duration === "number"
        ? opts.duration
        : TOAST_DEFAULT_DURATION;
    // Short toasts (the default, errors included) dismiss themselves;
    // only longer-lasting toasts get a close button.
    if (duration <= TOAST_DEFAULT_DURATION) {
      el.querySelector("button").remove();
      el.classList.add("is-short");
    } else el.querySelector("button").addEventListener("click", remove);
    stack.prepend(el); // newest on top
    setTimeout(remove, duration);
    return el;
  }

  // ------------------------------------------------------------- popover
  let openPopover = null;
  function closePopover(focus = false) {
    const state = openPopover;
    if (!state) return;
    openPopover = null;
    state.abort.abort();
    state.observer?.disconnect();
    cancelAnimationFrame(state.frame);
    if (state.native) {
      try {
        state.panel.hidePopover();
      } catch (e) {}
    }
    state.panel.hidden = true;
    state.panel.removeAttribute("data-mu-floating");
    if (state.popover === null) state.panel.removeAttribute("popover");
    else state.panel.setAttribute("popover", state.popover);
    for (const [key, value] of Object.entries(state.styles))
      state.panel.style[key] = value;
    if (state.marker) {
      if (state.marker.isConnected) state.marker.replaceWith(state.panel);
      else state.panel.remove();
    }
    state.button.setAttribute("aria-expanded", "false");
    if (focus && state.button.isConnected)
      state.button.focus({ preventScroll: true });
  }
  function positionPopover() {
    const state = openPopover;
    if (!state) return;
    const { panel, button } = state;
    if (
      !panel.isConnected ||
      !button.isConnected ||
      !button.getClientRects().length
    ) {
      closePopover();
      return;
    }
    const viewport = window.visualViewport;
    const x = viewport?.offsetLeft || 0,
      y = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth,
      height = viewport?.height || innerHeight;
    const rect = button.getBoundingClientRect(),
      edge = 12,
      gap = 10;
    const below = Math.max(0, y + height - edge - rect.bottom - gap);
    const above = Math.max(0, rect.top - y - edge - gap);
    panel.style.maxHeight =
      Math.min(Math.max(0, height - edge * 2), Math.max(below, above)) + "px";
    const up = panel.offsetHeight > below && above > below;
    panel.style.left =
      Math.max(
        x + edge,
        Math.min(rect.left, x + width - panel.offsetWidth - edge),
      ) + "px";
    panel.style.top =
      Math.max(
        y + edge,
        Math.min(
          up ? rect.top - panel.offsetHeight - gap : rect.bottom + gap,
          y + height - panel.offsetHeight - edge,
        ),
      ) + "px";
  }
  function togglePopover(button) {
    const panel = document.getElementById(
      button.getAttribute("data-mu-popover"),
    );
    if (!panel) return;
    const closing = openPopover?.panel === panel;
    closePopover();
    if (closing) return;
    const state = {
      panel,
      button,
      popover: panel.getAttribute("popover"),
      styles: {
        top: panel.style.top,
        left: panel.style.left,
        maxHeight: panel.style.maxHeight,
      },
      abort: new AbortController(),
      frame: 0,
    };
    openPopover = state;
    panel.dataset.muFloating = "";
    panel.hidden = false;
    if (typeof panel.showPopover === "function") {
      panel.setAttribute("popover", "manual");
      try {
        panel.showPopover();
        state.native = true;
      } catch (e) {}
    }
    if (!state.native) {
      panel.removeAttribute("popover");
      state.marker = document.createComment("mu-popover");
      panel.before(state.marker);
      document.body.appendChild(panel);
    }
    button.setAttribute("aria-controls", panel.id);
    button.setAttribute("aria-expanded", "true");
    const schedule = () => {
      cancelAnimationFrame(state.frame);
      state.frame = requestAnimationFrame(positionPopover);
    };
    window.addEventListener("resize", schedule, { signal: state.abort.signal });
    document.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
      signal: state.abort.signal,
    });
    window.visualViewport?.addEventListener("resize", schedule, {
      signal: state.abort.signal,
    });
    window.visualViewport?.addEventListener("scroll", schedule, {
      signal: state.abort.signal,
    });
    if (typeof ResizeObserver === "function") {
      state.observer = new ResizeObserver(schedule);
      state.observer.observe(panel);
      state.observer.observe(button);
    }
    document.fonts?.ready.then(() => {
      if (openPopover === state) schedule();
    });
    positionPopover();
  }
  document.addEventListener(
    "click",
    (event) => {
      if (
        openPopover &&
        !openPopover.panel.contains(event.target) &&
        !openPopover.button.contains(event.target) &&
        !event.target.closest("[data-mu-popover]")
      )
        closePopover();
    },
    true,
  );

  // ------------------------------------------------------------- delegated behavior
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-mu-open]");
    if (opener) {
      openModal(opener.getAttribute("data-mu-open"));
      return;
    }
    const closer = e.target.closest("[data-mu-close]");
    if (closer) {
      closeModal(closer.closest(".mu-modal, .mu-sheet"));
      return;
    }
    const sheetOpener = e.target.closest("[data-mu-sheet]");
    if (sheetOpener) {
      const sh = document.getElementById(
        sheetOpener.getAttribute("data-mu-sheet"),
      );
      if (sh) {
        focusStack.push(sheetOpener);
        sh.hidden = false;
        focusFirst(sh);
      }
      return;
    }
    const step = e.target.closest("[data-mu-step]");
    if (step) {
      const input = step.closest(".mu-stepper")?.querySelector("input");
      if (input) {
        const delta =
          Number(step.getAttribute("data-mu-step")) * (Number(input.step) || 1);
        const next = Math.min(
          Number(input.max || Infinity),
          Math.max(
            Number(input.min || -Infinity),
            (Number(input.value) || 0) + delta,
          ),
        );
        input.value = next;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
    const star = e.target.closest(".mu-rating button");
    if (star) {
      const stars = Array.from(star.parentElement.querySelectorAll("button"));
      const n = stars.indexOf(star) + 1;
      stars.forEach((b, i) => {
        b.classList.toggle("is-on", i < n);
        b.setAttribute("aria-checked", String(i === n - 1));
      });
      star.parentElement.dataset.value = n;
      return;
    }
    const tagRemove = e.target.closest(".mu-tag button");
    if (tagRemove) {
      tagRemove.closest(".mu-tag").remove();
      return;
    }
    const swatch = e.target.closest(".mu-swatch");
    if (swatch) {
      swatch.parentElement
        .querySelectorAll(".mu-swatch")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === swatch)));
      return;
    }
    const page = e.target.closest(".mu-pagination button[data-page]");
    if (page) {
      page.parentElement.querySelectorAll("button[data-page]").forEach((b) => {
        if (b === page) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
      return;
    }
    const day = e.target.closest(".mu-calendar-day");
    if (day) {
      day
        .closest(".mu-calendar-grid")
        .querySelectorAll(".mu-calendar-day")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === day)));
      return;
    }
    const copyBtn = e.target.closest(".mu-copy-field [data-mu-copy]");
    if (copyBtn) {
      const input = copyBtn.closest(".mu-copy-field").querySelector("input");
      const done = (ok) =>
        toast(
          ok
            ? copyBtn.getAttribute("data-mu-copied") || "Copied"
            : "Copy failed",
          { type: ok ? "success" : "error" },
        );
      if (navigator.clipboard)
        navigator.clipboard.writeText(input.value).then(
          () => done(true),
          () => done(false),
        );
      else {
        input.select();
        done(document.execCommand("copy"));
      }
      return;
    }
    const palItem = e.target.closest(".mu-palette-item");
    if (palItem) {
      palItem.parentElement
        .querySelectorAll(".mu-palette-item")
        .forEach((i) => i.setAttribute("aria-selected", String(i === palItem)));
      return;
    }
    const pop = e.target.closest("[data-mu-popover]");
    if (pop) {
      togglePopover(pop);
      return;
    }
    const seg = e.target.closest(".mu-segmented button");
    if (seg) {
      seg.parentElement
        .querySelectorAll("button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === seg)));
      return;
    }
    const chip = e.target.closest(".mu-chip[aria-pressed]");
    if (chip) {
      chip.setAttribute(
        "aria-pressed",
        String(chip.getAttribute("aria-pressed") !== "true"),
      );
      return;
    }
    const tab = e.target.closest(".mu-tabs button");
    if (tab) {
      const tabs = tab.closest(".mu-tabs");
      tabs
        .querySelectorAll("button")
        .forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
      const scope = tabs.parentElement;
      scope.querySelectorAll("[data-mu-panel]").forEach((p) => {
        p.hidden =
          p.getAttribute("data-mu-panel") !== tab.getAttribute("data-mu-tab");
      });
    }
  });
  document.addEventListener("keydown", (e) => {
    const pal = e.target.closest && e.target.closest(".mu-palette");
    if (pal && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      const items = Array.from(pal.querySelectorAll(".mu-palette-item")).filter(
        (i) => !i.hidden,
      );
      if (!items.length) return;
      e.preventDefault();
      let idx = items.findIndex(
        (i) => i.getAttribute("aria-selected") === "true",
      );
      idx = Math.max(
        0,
        Math.min(items.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)),
      );
      items.forEach((i, k) =>
        i.setAttribute("aria-selected", String(k === idx)),
      );
      items[idx].scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key !== "Escape" || openSelect) return;
    if (openPopover) {
      e.preventDefault();
      closePopover(true);
      return;
    }
    const top = Array.from(
      document.querySelectorAll(
        ".mu-modal:not([hidden]), .mu-sheet:not([hidden]), .mu-popover:not([hidden])",
      ),
    ).pop();
    if (!top) return;
    if (top.classList.contains("mu-popover")) top.hidden = true;
    else if (top.classList.contains("mu-sheet")) {
      top.hidden = true;
      const back = focusStack.pop();
      if (back && back.focus) back.focus();
    } else closeModal(top);
  });
  // Dropzone: drag state and file name
  ["dragenter", "dragover"].forEach((type) =>
    document.addEventListener(type, (e) => {
      const z = e.target.closest && e.target.closest(".mu-dropzone");
      if (z) z.classList.add("is-dragover");
    }),
  );
  ["dragleave", "drop"].forEach((type) =>
    document.addEventListener(type, (e) => {
      const z = e.target.closest && e.target.closest(".mu-dropzone");
      if (z) z.classList.remove("is-dragover");
    }),
  );
  document.addEventListener("input", (e) => {
    const search = e.target.closest && e.target.closest(".mu-palette input");
    if (!search) return;
    const q = search.value.trim().toLowerCase();
    search
      .closest(".mu-palette")
      .querySelectorAll(".mu-palette-item")
      .forEach((i) => {
        i.hidden = !!q && !i.textContent.toLowerCase().includes(q);
      });
  });
  document.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.matches?.('.mu-dropzone input[type="file"], .mu-file-input input[type="file"]')) return;
    const label = input.closest(".mu-dropzone, .mu-file-input").querySelector(".mu-dropzone-file, [data-mu-file-name]");
    if (label) label.textContent = Array.from(input.files, file => file.name).join(", ") || label.dataset.empty || "";
  });

  document.addEventListener("click", (e) => {
    const button = e.target.closest?.("[data-mu-file-choose]");
    button?.closest(".mu-file-input")?.querySelector('input[type="file"]')?.click();
  });

  const suggestionFields = new WeakSet();
  function enhanceSuggestionField(field) {
    if (suggestionFields.has(field)) return;
    const input = field.querySelector('input[role="combobox"]');
    const list = field.querySelector('[role="listbox"]');
    if (!input || !list) return;
    suggestionFields.add(field);
    let active = null;

    function highlight(option) {
      active?.setAttribute("aria-selected", "false");
      active = option;
      if (active) {
        active.setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", active.id);
        active.scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }
    function close() {
      highlight(null);
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }
    function showMatches() {
      const query = input.value.trim().toLocaleLowerCase();
      const matches = [...list.querySelectorAll('[role="option"]')].filter(option => {
        option.hidden = !option.textContent.toLocaleLowerCase().includes(query);
        return !option.hidden;
      });
      list.hidden = !matches.length;
      input.setAttribute("aria-expanded", String(Boolean(matches.length)));
      return matches;
    }
    function choose(option) {
      input.value = option.dataset.value ?? option.textContent.trim();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      close();
    }

    input.addEventListener("input", () => { highlight(null); showMatches(); });
    input.addEventListener("click", showMatches);
    input.addEventListener("blur", close);
    input.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const matches = showMatches();
        if (!matches.length) return;
        const index = matches.indexOf(active);
        const next = e.key === "ArrowDown" ? (index + 1) % matches.length : (index <= 0 ? matches.length - 1 : index - 1);
        e.preventDefault();
        highlight(matches[next]);
      } else if (e.key === "Enter" && !list.hidden && active) {
        e.preventDefault();
        choose(active);
      } else if (e.key === "Escape" && !list.hidden) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });
    list.addEventListener("mousedown", (e) => {
      if (e.target.closest('[role="option"]')) e.preventDefault();
    });
    list.addEventListener("click", (e) => {
      const option = e.target.closest('[role="option"]');
      if (option && !option.hidden) choose(option);
    });
  }

  // ---------------------------------------------------- resizable sidebar
  // Resizable sidebar: [data-mu-resizable="key"] gets a separator handle.
  const SIDEBAR_KEY = "munetios-ui-sidebar:";
  function sidebarLimits(el) {
    const styles = getComputedStyle(el);
    const min = parseFloat(styles.minInlineSize || styles.minWidth) || 240;
    const max = parseFloat(styles.maxInlineSize || styles.maxWidth) || 520;
    return { min, max: Math.max(min, Math.min(max, window.innerWidth - 320)) };
  }
  function setSidebarWidth(el, handle, width, save) {
    const { min, max } = sidebarLimits(el);
    const next = Math.round(Math.max(min, Math.min(max, width)));
    el.style.setProperty("--mu-sidebar-width", next + "px");
    handle.setAttribute("aria-valuemin", String(Math.round(min)));
    handle.setAttribute("aria-valuemax", String(Math.round(max)));
    handle.setAttribute("aria-valuenow", String(next));
    if (save) {
      try { localStorage.setItem(SIDEBAR_KEY + el.dataset.muResizable, String(next)); } catch (e) { /* not saved */ }
      el.dispatchEvent(new CustomEvent("mu-sidebar-resize", { bubbles: true, detail: { width: next } }));
    }
  }
  function enhanceResizable(el) {
    if (el._muResizer) return;
    if (!el.dataset.muResizable) el.dataset.muResizable = el.id || "sidebar";
    el.classList.add("mu-sidebar-resizable");
    const handle = document.createElement("div");
    handle.className = "mu-sidebar-resizer";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", el.dataset.muResizeLabel || "Resize sidebar");
    handle.tabIndex = 0;
    el.appendChild(handle);
    el._muResizer = handle;
    const current = () => el.getBoundingClientRect().width || parseFloat(getComputedStyle(el).inlineSize) || 320;
    if (!el.dataset.muDefaultWidth) el.dataset.muDefaultWidth = String(current());
    let saved = NaN;
    try { saved = parseFloat(localStorage.getItem(SIDEBAR_KEY + el.dataset.muResizable)); } catch (e) { /* none */ }
    setSidebarWidth(el, handle, Number.isFinite(saved) ? saved : current(), false);
    const rtl = () => getComputedStyle(el).direction === "rtl";
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = el.getBoundingClientRect().width;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("is-dragging");
      root.classList.add("mu-resizing");
      const move = (ev) => setSidebarWidth(el, handle, startWidth + (rtl() ? startX - ev.clientX : ev.clientX - startX), false);
      const up = () => {
        handle.classList.remove("is-dragging");
        root.classList.remove("mu-resizing");
        handle.removeEventListener("pointermove", move);
        setSidebarWidth(el, handle, el.getBoundingClientRect().width, true);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up, { once: true });
      handle.addEventListener("pointercancel", up, { once: true });
    });
    handle.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 64 : 16;
      const width = el.getBoundingClientRect().width;
      const { min, max } = sidebarLimits(el);
      const grow = rtl() ? "ArrowLeft" : "ArrowRight";
      const shrink = rtl() ? "ArrowRight" : "ArrowLeft";
      let next = null;
      if (e.key === grow) next = width + step;
      else if (e.key === shrink) next = width - step;
      else if (e.key === "Home") next = min;
      else if (e.key === "End") next = max;
      if (next === null) return;
      e.preventDefault();
      setSidebarWidth(el, handle, next, true);
    });
    handle.addEventListener("dblclick", () => setSidebarWidth(el, handle, parseFloat(el.dataset.muDefaultWidth) || 320, true));
  }
  window.addEventListener("resize", () => {
    document.querySelectorAll("[data-mu-resizable]").forEach((el) => {
      if (el._muResizer) setSidebarWidth(el, el._muResizer, el.getBoundingClientRect().width, false);
    });
  });

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches("[data-mu-resizable]")) enhanceResizable(node);
    node.querySelectorAll && node.querySelectorAll("[data-mu-resizable]").forEach(enhanceResizable);
    if (node.matches("select.mu-select")) enhanceSelect(node);
    node.querySelectorAll &&
      node.querySelectorAll("select.mu-select").forEach(enhanceSelect);
    if (node.matches(".mu-suggestion-field")) enhanceSuggestionField(node);
    node.querySelectorAll(".mu-suggestion-field").forEach(enhanceSuggestionField);
    if (node.matches('.mu-range, .mu-slider input[type="range"]'))
      paintRange(node);
    node.querySelectorAll &&
      node
        .querySelectorAll('.mu-range, .mu-slider input[type="range"]')
        .forEach(paintRange);
    if (anyModalOpen() && (node.matches(DANGER_SELECTOR) || node.querySelector(DANGER_SELECTOR))) syncModalLock();
  }
  function start() {
    scan(document.body);
    new MutationObserver((rs) => {
      rs.forEach((r) => { r.addedNodes.forEach(scan); r.removedNodes.forEach(releaseDialogLayers); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();


  // ------------------------------------------------------------- pickers
  // Color, date, time, and date-time pickers in a floating glass panel.
  // Each pickX(options) call returns { close }. Options shared by all pickers:
  //   anchor:   element (or { x, y }) the panel opens next to
  //   value:    current value ("#8f5cff", "2026-11-15", "14:30", "2026-11-15T14:30")
  //   onPick:   called with the chosen value (null when cleared or reset)
  //   locale:   BCP 47 locale for month, weekday, and number formatting
  //   labels:   translated button and field labels (English defaults below)
  // Times always show NM / AN instead of AM / PM.
  const PICKER_LABELS = {
    done: "Done", cancel: "Cancel", reset: "Reset", clear: "Clear", today: "Today", now: "Now",
    previous: "Previous month", next: "Next month", hour: "Hour", minute: "Minute",
    color: "Color", hex: "Hex color", hue: "Hue", area: "Saturation and brightness",
    eyedropper: "Pick a color from the screen", date: "Date", time: "Time",
    chooseYear: "Choose year", chooseMonth: "Choose month",
  };
  // OmniWrite's named color dots, in the same order.
  const PICKER_SWATCHES = [
    ["#FFFFFF", "White"], ["#000000", "Black"], ["#E53935", "Red"], ["#FB8C00", "Orange"],
    ["#FDD835", "Yellow"], ["#43A047", "Green"], ["#1E88E5", "Blue"], ["#8E24AA", "Purple"],
    ["#E91E8C", "Pink"], ["#795548", "Brown"], ["#607D8B", "Slate"], ["#00BCD4", "Cyan"],
    ["#FF6F00", "Amber"], ["#64DD17", "Lime"], ["#FF4081", "Rose"], ["#9E9E9E", "Gray"],
  ];
  const pad2 = (n) => String(n).padStart(2, "0");
  const meridiem = (s) => String(s).replace(/\bAM\b/g, "NM").replace(/\bPM\b/g, "AN");
  let openPicker = null;
  function closePicker(focus = false) {
    const state = openPicker;
    if (!state) return;
    openPicker = null;
    state.abort.abort();
    state.panel.remove();
    if (state.anchor && state.anchor.setAttribute) state.anchor.setAttribute("aria-expanded", "false");
    if (state.onClose) state.onClose();
    if (focus && state.anchor && state.anchor.focus && state.anchor.isConnected) state.anchor.focus({ preventScroll: true });
  }
  function placePicker(panel, anchor) {
    const vv = window.visualViewport;
    const width = vv ? vv.width : innerWidth, height = vv ? vv.height : innerHeight;
    const rect = anchor && anchor.getBoundingClientRect
      ? anchor.getBoundingClientRect()
      : { left: anchor ? anchor.x : 12, right: anchor ? anchor.x : 12, top: anchor ? anchor.y : 12, bottom: anchor ? anchor.y : 12 };
    const edge = 12, gap = 10;
    const below = height - rect.bottom - gap - edge, above = rect.top - gap - edge;
    const up = panel.offsetHeight > below && above > below;
    panel.style.left = Math.max(edge, Math.min(rect.left, width - panel.offsetWidth - edge)) + "px";
    panel.style.top = Math.max(edge, Math.min(up ? rect.top - panel.offsetHeight - gap : rect.bottom + gap, height - panel.offsetHeight - edge)) + "px";
  }
  function mountPicker(panel, opts) {
    closePicker();
    closeSelect && closeSelect();
    const state = { panel, anchor: opts.anchor, abort: new AbortController(), onClose: opts.onClose };
    openPicker = state;
    panel.classList.add("mu-picker");
    panel.setAttribute("role", "dialog");
    document.body.appendChild(panel);
    if (opts.anchor && opts.anchor.setAttribute) opts.anchor.setAttribute("aria-expanded", "true");
    placePicker(panel, opts.anchor);
    const signal = state.abort.signal;
    document.addEventListener("pointerdown", (e) => {
      if (panel.contains(e.target) || (opts.anchor && opts.anchor.contains && opts.anchor.contains(e.target))) return;
      closePicker();
    }, { capture: true, signal });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePicker(true); }
    }, { capture: true, signal });
    window.addEventListener("resize", () => placePicker(panel, opts.anchor), { signal });
    const close = () => { if (openPicker === state) closePicker(true); };
    return close;
  }
  const button = (cls, html, attrs = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.innerHTML = html;
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    return b;
  };
  const iconHtml = (name) => '<span class="mu-icon" aria-hidden="true">' + name + "</span>";

  // ---- color helpers
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  const rgbToHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => pad2(Math.round(v).toString(16))).join("").toUpperCase();
  function rgbToHsv({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
  }
  function hsvToRgb({ h, s, v }) {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
  }
  const isLight = (hex) => { const c = hexToRgb(hex); return !!c && (c.r * 299 + c.g * 587 + c.b * 114) / 1000 > 200; };

  function pickColor(opts = {}) {
    const L = Object.assign({}, PICKER_LABELS, opts.labels);
    const panel = document.createElement("div");
    panel.className = "mu-color-picker";
    panel.setAttribute("aria-label", L.color);
    const start = hexToRgb(opts.value) || hexToRgb("#8f5cff");
    let hsv = rgbToHsv(start);
    const swatches = document.createElement("div");
    swatches.className = "mu-swatches mu-swatches-sm";
    swatches.setAttribute("role", "group");
    swatches.setAttribute("aria-label", L.color);
    const current = (opts.value || "").toUpperCase();
    for (const [hex, name] of opts.swatches || PICKER_SWATCHES) {
      const s = button("mu-swatch" + (isLight(hex) ? " is-light" : ""), "", { "aria-label": name, "aria-pressed": String(current === hex.toUpperCase()), "data-tooltip": name });
      s.style.background = hex;
      s.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(hex.toUpperCase()); });
      swatches.appendChild(s);
    }
    const area = document.createElement("div");
    area.className = "mu-color-area";
    area.tabIndex = 0;
    area.setAttribute("role", "slider");
    area.setAttribute("aria-label", L.area);
    const areaThumb = document.createElement("span");
    areaThumb.className = "mu-color-thumb";
    area.appendChild(areaThumb);
    const hue = document.createElement("div");
    hue.className = "mu-hue";
    hue.tabIndex = 0;
    hue.setAttribute("role", "slider");
    hue.setAttribute("aria-label", L.hue);
    hue.setAttribute("aria-valuemin", "0");
    hue.setAttribute("aria-valuemax", "360");
    const hueThumb = document.createElement("span");
    hueThumb.className = "mu-color-thumb";
    hue.appendChild(hueThumb);
    const row = document.createElement("div");
    row.className = "mu-color-row";
    const preview = document.createElement("span");
    preview.className = "mu-color-preview";
    const hex = document.createElement("input");
    hex.className = "mu-input";
    hex.type = "text";
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.autocomplete = "off";
    hex.setAttribute("aria-label", L.hex);
    row.append(preview, hex);
    if ("EyeDropper" in window) {
      const eye = button("mu-icon-btn mu-icon-btn-soft", iconHtml("colorize"), { "aria-label": L.eyedropper, "data-tooltip": L.eyedropper });
      eye.addEventListener("click", async () => {
        try { const result = await new window.EyeDropper().open(); hsv = rgbToHsv(hexToRgb(result.sRGBHex)); paint(); } catch (e) {}
      });
      row.appendChild(eye);
    }
    const actions = document.createElement("div");
    actions.className = "mu-picker-actions";
    if (opts.allowReset !== false) {
      const reset = button("mu-btn mu-btn-ghost", iconHtml("format_color_reset") + L.reset);
      reset.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(null); });
      actions.appendChild(reset);
    }
    const done = button("mu-btn mu-btn-primary", L.done);
    done.addEventListener("click", () => { const value = rgbToHex(hsvToRgb(hsv)); close(); if (opts.onPick) opts.onPick(value); });
    actions.appendChild(done);
    panel.append(swatches, area, hue, row, actions);
    function paint(skipHex) {
      const value = rgbToHex(hsvToRgb(hsv));
      panel.style.setProperty("--mu-hue", String(Math.round(hsv.h)));
      areaThumb.style.left = hsv.s * 100 + "%";
      areaThumb.style.top = (1 - hsv.v) * 100 + "%";
      areaThumb.style.background = value;
      hueThumb.style.left = (hsv.h / 360) * 100 + "%";
      hue.setAttribute("aria-valuenow", String(Math.round(hsv.h)));
      area.setAttribute("aria-valuetext", Math.round(hsv.s * 100) + "%, " + Math.round(hsv.v * 100) + "%");
      preview.style.background = value;
      if (!skipHex) hex.value = value;
      if (opts.onInput) opts.onInput(value);
    }
    const drag = (el, apply) => {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.focus({ preventScroll: true });
        el.setPointerCapture(e.pointerId);
        const move = (ev) => { const r = el.getBoundingClientRect(); apply(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))); paint(); };
        move(e);
        const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      });
    };
    drag(area, (x, y) => { hsv.s = x; hsv.v = 1 - y; });
    drag(hue, (x) => { hsv.h = Math.min(359.9, x * 360); });
    area.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 0.1 : 0.02;
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!map) return;
      e.preventDefault();
      hsv.s = Math.max(0, Math.min(1, hsv.s + map[0]));
      hsv.v = Math.max(0, Math.min(1, hsv.v + map[1]));
      paint();
    });
    hue.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 15 : 3;
      const d = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : e.key === "ArrowRight" || e.key === "ArrowUp" ? step : 0;
      if (!d) return;
      e.preventDefault();
      hsv.h = (hsv.h + d + 360) % 360;
      paint();
    });
    hex.addEventListener("input", () => { const rgb = hexToRgb(hex.value); if (rgb) { hsv = rgbToHsv(rgb); paint(true); } });
    hex.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); done.click(); } });
    paint();
    const close = mountPicker(panel, opts);
    setTimeout(() => (swatches.querySelector('[aria-pressed="true"]') || area).focus({ preventScroll: true }), 20);
    return { close };
  }

  // ---- date helpers
  function parseISODate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  const isoDate = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  function firstDayOfWeek(locale) {
    try {
      const info = new Intl.Locale(locale);
      const week = info.weekInfo || (info.getWeekInfo && info.getWeekInfo());
      if (week && week.firstDay) return week.firstDay % 7;
    } catch (e) {}
    return /^(en-(US|CA|PH|IN)|ja|ko|zh-TW|he|pt-BR|es-MX|es-US|ar-SA|hi)/.test(locale) ? 0 : 1;
  }
  function buildCalendar(opts, L, onSelect) {
    const locale = opts.locale || navigator.language || "en-US";
    const selected = parseISODate(opts.value);
    let view = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let focusDate = selected || new Date();
    const wrap = document.createElement("div");
    wrap.className = "mu-calendar";
    const head = document.createElement("div");
    head.className = "mu-calendar-head";
    const prev = button("mu-icon-btn mu-icon-btn-sm", iconHtml("chevron_left"), { "aria-label": L.previous, "data-tooltip": L.previous });
    const next = button("mu-icon-btn mu-icon-btn-sm", iconHtml("chevron_right"), { "aria-label": L.next, "data-tooltip": L.next });
    const title = document.createElement("span");
    title.className = "mu-calendar-title";
    title.setAttribute("aria-live", "polite");
    // The month and the year in the header open a month grid and a year grid, so any date
    // (a birthday decades back) is a few clicks away instead of one month per click.
    const monthBtn = button("mu-calendar-pick", "", { "aria-label": L.chooseMonth, "aria-expanded": "false" });
    const yearBtn = button("mu-calendar-pick", "", { "aria-label": L.chooseYear, "aria-expanded": "false" });
    title.append(monthBtn, yearBtn);
    head.append(prev, title, next);
    let mode = "days"; // "days" | "months" | "years"
    const minYear = opts.min ? Number(String(opts.min).slice(0, 4)) : new Date().getFullYear() - 120;
    const maxYear = opts.max ? Number(String(opts.max).slice(0, 4)) : new Date().getFullYear() + 50;
    const grid = document.createElement("div");
    grid.className = "mu-calendar-grid";
    grid.setAttribute("role", "grid");
    wrap.append(head, grid);
    // opts.firstDay (0 = Sunday ... 6 = Saturday) overrides the locale's first day of the week.
    const first = Number.isInteger(Number(opts.firstDay)) && opts.firstDay !== null && opts.firstDay !== "" ? ((Number(opts.firstDay) % 7) + 7) % 7 : firstDayOfWeek(locale);
    const dow = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(2026, 10, 15 + ((first + i) % 7)); // Nov 15 2026 is a Sunday
      try { dow.push(new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(day)); } catch (e) { dow.push("SMTWTFS"[(first + i) % 7]); }
    }
    let longFmt;
    try { longFmt = new Intl.DateTimeFormat(locale, { dateStyle: "full" }); } catch (e) { longFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }); }
    const yearText = (y) => { try { return new Intl.NumberFormat(locale, { useGrouping: false }).format(y); } catch (e) { return String(y); } };
    const monthText = (m, style = "long") => { try { return new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 1))); } catch (e) { return String(m + 1); } };
    function renderYears(focus) {
      grid.className = "mu-calendar-grid is-years";
      grid.setAttribute("role", "listbox");
      grid.setAttribute("aria-label", L.chooseYear);
      let html = "";
      for (let y = maxYear; y >= minYear; y--) html += '<button type="button" class="mu-calendar-option" role="option" data-year="' + y + '" aria-selected="' + (y === view.getFullYear()) + '" tabindex="' + (y === view.getFullYear() ? "0" : "-1") + '">' + yearText(y) + "</button>";
      grid.innerHTML = html;
      const current = grid.querySelector('[aria-selected="true"]');
      if (current) { grid.scrollTop = current.offsetTop - grid.clientHeight / 2 + current.offsetHeight / 2; if (focus) current.focus({ preventScroll: true }); }
    }
    function renderMonths(focus) {
      grid.className = "mu-calendar-grid is-months";
      grid.setAttribute("role", "listbox");
      grid.setAttribute("aria-label", L.chooseMonth);
      let html = "";
      for (let m = 0; m < 12; m++) {
        const lastDay = isoDate(new Date(view.getFullYear(), m + 1, 0)), firstDay = isoDate(new Date(view.getFullYear(), m, 1));
        const disabled = (opts.min && lastDay < opts.min) || (opts.max && firstDay > opts.max);
        html += '<button type="button" class="mu-calendar-option" role="option" data-month="' + m + '" aria-selected="' + (m === view.getMonth()) + '" tabindex="' + (m === view.getMonth() ? "0" : "-1") + '"' + (disabled ? " disabled" : "") + ">" + monthText(m, "short") + "</button>";
      }
      grid.innerHTML = html;
      if (focus) grid.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    }
    function render(focus) {
      monthBtn.textContent = monthText(view.getMonth());
      yearBtn.textContent = yearText(view.getFullYear());
      monthBtn.setAttribute("aria-expanded", String(mode === "months"));
      yearBtn.setAttribute("aria-expanded", String(mode === "years"));
      prev.hidden = next.hidden = mode === "years";
      prev.setAttribute("aria-label", mode === "months" ? String(view.getFullYear() - 1) : L.previous);
      next.setAttribute("aria-label", mode === "months" ? String(view.getFullYear() + 1) : L.next);
      if (mode === "years") return renderYears(focus);
      if (mode === "months") return renderMonths(focus);
      grid.className = "mu-calendar-grid";
      grid.setAttribute("role", "grid");
      grid.removeAttribute("aria-label");
      let html = dow.map((d) => '<span class="mu-calendar-dow" aria-hidden="true">' + d + "</span>").join("");
      const offset = (view.getDay() - first + 7) % 7;
      const start = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
      const today = isoDate(new Date());
      for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const iso = isoDate(d);
        const muted = d.getMonth() !== view.getMonth();
        const disabled = (opts.min && iso < opts.min) || (opts.max && iso > opts.max);
        html += '<button type="button" class="mu-calendar-day' + (muted ? " is-muted" : "") + (iso === today ? " is-today" : "") + '" data-date="' + iso + '" tabindex="' + (iso === isoDate(focusDate) ? "0" : "-1") + '" aria-pressed="' + (selected && iso === isoDate(selected)) + '" aria-label="' + longFmt.format(d) + '"' + (disabled ? " disabled" : "") + ">" + new Intl.NumberFormat(locale).format(d.getDate()) + "</button>";
      }
      grid.innerHTML = html;
      if (focus) grid.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
    }
    const shift = (months) => { view = new Date(view.getFullYear(), view.getMonth() + months, 1); focusDate = new Date(view.getFullYear(), view.getMonth(), Math.min(focusDate.getDate(), 28)); render(); };
    // On the month grid the arrows move a whole year.
    prev.addEventListener("click", () => shift(mode === "months" ? -12 : -1));
    next.addEventListener("click", () => shift(mode === "months" ? 12 : 1));
    monthBtn.addEventListener("click", () => { mode = mode === "months" ? "days" : "months"; render(true); });
    yearBtn.addEventListener("click", () => { mode = mode === "years" ? "days" : "years"; render(true); });
    grid.addEventListener("click", (e) => {
      const year = e.target.closest("[data-year]");
      if (year) { view = new Date(Number(year.dataset.year), view.getMonth(), 1); mode = "months"; render(true); return; }
      const month = e.target.closest("[data-month]");
      if (month && !month.disabled) { view = new Date(view.getFullYear(), Number(month.dataset.month), 1); focusDate = new Date(view.getFullYear(), view.getMonth(), Math.min(focusDate.getDate(), 28)); mode = "days"; render(true); return; }
      const day = e.target.closest("[data-date]");
      if (day && !day.disabled) onSelect(day.dataset.date);
    });
    // Arrow keys move through the year and month grids; Escape goes back to the days.
    grid.addEventListener("keydown", (e) => {
      if (mode === "days") return;
      const items = [...grid.querySelectorAll("button:not([disabled])")];
      const i = items.indexOf(document.activeElement);
      const cols = 3;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); mode = "days"; render(true); return; }
      if (step === undefined || i < 0) return;
      e.preventDefault();
      items[Math.max(0, Math.min(items.length - 1, i + step))].focus();
    });
    grid.addEventListener("keydown", (e) => {
      const day = e.target.closest("[data-date]");
      if (!day) return;
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      let d = parseISODate(day.dataset.date);
      if (map[e.key] !== undefined) d.setDate(d.getDate() + map[e.key]);
      else if (e.key === "PageUp") d.setMonth(d.getMonth() - 1);
      else if (e.key === "PageDown") d.setMonth(d.getMonth() + 1);
      else if (e.key === "Home") d.setDate(d.getDate() - ((d.getDay() - first + 7) % 7));
      else if (e.key === "End") d.setDate(d.getDate() + 6 - ((d.getDay() - first + 7) % 7));
      else return;
      e.preventDefault();
      focusDate = d;
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      render(true);
    });
    render();
    return { el: wrap, focus: () => grid.querySelector('[tabindex="0"]')?.focus({ preventScroll: true }) };
  }
  function pickDate(opts = {}) {
    const L = Object.assign({}, PICKER_LABELS, opts.labels);
    const panel = document.createElement("div");
    panel.className = "mu-date-picker";
    panel.setAttribute("aria-label", L.date);
    const cal = buildCalendar(opts, L, (iso) => { close(); if (opts.onPick) opts.onPick(iso); });
    const actions = document.createElement("div");
    actions.className = "mu-picker-actions";
    if (opts.allowClear) {
      const clear = button("mu-btn mu-btn-ghost", L.clear);
      clear.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(null); });
      actions.appendChild(clear);
    }
    const today = button("mu-btn", iconHtml("today") + L.today);
    today.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(isoDate(new Date())); });
    actions.appendChild(today);
    panel.append(cal.el, actions);
    const close = mountPicker(panel, opts);
    setTimeout(cal.focus, 20);
    return { close };
  }

  // ---- time helpers
  function uses12Hour(locale) {
    try { return new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 !== false; } catch (e) { return true; }
  }
  function buildTime(opts, L) {
    const locale = opts.locale || navigator.language || "en-US";
    const twelve = opts.hour12 !== undefined ? opts.hour12 : uses12Hour(locale);
    const step = Math.max(1, Math.min(30, Number(opts.minuteStep) || 1));
    const m = /(\d{1,2}):(\d{2})/.exec(String(opts.value || ""));
    const now = new Date();
    const state = { h: m ? +m[1] : now.getHours(), min: m ? +m[2] : now.getMinutes() - (now.getMinutes() % step) };
    const wrap = document.createElement("div");
    wrap.className = "mu-time";
    wrap.style.setProperty("--mu-time-cols", twelve ? "3" : "2");
    const nf = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
    const column = (label, values, isSelected, onChoose, text) => {
      const col = document.createElement("div");
      col.className = "mu-time-col";
      const head = document.createElement("span");
      head.className = "mu-time-label";
      head.textContent = label;
      const list = document.createElement("div");
      list.className = "mu-time-list";
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", label);
      for (const v of values) {
        const opt = button("mu-time-option", text(v), { role: "option", "data-value": String(v), "aria-selected": String(isSelected(v)) });
        opt.addEventListener("click", () => { onChoose(v); list.querySelectorAll(".mu-time-option").forEach((o) => o.setAttribute("aria-selected", String(isSelected(+o.dataset.value)))); });
        list.appendChild(opt);
      }
      list.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const opts2 = [...list.children];
        const i = opts2.indexOf(document.activeElement);
        const nextOpt = opts2[Math.max(0, Math.min(opts2.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
        nextOpt.focus();
        nextOpt.click();
      });
      col.append(head, list);
      return col;
    };
    const hours = twelve ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : Array.from({ length: 24 }, (_, i) => i);
    wrap.appendChild(column(L.hour, hours,
      (v) => (twelve ? (state.h % 12 || 12) === v : state.h === v),
      (v) => { state.h = twelve ? (v % 12) + (state.h >= 12 ? 12 : 0) : v; },
      (v) => (twelve ? new Intl.NumberFormat(locale).format(v) : nf.format(v))));
    const minutes = [];
    for (let i = 0; i < 60; i += step) minutes.push(i);
    if (!minutes.includes(state.min)) { minutes.push(state.min); minutes.sort((a, b) => a - b); }
    wrap.appendChild(column(L.minute, minutes, (v) => state.min === v, (v) => { state.min = v; }, (v) => nf.format(v)));
    if (twelve) {
      const col = document.createElement("div");
      col.className = "mu-time-period";
      const spacer = document.createElement("span");
      spacer.className = "mu-time-label";
      spacer.innerHTML = "&nbsp;";
      const seg = document.createElement("div");
      seg.className = "mu-segmented";
      seg.setAttribute("role", "group");
      const nm = button("", "NM", { "aria-pressed": String(state.h < 12) });
      const an = button("", "AN", { "aria-pressed": String(state.h >= 12) });
      nm.addEventListener("click", () => { if (state.h >= 12) state.h -= 12; nm.setAttribute("aria-pressed", "true"); an.setAttribute("aria-pressed", "false"); });
      an.addEventListener("click", () => { if (state.h < 12) state.h += 12; an.setAttribute("aria-pressed", "true"); nm.setAttribute("aria-pressed", "false"); });
      seg.append(nm, an);
      col.append(spacer, seg);
      wrap.appendChild(col);
    }
    const scrollSelected = () => wrap.querySelectorAll(".mu-time-list").forEach((list) => {
      const sel = list.querySelector('[aria-selected="true"]');
      if (sel) list.scrollTop = sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2;
    });
    return { el: wrap, value: () => pad2(state.h) + ":" + pad2(state.min), scrollSelected, focus: () => wrap.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }) };
  }
  function pickTime(opts = {}) {
    const L = Object.assign({}, PICKER_LABELS, opts.labels);
    const panel = document.createElement("div");
    panel.className = "mu-time-picker";
    panel.setAttribute("aria-label", L.time);
    const time = buildTime(opts, L);
    const actions = document.createElement("div");
    actions.className = "mu-picker-actions";
    const nowBtn = button("mu-btn mu-btn-ghost", iconHtml("schedule") + L.now);
    nowBtn.addEventListener("click", () => { const d = new Date(); close(); if (opts.onPick) opts.onPick(pad2(d.getHours()) + ":" + pad2(d.getMinutes())); });
    const done = button("mu-btn mu-btn-primary", L.done);
    done.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(time.value()); });
    actions.append(nowBtn, done);
    panel.append(time.el, actions);
    const close = mountPicker(panel, opts);
    time.scrollSelected();
    setTimeout(time.focus, 20);
    return { close };
  }
  function pickDateTime(opts = {}) {
    const L = Object.assign({}, PICKER_LABELS, opts.labels);
    const panel = document.createElement("div");
    panel.className = "mu-datetime-picker is-wide";
    panel.setAttribute("aria-label", L.date + " · " + L.time);
    const value = String(opts.value || "");
    let date = (parseISODate(value) && value.slice(0, 10)) || isoDate(new Date());
    const body = document.createElement("div");
    body.className = "mu-datetime";
    const cal = buildCalendar(Object.assign({}, opts, { value: date }), L, (iso) => {
      date = iso;
      cal.el.querySelectorAll("[data-date]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.date === iso)));
    });
    const time = buildTime(Object.assign({}, opts, { value: value.slice(11) }), L);
    body.append(cal.el, time.el);
    const actions = document.createElement("div");
    actions.className = "mu-picker-actions";
    const nowBtn = button("mu-btn mu-btn-ghost", iconHtml("schedule") + L.now);
    nowBtn.addEventListener("click", () => { const d = new Date(); close(); if (opts.onPick) opts.onPick(isoDate(d) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes())); });
    const done = button("mu-btn mu-btn-primary", L.done);
    done.addEventListener("click", () => { close(); if (opts.onPick) opts.onPick(date + "T" + time.value()); });
    actions.append(nowBtn, done);
    panel.append(body, actions);
    const close = mountPicker(panel, opts);
    time.scrollSelected();
    setTimeout(cal.focus, 20);
    return { close };
  }
  // Display text for a picker value, with NM / AN for times.
  function formatPickerValue(kind, value, locale) {
    if (!value) return "";
    locale = locale || navigator.language || "en-US";
    try {
      if (kind === "color") return String(value).toUpperCase();
      if (kind === "date") return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parseISODate(value));
      if (kind === "time") { const [h, m] = value.split(":").map(Number); return meridiem(new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(2026, 0, 1, h, m))); }
      if (kind === "datetime") { const d = parseISODate(value); const [h, m] = value.slice(11).split(":").map(Number); d.setHours(h || 0, m || 0); return meridiem(new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d)); }
    } catch (e) {}
    return String(value);
  }
  function syncPickerField(field) {
    const kind = field.getAttribute("data-mu-picker");
    const value = field.dataset.value || "";
    let label = field.querySelector(".mu-picker-value");
    if (!label) {
      field.insertAdjacentHTML("afterbegin", (kind === "color" ? '<span class="mu-picker-swatch" aria-hidden="true"></span>' : iconHtml({ date: "calendar_today", time: "schedule", datetime: "event" }[kind] || "tune")) + '<span class="mu-picker-value"></span>');
      label = field.querySelector(".mu-picker-value");
      label.dataset.placeholder = field.dataset.placeholder || "";
    }
    label.textContent = formatPickerValue(kind, value, field.dataset.locale);
    const swatch = field.querySelector(".mu-picker-swatch");
    if (swatch) swatch.style.background = value || "transparent";
    if (field.dataset.input) { const input = document.getElementById(field.dataset.input); if (input) input.value = value; }
  }
  document.addEventListener("click", (e) => {
    const field = e.target.closest && e.target.closest(".mu-picker-field[data-mu-picker]");
    if (!field || field.disabled) return;
    if (openPicker && openPicker.anchor === field) { closePicker(true); return; }
    const kind = field.getAttribute("data-mu-picker");
    const fn = { color: pickColor, date: pickDate, time: pickTime, datetime: pickDateTime }[kind];
    if (!fn) return;
    fn({
      anchor: field, value: field.dataset.value, locale: field.dataset.locale, allowClear: field.hasAttribute("data-clearable"),
      onPick(value) {
        field.dataset.value = value || "";
        syncPickerField(field);
        field.dispatchEvent(new CustomEvent("mu-pick", { bubbles: true, detail: { value } }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      },
    });
  });
  const scanPickerFields = (node) => {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(".mu-picker-field[data-mu-picker]")) syncPickerField(node);
    node.querySelectorAll && node.querySelectorAll(".mu-picker-field[data-mu-picker]").forEach(syncPickerField);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => scanPickerFields(document.body));
  else scanPickerFields(document.body);
  new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach(scanPickerFields))).observe(document.documentElement, { childList: true, subtree: true });

  // ------------------------------------------------------------- list picker
  // A searchable dialog for long lists such as languages and time zones.
  // pickFromList({ title, icon, value, groups: [{ label, items: [{ value, label, sub, keywords }] }],
  //   searchLabel, emptyText, closeLabel, onPick(value) }) -> { close }
  function pickFromList(options) {
    const opts = options || {};
    const groups = (opts.groups || [{ items: opts.items || [] }]).filter((g) => g && g.items && g.items.length);
    const id = "muListPicker" + Math.random().toString(36).slice(2, 8);
    const modal = document.createElement("div");
    modal.className = "mu-modal mu-list-picker";
    modal.id = id;
    modal.hidden = true;
    modal.innerHTML =
      '<div class="mu-dialog mu-dialog-md" role="dialog" aria-modal="false">' +
      '<div class="mu-dialog-header"><div class="mu-dialog-heading"><span class="mu-icon-circle"><span class="mu-icon" aria-hidden="true"></span></span><h2></h2></div>' +
      '<button type="button" class="mu-icon-btn mu-icon-btn-soft" data-mu-close><span class="mu-icon" aria-hidden="true">close</span></button></div>' +
      '<label class="mu-search"><span class="mu-icon" aria-hidden="true">search</span><input type="search" autocomplete="off" spellcheck="false"></label>' +
      '<div class="mu-list-picker-list mu-scroll" role="listbox"></div></div>';
    const dialog = modal.querySelector(".mu-dialog");
    const heading = modal.querySelector("h2");
    heading.id = id + "Title";
    heading.textContent = opts.title || "";
    dialog.setAttribute("aria-labelledby", heading.id);
    modal.querySelector(".mu-dialog-heading .mu-icon").textContent = opts.icon || "list";
    modal.querySelector("[data-mu-close]").setAttribute("aria-label", opts.closeLabel || "Close");
    const input = modal.querySelector("input");
    input.placeholder = opts.searchLabel || "Search";
    input.setAttribute("aria-label", opts.searchLabel || "Search");
    const list = modal.querySelector(".mu-list-picker-list");
    list.setAttribute("aria-label", opts.title || "");
    const normalize = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let done = false;
    function render() {
      const q = normalize(input.value.trim());
      list.textContent = "";
      let count = 0;
      groups.forEach((group) => {
        const items = group.items.filter((item) => !q || normalize([item.label, item.sub, item.value, item.keywords].join(" ")).includes(q));
        if (!items.length) return;
        if (group.label) {
          const label = document.createElement("div");
          label.className = "mu-section-label";
          label.textContent = group.label;
          list.appendChild(label);
        }
        items.forEach((item) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mu-list-picker-item";
          button.setAttribute("role", "option");
          const selected = item.value === opts.value;
          button.setAttribute("aria-selected", String(selected));
          button.dataset.value = item.value;
          if (item.lang) button.lang = item.lang;
          const text = document.createElement("span");
          text.className = "mu-list-picker-text";
          const main = document.createElement("span");
          main.textContent = item.label;
          text.appendChild(main);
          if (item.sub) {
            const sub = document.createElement("span");
            sub.className = "mu-muted";
            sub.textContent = item.sub;
            text.appendChild(sub);
          }
          button.appendChild(text);
          if (item.trailing) {
            const trailing = document.createElement("span");
            trailing.className = "mu-list-picker-trailing mu-muted";
            trailing.textContent = item.trailing;
            button.appendChild(trailing);
          }
          const check = document.createElement("span");
          check.className = "mu-icon mu-list-picker-check";
          check.setAttribute("aria-hidden", "true");
          check.textContent = selected ? "check_circle" : "";
          button.appendChild(check);
          list.appendChild(button);
          count++;
        });
      });
      if (!count) {
        const empty = document.createElement("div");
        empty.className = "mu-empty";
        empty.innerHTML = '<span class="mu-icon-circle"><span class="mu-icon" aria-hidden="true">search_off</span></span><span></span>';
        empty.lastChild.textContent = opts.emptyText || "No results";
        list.appendChild(empty);
      }
    }
    function close() {
      if (done) return;
      done = true;
      observer.disconnect();
      if (!modal.hidden) closeModal(modal);
      modal.remove();
    }
    const observer = new MutationObserver(() => { if (modal.hidden) close(); });
    list.addEventListener("click", (e) => {
      const item = e.target.closest(".mu-list-picker-item");
      if (!item) return;
      const value = item.dataset.value;
      close();
      if (typeof opts.onPick === "function") opts.onPick(value);
    });
    const items = () => Array.from(list.querySelectorAll(".mu-list-picker-item"));
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); items()[0]?.focus(); }
      if (e.key === "Enter") { e.preventDefault(); items()[0]?.click(); }
    });
    list.addEventListener("keydown", (e) => {
      const all = items();
      const at = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, at + 1)]?.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); if (at <= 0) input.focus(); else all[at - 1].focus(); }
      if (e.key === "Home") { e.preventDefault(); all[0]?.focus(); }
      if (e.key === "End") { e.preventDefault(); all[all.length - 1]?.focus(); }
    });
    render();
    document.body.appendChild(modal);
    openModal(id);
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    input.focus();
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
    return { close };
  }

  // ------------------------------------------------------------- upload tray
  // A bottom-right panel that lists uploads with progress.
  // const tray = MunetiosUI.uploadTray({ title, collapseLabel, expandLabel, closeLabel });
  // const item = tray.add({ name, icon, meta }); item.progress(0.4, "1.2 MB of 3 MB"); item.done(text); item.fail(text, retry);
  // item.onCancel = () => {}; tray.setTitle("Uploading 3 items")
  let trayInstance = null;
  function uploadTray(options) {
    const opts = options || {};
    if (trayInstance && trayInstance.el.isConnected) {
      trayInstance.configure(opts);
      return trayInstance;
    }
    const el = document.createElement("section");
    el.className = "mu-upload-tray mu-glass mu-glass-solid";
    el.hidden = true;
    el.setAttribute("aria-live", "polite");
    el.innerHTML =
      '<header class="mu-upload-tray-head"><span class="mu-icon-circle"><span class="mu-icon" aria-hidden="true">cloud_upload</span></span>' +
      '<h2 class="mu-upload-tray-title"></h2>' +
      '<button type="button" class="mu-icon-btn mu-icon-btn-sm" data-tray="toggle" aria-expanded="true"><span class="mu-icon" aria-hidden="true">expand_more</span></button>' +
      '<button type="button" class="mu-icon-btn mu-icon-btn-sm" data-tray="close"><span class="mu-icon" aria-hidden="true">close</span></button></header>' +
      '<ul class="mu-upload-tray-list mu-scroll"></ul>';
    document.body.appendChild(el);
    const list = el.querySelector("ul");
    const title = el.querySelector(".mu-upload-tray-title");
    const toggle = el.querySelector('[data-tray="toggle"]');
    const closeBtn = el.querySelector('[data-tray="close"]');
    const entries = new Set();
    let labels = {};
    function configure(o) {
      labels = Object.assign(labels, o || {});
      closeBtn.setAttribute("aria-label", labels.closeLabel || "Close");
      const collapsed = el.classList.contains("is-collapsed");
      toggle.setAttribute("aria-label", collapsed ? labels.expandLabel || "Expand" : labels.collapseLabel || "Collapse");
      if (labels.title) title.textContent = labels.title;
    }
    toggle.addEventListener("click", () => {
      const collapsed = el.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.querySelector(".mu-icon").textContent = collapsed ? "expand_less" : "expand_more";
      configure();
    });
    closeBtn.addEventListener("click", () => {
      entries.forEach((entry) => { if (entry.state === "active" && typeof entry.onCancel === "function") entry.onCancel(); });
      entries.clear();
      list.textContent = "";
      el.hidden = true;
      if (typeof api.onClose === "function") api.onClose();
    });
    const api = {
      el,
      configure,
      setTitle(text) { title.textContent = text; },
      get active() { return [...entries].filter((e) => e.state === "active").length; },
      add(item) {
        const li = document.createElement("li");
        li.className = "mu-upload-tray-item";
        li.innerHTML =
          '<span class="mu-icon mu-upload-tray-icon" aria-hidden="true"></span><div class="mu-upload-tray-info"><span class="mu-upload-tray-name"></span>' +
          '<div class="mu-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>' +
          '<span class="mu-upload-tray-meta mu-muted"></span></div>' +
          '<button type="button" class="mu-icon-btn mu-icon-btn-sm" data-action="cancel"><span class="mu-icon" aria-hidden="true">close</span></button>';
        li.querySelector(".mu-upload-tray-icon").textContent = item.icon || "image";
        li.querySelector(".mu-upload-tray-name").textContent = item.name || "";
        li.querySelector(".mu-upload-tray-meta").textContent = item.meta || "";
        const bar = li.querySelector(".mu-progress");
        bar.setAttribute("aria-label", item.name || "");
        const action = li.querySelector("[data-action]");
        action.setAttribute("aria-label", item.cancelLabel || labels.cancelLabel || "Cancel");
        list.appendChild(li);
        el.hidden = false;
        const entry = {
          el: li,
          state: "active",
          onCancel: null,
          retry: null,
          progress(fraction, meta) {
            const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
            bar.firstChild.style.width = pct + "%";
            bar.setAttribute("aria-valuenow", String(pct));
            if (meta !== undefined) li.querySelector(".mu-upload-tray-meta").textContent = meta;
          },
          setMeta(meta) { li.querySelector(".mu-upload-tray-meta").textContent = meta; },
          done(meta) {
            entry.state = "done";
            entry.progress(1, meta);
            li.classList.add("is-done");
            action.querySelector(".mu-icon").textContent = "check_circle";
            action.disabled = true;
            action.setAttribute("aria-label", meta || "");
          },
          fail(meta, retry) {
            entry.state = "failed";
            entry.retry = retry || null;
            li.classList.add("is-failed");
            li.querySelector(".mu-upload-tray-meta").textContent = meta || "";
            action.querySelector(".mu-icon").textContent = retry ? "refresh" : "error";
            action.disabled = !retry;
            action.setAttribute("aria-label", labels.retryLabel || "Try again");
          },
          remove() { entries.delete(entry); li.remove(); if (!entries.size) el.hidden = true; },
        };
        action.addEventListener("click", () => {
          if (entry.state === "active") {
            entry.state = "cancelled";
            if (typeof entry.onCancel === "function") entry.onCancel();
            entry.remove();
          } else if (entry.state === "failed" && entry.retry) {
            const retry = entry.retry;
            entry.state = "active";
            li.classList.remove("is-failed");
            action.querySelector(".mu-icon").textContent = "close";
            action.setAttribute("aria-label", labels.cancelLabel || "Cancel");
            retry();
          }
        });
        entries.add(entry);
        return entry;
      },
      clearFinished() {
        [...entries].forEach((entry) => { if (entry.state === "done") entry.remove(); });
      },
    };
    configure(opts);
    trayInstance = api;
    return api;
  }

  // ------------------------------------------------------------- top bar search
  // .mu-topbar-search: below 768px it is an icon button that opens as a floating bar.
  const narrowSearch = window.matchMedia ? window.matchMedia("(width < 768px)") : { matches: false };
  function enhanceTopbarSearch(box) {
    if (!box || box._muSearch) return;
    box._muSearch = true;
    const input = box.querySelector("input");
    const close = box.querySelector(".mu-topbar-search-close");
    if (!input) return;
    const sync = () => box.classList.toggle("has-value", Boolean(input.value));
    const open = () => { if (narrowSearch.matches && !box.classList.contains("is-open")) { box.classList.add("is-open"); input.focus(); } };
    const shut = () => box.classList.remove("is-open");
    box.addEventListener("click", (e) => { if (!e.target.closest(".mu-topbar-search-close")) open(); });
    input.addEventListener("focus", open);
    input.addEventListener("input", sync);
    input.addEventListener("blur", () => setTimeout(() => { if (!input.value && !box.contains(document.activeElement)) shut(); }, 150));
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (input.value) { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
      else { shut(); input.blur(); }
    });
    close?.addEventListener("click", (e) => {
      e.preventDefault();
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      shut();
      if (!narrowSearch.matches) input.focus();
    });
    narrowSearch.addEventListener?.("change", () => { if (!narrowSearch.matches) shut(); });
    sync();
  }
  const scanTopbarSearch = () => document.querySelectorAll(".mu-topbar-search").forEach(enhanceTopbarSearch);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scanTopbarSearch);
  else scanTopbarSearch();

  window.MunetiosUI = Object.freeze({
    enhanceTopbarSearch,
    version: "4.4.0",
    pickFromList,
    uploadTray,
    theme,
    toast,
    openModal,
    closeModal: (id) =>
      closeModal(typeof id === "string" ? document.getElementById(id) : id),
    enhanceSelect,
    refreshSelect(select) {
      if (openSelect?.select === select) closeSelect(false);
      sync(select);
    },
    enhanceResizable,
    enhanceDialogLayer,
    pickColor,
    pickDate,
    pickTime,
    pickDateTime,
    closePicker: () => closePicker(true),
    formatPickerValue,
  });
})();
