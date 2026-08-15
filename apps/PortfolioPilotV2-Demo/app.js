const D = window.CCDC_DATA || {};
const S = D.snapshot || { summary: {}, positions: [] };
const PRESENTATION_SCHEMA = window.PortfolioPilotPresentationSchema || {
  fields: {},
  views: {},
};
const appVersion =
  document.querySelector('meta[name="portfolio-version"]')?.content ||
  S.app_version ||
  "Unknown";
document.title = `PortfolioPilot v${appVersion}`;
const copyrightStartYear = 2026;
const copyrightCurrentYear = Math.max(copyrightStartYear, new Date().getFullYear());
const copyrightYear = document.getElementById("copyrightYear");
if (copyrightYear)
  copyrightYear.textContent = copyrightCurrentYear === copyrightStartYear
    ? String(copyrightStartYear)
    : `${copyrightStartYear}–${copyrightCurrentYear}`;
const tabs = [
  "Morning Brief",
  "Roll Advisor",
  "Recommendations",
  "Positions",
  "History",
  "Policy",
  "Diagnostics",
  "Setup",
  "Security",
];
const tabDescriptions = {
  "Morning Brief": "What needs attention today across your covered-call portfolio.",
  "Roll Advisor": "Live, linked two-leg roll candidates ranked by policy and net credit.",
  Recommendations: "New covered-call opportunities aligned with capacity and monthly goals.",
  Positions: "Current covered calls grouped by brokerage account.",
  History: "Contract lifecycles, fills, rolls, and premium cash flow.",
  Policy: "The constraints and scoring rules used by the decision engines.",
  Diagnostics: "Provider connectivity, data quality, and reconciliation health.",
  Setup: "Operating mode, decision rules, and local application configuration.",
  Security: "Local-first safeguards and read-only brokerage boundaries.",
};
const tabIcons = {
  "Morning Brief": "☀",
  "Roll Advisor": "↻",
  Recommendations: "★",
  Positions: "▤",
  History: "◷",
  Policy: "✓",
  Diagnostics: "⌁",
  Setup: "⚙",
  Security: "⛨",
};
const nav = document.getElementById("tabs"),
  content = document.getElementById("content");
const navCollapseButton = document.getElementById("navCollapseButton");
let navigationCollapsed = false;
try {
  navigationCollapsed = localStorage.getItem("portfolioPilot.navigation") === "collapsed";
} catch (_) {
  // Navigation remains usable when browser storage is unavailable.
}
function applyNavigationState() {
  document.body.classList.toggle("nav-collapsed", navigationCollapsed);
  if (!navCollapseButton) return;
  navCollapseButton.setAttribute("aria-expanded", String(!navigationCollapsed));
  navCollapseButton.setAttribute("aria-label", navigationCollapsed ? "Expand navigation" : "Collapse navigation");
  navCollapseButton.title = navigationCollapsed ? "Expand navigation" : "Collapse navigation";
  navCollapseButton.querySelector("span").textContent = navigationCollapsed ? "›" : "‹";
}
navCollapseButton?.addEventListener("click", () => {
  navigationCollapsed = !navigationCollapsed;
  try {
    localStorage.setItem("portfolioPilot.navigation", navigationCollapsed ? "collapsed" : "expanded");
  } catch (_) {
    // The current-page state still applies without persistence.
  }
  applyNavigationState();
});
applyNavigationState();
const localSession =
  location.protocol === "https:" &&
  Boolean(document.querySelector('meta[name="ccdc-csrf"]')?.content);
// An authenticated loopback page owns mode selection. Its first live refresh
// may be loading a dashboard_data.js file left behind by a prior file demo.
const demoMode =
  !localSession && (D.settings?.app?.mode === "demo" || S.mode === "demo");
document.getElementById("refreshTime").textContent = demoMode
  ? "Demo rendered " + new Date().toLocaleString()
  : S.generated_at
    ? "Refreshed " + new Date(S.generated_at).toLocaleString()
    : "Not refreshed";
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
const themeModes = ["auto", "light", "dark"];
let themePreference = "auto";
try {
  const savedTheme = localStorage.getItem("portfolioPilot.theme");
  if (themeModes.includes(savedTheme)) themePreference = savedTheme;
} catch (_) {
  // Local storage can be unavailable in privacy-restricted browser sessions.
}
function applyTheme() {
  const resolved =
    themePreference === "auto"
      ? themeMedia.matches
        ? "dark"
        : "light"
      : themePreference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.bsTheme = resolved;
  document.documentElement.style.colorScheme = resolved;
  themeButtons.forEach((button) => {
    const selected = button.dataset.themeChoice === themePreference;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-checked", String(selected));
    button.title =
      button.dataset.themeChoice === "auto"
        ? `Follow system appearance (currently ${resolved})`
        : `Use ${button.dataset.themeChoice} appearance`;
  });
}
themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    themePreference = button.dataset.themeChoice;
    try {
      localStorage.setItem("portfolioPilot.theme", themePreference);
    } catch (_) {
      // The theme still applies for this page even when persistence is unavailable.
    }
    applyTheme();
  });
});
themeMedia.addEventListener?.("change", () => {
  if (themePreference === "auto") applyTheme();
});
applyTheme();
const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v || 0),
  );
const num = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));
const pct = (v) => (v == null ? "—" : (Number(v) * 100).toFixed(1) + "%");
const risk = (v) => (v == null ? "N/A" : `${v}/100`);
const expiration = (v) => `<span class="expiration-date">${esc(v)}</span>`;
const cls = (s) =>
  s?.startsWith("GREEN")
    ? "green"
    : s?.startsWith("YELLOW")
      ? "yellow"
      : s?.startsWith("RED")
        ? "red"
        : "gray";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
const displayDate = (v) => {
  const text = String(v ?? "");
  const isoDate = text.match(/^\d{4}-\d{2}-\d{2}/);
  return esc(isoDate ? isoDate[0] : text);
};
const displayRefreshTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "Not refreshed";
const maskAccount = (value) => {
  const text = String(value ?? "");
  const digits = text.replace(/\D/g, "");
  return digits.length >= 4 ? `****${digits.slice(-4)}` : text;
};
const briefToday = String(
  S.market_clock?.market_date || S.generated_at || new Date().toISOString(),
).slice(0, 10);
let briefCalendarMonth = `${briefToday.slice(0, 7)}-01`;
const rollAdvisorOverrides = new Map();
const rollAdvisorContractKey = (row) => [row.account || "", row.symbol || "", row.expiration || "", Number(row.strike || 0), Number(row.contracts || 0)].join("|");
let briefSelectedPositionIndex = (() => {
  const ranked = S.positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => (b.position.risk_score || 0) - (a.position.risk_score || 0));
  return ranked[0]?.index ?? -1;
})();
function shiftBriefCalendarMonth(offset) {
  const cursor = new Date(`${briefCalendarMonth}T12:00:00Z`);
  cursor.setUTCMonth(cursor.getUTCMonth() + offset);
  briefCalendarMonth = cursor.toISOString().slice(0, 7) + "-01";
}
function briefCalendarDetail() {
  const position = S.positions[briefSelectedPositionIndex];
  if (!position)
    return '<div class="calendar-detail-empty"><div><b>Select a contract</b><p class="muted">Choose a color-coded calendar entry to review its current details here.</p></div></div>';
  return `<div class="calendar-detail-header"><div><div class="label">Selected contract</div><h3>${esc(position.symbol)} · ${expiration(position.expiration)} · ${money(position.strike)}</h3></div><span class="pill ${cls(position.status)}">${esc(position.status)}</span></div><div class="calendar-detail-grid"><div><span class="label">Quantity</span><b>${position.contracts}</b></div><div><span class="label">DTE</span><b>${position.dte}</b></div><div><span class="label">Stock</span><b>${position.current_price == null ? "—" : money(position.current_price)}</b></div><div><span class="label">Delta</span><b>${num(position.delta)}</b></div><div><span class="label">Distance</span><b>${pct(position.distance_to_strike_pct)}</b></div><div><span class="label">Risk</span><b>${risk(position.risk_score)}</b></div></div><div class="calendar-detail-action"><span class="label">Current guidance</span><b>${esc(position.action)}</b><p>${esc(position.explanation)}</p></div>${tradeGuide(position)}`;
}
function briefCalendar() {
  const cursor = new Date(`${briefCalendarMonth}T12:00:00Z`);
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(cursor);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const earningsByDate = Object.values(D.diagnostics?.earnings_calendar || {}).reduce((events, event) => {
    const eventDate = String(event?.event_date || "").slice(0, 10);
    if (eventDate) (events[eventDate] ||= []).push(event);
    return events;
  }, {});
  const cells = [];
  for (let blank = 0; blank < firstWeekday; blank += 1)
    cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entries = S.positions
      .map((position, index) => ({ position, index }))
      .filter(({ position }) => String(position.expiration).slice(0, 10) === iso)
      .sort((a, b) => (b.position.risk_score || 0) - (a.position.risk_score || 0));
    const earnings = (earningsByDate[iso] || []).sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
    cells.push(`<div class="calendar-day${iso === briefToday ? " today" : ""}" data-date="${iso}"><div class="calendar-date"><span>${day}</span>${iso === briefToday ? '<b>Today</b>' : ""}</div><div class="calendar-events">${earnings
      .map((event) => `<div class="calendar-event calendar-earnings" title="${esc(event.symbol)} earnings · ${esc(event.timing || "Time unknown")} · ${esc(event.source || "Earnings calendar")}"><span><b>${esc(event.symbol)}</b> Earnings · ${esc(event.timing || "TBD")}</span></div>`)
      .join("")}${entries
      .map(
        ({ position, index }) =>
          `<button type="button" class="calendar-event ${cls(position.status)}${index === briefSelectedPositionIndex ? " selected" : ""}" data-position-index="${index}" title="${esc(position.symbol)} ${esc(position.expiration)} $${num(position.strike, 2)} · ${esc(position.status)}"><span><b>${esc(position.symbol)}</b> $${num(position.strike, 0)} · ${position.contracts}c</span></button>`,
      )
      .join("")}</div></div>`);
  }
  while (cells.length % 7) cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  return `<section class="section card brief-calendar" aria-labelledby="briefCalendarTitle"><div class="calendar-pane"><div class="calendar-toolbar"><h2 id="briefCalendarTitle">${esc(monthLabel)}</h2><div class="calendar-controls"><button type="button" data-calendar-action="previous" aria-label="Previous month">‹</button><button type="button" class="calendar-today-button" data-calendar-action="today">Today</button><button type="button" data-calendar-action="next" aria-label="Next month">›</button></div></div><div class="calendar-legend"><span><i class="green"></i>Wait</span><span><i class="yellow"></i>Monitor</span><span><i class="red"></i>Action</span><span><i class="gray"></i>Settlement</span><span><i class="earnings"></i>Earnings</span></div><div class="calendar-scroll"><div class="calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div></div><p class="muted calendar-help">Select a contract to show its current guidance on the right. Colors reflect the latest refreshed status.</p></div><aside id="calendarDetail" class="calendar-detail" aria-live="polite">${briefCalendarDetail()}</aside></section>`;
}
function bindBriefCalendar() {
  content.querySelectorAll("[data-calendar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.calendarAction;
      if (action === "today") briefCalendarMonth = `${briefToday.slice(0, 7)}-01`;
      else shiftBriefCalendarMonth(action === "previous" ? -1 : 1);
      const monthPrefix = briefCalendarMonth.slice(0, 7);
      const visiblePositions = S.positions
        .map((position, index) => ({ position, index }))
        .filter(({ position }) => String(position.expiration).startsWith(monthPrefix))
        .sort((a, b) => String(a.position.expiration).localeCompare(String(b.position.expiration)) || (b.position.risk_score || 0) - (a.position.risk_score || 0));
      briefSelectedPositionIndex = visiblePositions[0]?.index ?? -1;
      show("Morning Brief");
    });
  });
  content.querySelectorAll(".calendar-event").forEach((button) => {
    button.addEventListener("click", () => {
      briefSelectedPositionIndex = Number(button.dataset.positionIndex);
      content.querySelectorAll(".calendar-event").forEach((entry) =>
        entry.classList.toggle("selected", entry === button),
      );
      const detail = document.getElementById("calendarDetail");
      if (detail) detail.innerHTML = briefCalendarDetail();
    });
  });
}
function table(headers, rows, options = {}) {
  const schemaName = options.schema;
  const schemaColumns = PRESENTATION_SCHEMA.views?.[schemaName]?.columns;
  if (!schemaName || !schemaColumns) {
    throw new Error(`Missing presentation schema for table: ${schemaName || "unnamed"}`);
  }
  const missingHeaders = headers.filter(
    (header) => !schemaColumns.some((column) => column.label === header),
  );
  if (missingHeaders.length) {
    throw new Error(`Presentation schema ${schemaName} is missing columns: ${missingHeaders.join(", ")}`);
  }
  if (!rows.length) return '<div class="empty">No records yet.</div>';
  const density = headers.length >= 8 ? " pp-table-dense" : "";
  const overflow = options.horizontalScroll
    ? " pp-table-scroll"
    : options.contentWeightedScroll
      ? " pp-table-content-scroll"
      : "";
  const schemaToken = (value) => String(value || "").replaceAll(/[^a-zA-Z0-9_-]/g, "");
  const columnMetadata = (header) => {
    const column = schemaColumns.find((candidate) => candidate.label === header);
    const field = PRESENTATION_SCHEMA.fields?.[column.field] || {};
    return { ...field, ...column };
  };
  const columnClass = (header) => {
    const metadata = columnMetadata(header);
    const width = schemaToken(metadata.width || "standard");
    const role = schemaToken(metadata.role || "value");
    const align = schemaToken(metadata.align || "left");
    return `pp-col-${width} pp-role-${role} pp-align-${align}`;
  };
  const hasResizableColumns = headers.some((header) => columnMetadata(header).resizable);
  const resizableClass = hasResizableColumns ? " pp-table-resizable" : "";
  const columnMarkup = (header, index) => {
    const metadata = columnMetadata(header);
    const key = schemaToken(metadata.key || header);
    return `<col class="${columnClass(header)}" data-column-key="${esc(key)}" data-column-index="${index}">`;
  };
  const headerMarkup = (header, index) => {
    const metadata = columnMetadata(header);
    const key = schemaToken(metadata.key || header);
    const resizeHandle = metadata.resizable
      ? `<span class="column-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize ${esc(header)} column" tabindex="0" data-column-key="${esc(key)}" data-column-index="${index}" data-min-width="${Number(metadata.minWidth)}" data-max-width="${Number(metadata.maxWidth)}" title="Drag to resize; double-click to reset"></span>`
      : "";
    return `<th scope="col" class="${columnClass(header)}${metadata.resizable ? " pp-column-resizable" : ""}" data-column-key="${esc(key)}"><span>${header}</span>${resizeHandle}</th>`;
  };
  return `<div class="table-responsive pp-table-wrap${density}${overflow}${resizableClass}" data-columns="${headers.length}" data-table-schema="${esc(schemaName)}"><table class="table table-vcenter table-hover"><colgroup>${headers.map(columnMarkup).join("")}</colgroup><thead><tr>${headers.map(headerMarkup).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function tableColumnWidthKey(schemaName, columnKey) {
  return `portfolioPilot.tableColumnWidth.${schemaName}.${columnKey}`;
}
function bindResizableTables() {
  content.querySelectorAll(".pp-table-resizable").forEach((wrapper) => {
    const tableElement = wrapper.querySelector("table");
    const schemaName = wrapper.dataset.tableSchema;
    if (!tableElement || !schemaName) return;
    const handles = wrapper.querySelectorAll(".column-resize-handle");
    const applyWidth = (handle, width) => {
      const index = Number(handle.dataset.columnIndex);
      const header = tableElement.tHead?.rows[0]?.cells[index];
      const column = tableElement.querySelector(`col[data-column-index="${index}"]`);
      if (!header || !column || !Number.isFinite(width)) return;
      header.style.width = `${width}px`;
      header.style.minWidth = `${width}px`;
      column.style.width = `${width}px`;
    };
    handles.forEach((handle) => {
      const storageKey = tableColumnWidthKey(schemaName, handle.dataset.columnKey);
      try {
        const saved = Number(localStorage.getItem(storageKey));
        if (saved > 0) applyWidth(handle, saved);
      } catch (_) {
        // Resizing remains available when browser storage is restricted.
      }
      const resizeBy = (delta) => {
        const index = Number(handle.dataset.columnIndex);
        const header = tableElement.tHead?.rows[0]?.cells[index];
        if (!header) return;
        const minWidth = Number(handle.dataset.minWidth);
        const maxWidth = Number(handle.dataset.maxWidth);
        const width = Math.max(minWidth, Math.min(maxWidth, header.getBoundingClientRect().width + delta));
        applyWidth(handle, width);
        tableElement.style.minWidth = `${Math.max(wrapper.clientWidth, tableElement.scrollWidth)}px`;
        try { localStorage.setItem(storageKey, String(Math.round(width))); } catch (_) {}
      };
      handle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const headers = [...tableElement.tHead.rows[0].cells];
        const initialWidths = headers.map((header) => header.getBoundingClientRect().width);
        headers.forEach((header, index) => {
          header.style.width = `${initialWidths[index]}px`;
          header.style.minWidth = `${initialWidths[index]}px`;
          const column = tableElement.querySelector(`col[data-column-index="${index}"]`);
          if (column) column.style.width = `${initialWidths[index]}px`;
        });
        const startX = event.clientX;
        const startWidth = initialWidths[Number(handle.dataset.columnIndex)];
        const startTableWidth = initialWidths.reduce((sum, width) => sum + width, 0);
        const minWidth = Number(handle.dataset.minWidth);
        const maxWidth = Number(handle.dataset.maxWidth);
        document.body.classList.add("column-resizing");
        handle.setPointerCapture?.(event.pointerId);
        const move = (moveEvent) => {
          const width = Math.max(minWidth, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
          const delta = width - startWidth;
          applyWidth(handle, width);
          tableElement.style.width = `${startTableWidth + delta}px`;
          tableElement.style.minWidth = `${startTableWidth + delta}px`;
        };
        const finish = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", finish);
          handle.removeEventListener("pointercancel", finish);
          document.body.classList.remove("column-resizing");
          const index = Number(handle.dataset.columnIndex);
          const width = tableElement.tHead.rows[0].cells[index].getBoundingClientRect().width;
          try { localStorage.setItem(storageKey, String(Math.round(width))); } catch (_) {}
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", finish);
        handle.addEventListener("pointercancel", finish);
      });
      handle.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        resizeBy(event.key === "ArrowRight" ? 16 : -16);
      });
      handle.addEventListener("dblclick", () => {
        const index = Number(handle.dataset.columnIndex);
        const header = tableElement.tHead?.rows[0]?.cells[index];
        const column = tableElement.querySelector(`col[data-column-index="${index}"]`);
        if (header) { header.style.width = ""; header.style.minWidth = ""; }
        if (column) column.style.width = "";
        tableElement.style.width = "";
        tableElement.style.minWidth = "";
        try { localStorage.removeItem(storageKey); } catch (_) {}
      });
    });
  });
}
function disclosureKey(namespace, account, source) {
  const identity = `${namespace}|${account}|${source}`;
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${namespace}.${(hash >>> 0).toString(16)}`;
}
function disclosureState(key, fallback) {
  try {
    const saved = localStorage.getItem(`portfolioPilot.disclosure.${key}`);
    if (saved === "open") return true;
    if (saved === "closed") return false;
  } catch (_) {
    // Default state remains available when browser storage is restricted.
  }
  return fallback;
}
function disclosurePanel({ storageKey, defaultOpen = false, className = "", summary, body }) {
  const isOpen = disclosureState(storageKey, defaultOpen);
  return `<details class="disclosure-panel ${className}" data-disclosure-key="${esc(storageKey)}"${isOpen ? " open" : ""}><summary><span class="disclosure-toggle" aria-hidden="true"></span>${summary}</summary>${body}</details>`;
}
function accountGroupedTable(rows, headers, renderRow, expanded = false, namespace = "accounts", tableOptions = {}) {
  const groups = new Map();
  (rows || []).forEach((row) => {
    const account = row.account || row.account_name || "Unknown account";
    const source = row.source || "Unknown source";
    const key = `${account}\u0000${source}`;
    if (!groups.has(key)) groups.set(key, { account, source, rows: [] });
    groups.get(key).rows.push(row);
  });
  if (!groups.size) return '<div class="empty">No records yet.</div>';
  return [...groups.values()].sort((a, b) => String(a.account).localeCompare(String(b.account)) || String(a.source).localeCompare(String(b.source))).map((group) => {
    const key = disclosureKey(namespace, group.account, group.source);
    const isOpen = disclosureState(key, expanded);
    return disclosurePanel({ storageKey: key, defaultOpen: isOpen, className: "account-lifecycle account-disclosure", summary: `<span class="account-heading"><b>Account ${esc(maskAccount(group.account))}</b><span class="account-source">Source: ${esc(group.source)}</span></span>`, body: `<div class="account-table">${table(headers, group.rows.map(renderRow), tableOptions)}</div>` });
  }).join("");
}
function bindDisclosures() {
  content.querySelectorAll("details[data-disclosure-key]").forEach((panel) => {
    panel.addEventListener("toggle", () => {
      try {
        localStorage.setItem(`portfolioPilot.disclosure.${panel.dataset.disclosureKey}`, panel.open ? "open" : "closed");
      } catch (_) {
        // Disclosure remains interactive even when persistence is unavailable.
      }
    });
  });
}
const financial = (value) => `<span class="${Number(value) < 0 ? "negative-value" : ""}">${money(value)}</span>`;
const withdrawal = (value) => financial(-Math.abs(Number(value || 0)));
function rollTargetText() {
  let r = D.settings?.decision_rules || {};
  return `${num(r.target_roll_delta_min, 2)}–${num(r.target_roll_delta_max, 2)} delta`;
}
function tradeGuide(r, compact = false) {
  const state = cls(r.status),
    current = `${esc(r.symbol)} ${esc(r.expiration)} $${num(r.strike, 0)} call`,
    target = rollTargetText();
  if (r.status === "EXPIRED")
    return `<div class="instruction-note"><b>Expired contract.</b> Schwab settlement is pending. Use Refresh Data later to update the final outcome.</div>`;
  if (state === "green")
    return compact
      ? '<span class="muted">No action required</span>'
      : `<div class="instruction-note green-note"><b>No trade indicated.</b> Continue monitoring through expiration.</div>`;
  if (state === "yellow")
    return `<details class="trade-guide compact-guide"><summary>View monitoring instructions</summary><div class="guide-body"><div class="instruction-note yellow-note"><b>Monitor before acting.</b> Recheck the stock price, delta, DTE, and available roll credit later in the session.</div><ol><li>Open <b>${current}</b> in Schwab Positions.</li><li>Review the option’s live mark and remaining extrinsic value.</li><li>Price a later-dated covered roll-out near <b>${target}</b>.</li><li>Use one combined order only if you decide to roll; do not enter two separate market orders.</li></ol></div></details>`;
  return `<details class="trade-guide compact-guide"><summary>View Schwab roll instructions</summary><div class="guide-body"><div class="instruction-note red-note"><b>Manual action candidate:</b> evaluate rolling ${current}. PortfolioPilot uses Schwab's live option chain when connected. Review the ranked candidates in the Roll Advisor before entering the trade.</div><div class="order-legs"><div><span class="leg-label">Closing leg</span><b>Buy to Close</b><span>${r.contracts} × ${current}</span></div><div><span class="leg-label">Replacement leg</span><b>Sell to Open</b><span>Same quantity · later expiration · target ${target}</span></div></div><h4>Schwab checklist</h4><ol><li>From the position, choose Schwab’s <b>Rollout/Roll</b> action. If unavailable, open a two-leg options ticket.</li><li>Verify the first leg is <b>Buy to Close</b> and the second is <b>Sell to Open</b>.</li><li>Keep the contract quantity at <b>${r.contracts}</b> on both legs.</li><li>Choose a replacement strike that supports your share-retention goal and is near <b>${target}</b>.</li><li>Select a <b>Net Credit limit</b> when available. Start near the combined order midpoint and adjust deliberately; avoid a market order.</li><li>Before submitting, verify symbol, expiration, strikes, quantity, order effect, limit price, and estimated credit/debit.</li></ol><div class="warning-box"><b>Important:</b> A net credit and lower delta are preferences, not guarantees. Do not accept a debit merely to satisfy the dashboard recommendation unless you have independently decided the trade-off is worthwhile.</div></div></details>`;
}
function actionCenter() {
  let rows = S.positions
    .filter(
      (x) => x.status.startsWith("RED") || x.status.startsWith("YELLOW"),
    )
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  if (!rows.length)
    return '<div class="empty">No active trading actions suggested today.</div>';
  return `<div class="action-list">${rows.map((r) => `<div class="action-item ${cls(r.status)}-border"><div class="action-main"><span class="pill ${cls(r.status)}">${esc(r.status)}</span><div><b>${esc(r.symbol)} · ${esc(r.expiration)} · $${num(r.strike, 0)}</b><div class="muted">${esc(r.action)} · Risk ${risk(r.risk_score)}</div></div></div>${tradeGuide(r, true)}</div>`).join("")}</div>`;
}
function settlementNotices() {
  const rows = S.positions.filter((x) => x.status === "EXPIRED");
  if (!rows.length) return '<div class="empty">No settlement items pending.</div>';
  return `<div class="action-list">${rows.map((r) => `<div class="action-item gray-border"><div class="action-main"><span class="pill gray">EXPIRED</span><div><b>${esc(r.symbol)} · ${esc(r.expiration)} · $${num(r.strike, 0)}</b><div class="muted">Trading risk N/A · Awaiting Schwab lifecycle update</div></div></div>${tradeGuide(r, true)}</div>`).join("")}</div>`;
}
function briefDisclosure(title, body, options = {}) {
  const count = options.count == null ? "" : `<span class="disclosure-count">${options.count}</span>`;
  const panelId = options.id || `morning-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  const resetOnRefresh = options.resetOnRefresh ?? panelId === "morning-action-center";
  const resetToken = resetOnRefresh ? S.generated_at || briefToday : "persistent";
  const storageKey = disclosureKey("panel", panelId, resetToken);
  return disclosurePanel({ storageKey, defaultOpen: Boolean(options.defaultOpen ?? options.open), className: "section brief-disclosure", summary: `<span class="disclosure-title">${esc(title)}</span>${count}`, body: `<div class="brief-disclosure-body">${options.intro ? `<p class="muted section-intro">${esc(options.intro)}</p>` : ""}${body}</div>` });
}
function donutChart(segments, center, caption, ariaLabel) {
  const rings = (items, radius, width, prefix) => {
    let offset=0;
    return items.map((segment) => {
      const value=Math.max(0,Math.min(100,Number(segment.value || 0)));
      const circle=`<circle class="donut-${prefix}-${esc(segment.tone)}" cx="50" cy="50" r="${radius}" pathLength="100" stroke-dasharray="${num(value,2)} ${num(100-value,2)}" stroke-dashoffset="${num(-offset,2)}" stroke-width="${width}"></circle>`;
      offset+=value;
      return circle;
    }).join("");
  };
  return `<svg class="command-donut" viewBox="0 0 100 100" role="img" aria-label="${esc(ariaLabel)}"><circle class="donut-track" cx="50" cy="50" r="40" pathLength="100" stroke-width="10"></circle>${rings(segments,40,10,"outer")}<text class="donut-value" x="50" y="48" text-anchor="middle">${esc(center)}</text><text class="donut-caption" x="50" y="61" text-anchor="middle">${esc(caption)}</text></svg>`;
}
function leadMetricSummary(leadCard, metricCards) {
  const cards = (metricCards || []).slice(0, 4);
  return `<div class="lead-metric-summary"><div class="lead-metric-card">${leadCard}</div><div class="lead-metric-grid">${cards.join("")}</div></div>`;
}
function brief() {
  const currentMonth = briefToday.slice(0, 7);
  const currentMonthCashFlow = (D.premium_history?.months || []).find((row) => row.month === currentMonth) || {};
  const trailingStart = new Date(`${currentMonth}-01T12:00:00Z`);
  trailingStart.setUTCMonth(trailingStart.getUTCMonth() - 11);
  const trailingStartMonth = trailingStart.toISOString().slice(0, 7);
  const trailingNetOptionCash = (D.premium_history?.months || [])
    .filter((row) => String(row.month) >= trailingStartMonth && String(row.month) <= currentMonth)
    .reduce((total, row) => total + Number(row.net_cash_flow ?? row.realized_premium ?? 0), 0);
  let q = S.summary || {},
    c = q.counts || {},
    hi = q.highest_risk_position,
    monthlyPremium = currentMonthCashFlow.net_cash_flow ?? currentMonthCashFlow.realized_premium ?? 0,
    monthlyTarget = q.monthly_income_target || D.recommendations?.monthly_target || 0,
    monthlyGap = Math.max(monthlyTarget - monthlyPremium, 0),
    targetProgress = (monthlyPremium / (monthlyTarget || 1)) * 100,
    monthlyOverage = Math.max(monthlyPremium - monthlyTarget, 0);
  let attention = (c.red || 0) + (c.yellow || 0),
    focus = attention
      ? `${attention} position${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} attention${hi ? " · Start with " + hi.symbol + " $" + num(hi.strike, 0) : ""}`
      : "No action required today";
  const tieNote = hi && q.highest_risk_tie_count > 1 ? `<div class="muted">${q.highest_risk_tie_count} active positions share risk ${risk(hi.risk_score)}; ranked by ITM status, delta, strike proximity, then DTE.</div>` : "";
  const priorityState = hi ? cls(hi.status) : "green";
  const priorityTitle = hi ? `${hi.symbol} · ${expiration(hi.expiration)} · ${money(hi.strike)}` : "Portfolio clear";
  const priorityGuidance = hi ? hi.action : "No active trading action is required.";
  const healthCount=(c.green || 0)+(c.yellow || 0)+(c.red || 0);
  const healthTotal=Math.max(1,healthCount);
  const healthSegments=[{tone:"green",value:(c.green || 0)*100/healthTotal},{tone:"yellow",value:(c.yellow || 0)*100/healthTotal},{tone:"red",value:(c.red || 0)*100/healthTotal}];
  const premiumSegments = targetProgress > 100
    ? [{tone:"green",value:10000/targetProgress},{tone:"over",value:100-(10000/targetProgress)}]
    : [{tone:"green",value:targetProgress},{tone:"red",value:100-targetProgress}];
  const premiumDonut=donutChart(premiumSegments,`${num(targetProgress,0)}%`,"of target",`${num(targetProgress,1)}% of monthly premium target earned`);
  const healthDonut=donutChart(healthSegments,healthCount ? `${c.green || 0}/${healthCount}` : "0","healthy",`${c.green || 0} green, ${c.yellow || 0} yellow, and ${c.red || 0} red active positions`);
  const leadCard = `<div class="card command-priority ${priorityState}-command"><div class="command-priority-top"><span class="label">Today’s priority</span><span class="pill ${priorityState}">${hi ? `${esc(hi.status)} · ${risk(hi.risk_score)}` : "All clear"}</span></div><div class="command-priority-main"><div><div class="command-priority-title">${priorityTitle}</div><p>${esc(priorityGuidance)}</p></div><div class="command-priority-metrics"><span><b>${hi ? hi.dte : "—"}</b>DTE</span><span><b>${hi ? num(hi.delta, 2) : "—"}</b>Delta</span><span><b>${attention}</b>Need attention</span></div></div>${tieNote}<div class="command-priority-footer"><span>${esc(focus)}</span><span>Review details below ↓</span></div></div>`;
  const metricCards = [
    `<div class="card command-metric command-chart-card"><div class="label">Premium earned</div><div class="command-chart-body">${premiumDonut}<div class="command-chart-detail"><b>${money(monthlyPremium)}</b><span class="metric-target">Target ${money(monthlyTarget)}</span><span class="${monthlyOverage ? "positive-value" : "negative-value"}">${monthlyOverage ? `Above Target ${money(monthlyOverage)}` : `Gap ${money(monthlyGap)}`}</span><span class="annual-premium ${trailingNetOptionCash >= 0 ? "positive-value" : "negative-value"}">1Y: ${money(trailingNetOptionCash)}</span></div></div></div>`,
    `<div class="card command-metric command-chart-card"><div class="label">Portfolio health</div><div class="command-chart-body">${healthDonut}<div class="health-pills command-chart-legend"><span class="health-pill green"><b>${c.green || 0}</b> Green</span><span class="health-pill yellow"><b>${c.yellow || 0}</b> Yellow</span><span class="health-pill red"><b>${c.red || 0}</b> Red</span></div></div></div>`,
    `<div class="card command-metric"><div class="label">Open contracts</div><div class="value">${q.contracts || 0}</div><div class="muted">Across ${q.open_positions || 0} positions</div></div>`,
  ];
  const positionTableOptions = { contentWeightedScroll: true };
  return `${leadMetricSummary(leadCard, metricCards)}${briefCalendar()}${briefDisclosure("Action Center", actionCenter(), { open: true, count: attention, intro: "Read-only Schwab guidance. Ranked candidates appear when live option-chain access is connected." })}${briefDisclosure("Needs attention", coveredCallsTable(S.positions.filter((x) => x.status.startsWith("RED") || x.status.startsWith("YELLOW")), false, positionTableOptions), { count: attention })}${briefDisclosure("No action required", coveredCallsTable(S.positions.filter((x) => x.status.startsWith("GREEN")), false, positionTableOptions), { count: c.green || 0 })}${briefDisclosure("Settlement and lifecycle notices", settlementNotices(), { count: c.expired || 0, intro: "Expired contracts are no longer tradeable and do not receive a trading-risk score." })}`;
}
function coveredCallsTable(rows = S.positions, groupByAccount = false, tableOptions = {}) {
  const orderedRows = [...rows].sort((a, b) => {
    const aDte = Number.isFinite(Number(a.dte)) ? Number(a.dte) : Infinity;
    const bDte = Number.isFinite(Number(b.dte)) ? Number(b.dte) : Infinity;
    return aDte - bDte || String(a.expiration || "").localeCompare(String(b.expiration || "")) || String(a.symbol || "").localeCompare(String(b.symbol || "")) || Number(a.strike || 0) - Number(b.strike || 0);
  });
  const headers = [
      "Symbol",
      "Qty",
      "Expiration",
      "Strike",
      "Stock",
      "Delta",
      "DTE",
      "Distance",
      "Risk",
      "Status",
      "Action",
      "Trade Instructions",
    ];
  const renderRow = (r, showSources) => `<tr><td><b>${esc(r.symbol)}</b></td><td>${r.contracts}</td><td>${expiration(r.expiration)}</td><td>${money(r.strike)}</td><td>${r.current_price == null ? "—" : money(r.current_price)}</td><td>${num(r.delta)}</td><td>${r.dte}</td><td>${pct(r.distance_to_strike_pct)}</td><td>${risk(r.risk_score)}</td><td><span class="pill ${cls(r.status)}">${esc(r.status)}</span></td><td>${esc(r.action)}<div class="muted">${esc(r.explanation)}</div></td><td>${tradeGuide(r, true)}</td>${showSources ? `<td>${esc(r.quote_source)}<br><span class="muted">${esc(r.option_source)}</span></td>` : ""}</tr>`;
  const options = { schema: "coveredCalls", ...tableOptions };
  if (!groupByAccount) return table([...headers, "Sources"], orderedRows.map((r) => renderRow(r, true)), options);
  const groupedRows = orderedRows.map((row) => ({
    ...row,
    source: [...new Set([row.quote_source, row.option_source].filter(Boolean))].join(" / ") || "Unknown source",
  }));
  return accountGroupedTable(groupedRows, headers, (r) => renderRow(r, false), true, "positions-covered-calls", options);
}

function weeklyOpportunitySection(symbolRecommendation) {
  const weekly = symbolRecommendation.weekly_opportunities || {},
    rows = weekly.suggestions || [];
  if (!weekly.enabled) return "";
  const content = rows.length
    ? table(
        ["Quote date", "Planned entry", "Expiration", "Qty", "Bucket", "Strike", "Delta", "Bid/share", "Expected premium", "Spread", "Score", "Risk"],
        rows.map((row) => `<tr><td>${expiration(row.quote_date)}</td><td>${expiration(row.entry_date)}</td><td>${expiration(row.expiration)}</td><td><b>1</b></td><td>${esc(row.bucket)}</td><td>${money(row.strike)}</td><td>${num(row.delta, 3)}</td><td>${money(row.bid)}</td><td>${money(row.expected_premium)}</td><td>${row.spread_pct == null ? "—" : num(row.spread_pct, 2) + "%"}</td><td><b>${num(row.score, 1)}</b></td><td>${esc(row.risk_level)}</td></tr>`),
        { schema: "weeklyOpportunities" },
      )
    : `<div class="empty">${esc(weekly.status || "No weekly opportunities are available.")}${weekly.next_entry_date ? ` · Next review ${expiration(weekly.next_entry_date)}` : ""}</div>`;
  const capacityNotice = weekly.over_policy_by > 0
    ? `<div class="red-note"><b>Above policy:</b> ${weekly.active_contracts} active contracts versus policy maximum ${weekly.policy_max_contracts} — ${weekly.over_policy_by} over. Weekly suggestions remain visible but are not capacity-filtered.</div>`
    : `<div class="instruction-note"><b>Policy context:</b> ${weekly.active_contracts} active contracts versus policy maximum ${weekly.policy_max_contracts}. Weekly suggestions are not capacity-filtered.</div>`;
  const timing = weekly.preview
    ? `These are previews for entry on ${expiration(weekly.entry_date)} using quotes from ${expiration(weekly.quote_date)}. Refresh Data on the planned Monday before placing an order.`
    : "These use today’s Monday quotes for this Friday. Confirm the live quote immediately before placing an order.";
  return `<div class="section"><h3>Monday-to-Friday weekly opportunities</h3><p class="muted">Independent one-contract ideas for small additional premium, including after the monthly target is exceeded. OTM, delta-bucket, earnings, liquidity, spread, and read-only safeguards still apply. Capacity is informational for this weekly list; each row is a separate one-contract order and operator discipline is required. <b>${timing}</b></p>${capacityNotice}${content}</div>`;
}
function recommendations() {
  const R = D.recommendations || {};
  const symbols = R.symbols || [];
  const errors = R.errors || [];
  if (!R.enabled)
    return `<div class="card"><h2>Recommendation Engine</h2><p class="muted">The recommendation engine is disabled in settings.</p></div>`;
  const summary = `<div class="summary-cards summary-cards-6 recommendations-summary"><div class="card"><div class="label">Current-month net premium</div><div class="value">${money(R.current_month_net_premium ?? R.current_month_sto_cash_received)}</div><p class="muted">STO deposits minus BTC withdrawals.</p></div><div class="card"><div class="label">Executable expected premium</div><div class="value">${money(R.expected_premium)}</div><p class="muted">Today’s qualifying recommendations only.</p></div><div class="card"><div class="label">Immediate target gap</div><div class="value">${money(R.target_gap)}</div><p class="muted">Target minus net premium and executable recommendations.</p></div><div class="card"><div class="label">Projected new premium through month end</div><div class="value">${money(R.projected_cadence_premium)}</div><p class="muted">Includes today’s executable recommendation plus illustrative later cycles.</p></div><div class="card"><div class="label">Projected month-end gap</div><div class="value">${money(R.projected_month_end_gap ?? R.target_gap)}</div><p class="muted">${esc(R.target_outlook || "Cadence outlook unavailable")}</p></div><div class="card"><div class="label">Policy mode</div><div class="value">Preserve Shrs</div><p class="muted">Read-only recommendations; constraints are never relaxed to meet target.</p></div></div><div class="warning-box"><b>Cadence outlook is illustrative, not guaranteed.</b> Projected new premium already includes today’s executable amount; do not add the two figures together. The outlook uses today’s qualifying option-chain premium and assumes replacement calls may be opened only after active calls expire and capacity becomes free. Future prices, deltas, liquidity, assignment, and available expirations will differ.</div>`;
  const blocks = symbols
    .map(
      (x) =>
        `<div class="section card"><div class="recommendation-heading"><div><h2>${esc(x.symbol)} recommendation</h2><p class="muted">${x.shares_owned.toLocaleString()} shares · Maximum ${x.max_active_contracts} active contracts · ${num(x.max_coverage_pct, 1)}% maximum coverage${x.earnings_event ? ` · Earnings ${esc(x.earnings_event.event_date)} (${esc(x.earnings_event.timing)}) · ${esc(x.earnings_event.source)} · ${x.earnings_event.authoritative ? "Issuer confirmed; expirations through that date excluded" : "Unverified discovery; not used to block recommendations"}` : ""}</p></div><span class="pill ${x.policy_overage_contracts > 0 ? "red" : x.status === "READY" || x.status === "MONTHLY TARGET MET" ? "green" : "yellow"}">${x.policy_overage_contracts > 0 ? `${x.policy_overage_contracts} OVER POLICY` : esc(x.status)}</span></div><div class="grid mini-grid"><div><span class="label">Active / policy max</span><b>${x.active_contracts} / ${x.max_active_contracts}${x.policy_overage_contracts > 0 ? ` · <span class="negative">${x.policy_overage_contracts} over</span>` : ""}</b></div><div><span class="label">Recycling soon</span><b>${x.recycling_contracts}</b></div><div><span class="label">Recommended now</span><b>${x.recommended_contracts}</b></div><div><span class="label">Expected now</span><b>${money(x.expected_premium)}</b></div><div><span class="label">Preferred cadence</span><b>${x.preferred_cadence_dte} DTE</b></div><div><span class="label">Weighted delta</span><b>${num(x.weighted_delta, 3)}</b></div></div>${table(
          [
            "Bucket",
            "Qty",
            "Expiration",
            "DTE",
            "Strike",
            "Delta",
            "Bid",
            "Expected premium",
            "Spread",
            "Recommendation score",
            "Risk level",
            "Why",
          ],
          (x.recommendations || []).map(
            (r) =>
              `<tr><td><b>${esc(r.bucket)}</b></td><td>${r.contracts}</td><td>${expiration(r.expiration)}</td><td>${r.dte}</td><td>${money(r.strike)}</td><td>${num(r.delta, 3)}</td><td>${money(r.bid)}</td><td>${money(r.expected_premium)}</td><td>${r.spread_pct == null ? "—" : num(r.spread_pct, 2) + "%"}</td><td><b>${num(r.score, 1)}</b></td><td>${esc(r.risk_level)}</td><td class="diag-text">${esc(r.rationale)}</td></tr>`,
          ),
          { schema: "recommendations" },
        )}<div class="section"><h3>Illustrative monthly cadence</h3><p class="muted"><b>Review / potential execution date</b> is the first weekday after the active call is expected to expire and free its capacity. Strike and bid are today’s qualifying template—not a future quote. <b>Projected premium</b> equals today’s bid × 100 × quantity; use Refresh Data on that date to confirm the live expiration, strike, delta, and bid before deciding whether to trade.</p>${table(
          ["Review / potential execution", "Projected expiration", "DTE", "Bucket", "Qty", "Template strike", "Today’s bid/share", "Template delta", "Recommendation score", "Risk level", "Projected premium"],
          ((x.cadence_projection || {}).schedule || []).map(
            (row) => `<tr><td>${expiration(row.review_date)}</td><td>${expiration(row.projected_expiration)}</td><td>${row.dte}</td><td><b>${esc(row.bucket)}</b></td><td>${row.contracts}</td><td>${money(row.template_strike)}</td><td>${money(row.template_bid)}</td><td>${num(row.template_delta, 3)}</td><td><b>${num(row.recommendation_score, 1)}</b></td><td>${esc(row.risk_level)}</td><td>${money(row.projected_premium)}</td></tr>`,
          ),
          { schema: "recommendationCadence" },
        )}</div>${weeklyOpportunitySection(x)}</div>`,
    )
    .join("");
  return `${summary}${errors.length ? `<div class="warning-box">${errors.map(esc).join("<br>")}</div>` : ""}${blocks || '<div class="empty">No recommendations are available.</div>'}`;
}
function policy() {
  const r = D.settings?.recommendation_engine || {},
    w = r.weights || {},
    weekly = r.weekly_opportunities || {},
    weeklyWeights = weekly.weights || {},
    syms = r.symbols || {},
    buckets = r.buckets || [];
  return `<div class="summary-cards summary-cards-4"><div class="card"><div class="label">Primary objective</div><div class="value">Preserve shares</div><p class="muted">Weight ${w.share_preservation || 0}%</p></div><div class="card"><div class="label">Secondary objective</div><div class="value">Income</div><p class="muted">Monthly target ${money(r.monthly_income_target || D.settings?.app?.monthly_income_target)}</p></div><div class="card"><div class="label">Expiration search</div><div class="value">${r.min_dte}–${r.max_dte} DTE</div><p class="muted">Any weekly expiration may be selected when execution is better.</p></div><div class="card"><div class="label">Earnings policy</div><div class="value">${r.avoid_earnings ? "Avoid" : "Allowed"}</div><p class="muted">Earnings dates update automatically and fall back to the last-known-good local calendar when the source is unavailable.</p></div></div><div class="section"><h2>Weekly opportunities</h2><div class="grid mini-grid"><div><span class="label">Schedule</span><b>${esc(weekly.entry_weekday || "MONDAY")} → ${esc(weekly.expiration_weekday || "FRIDAY")}</b></div><div><span class="label">Order size</span><b>${weekly.contracts_per_order || 1} contract</b></div><div><span class="label">Suggestions/symbol</span><b>${weekly.max_suggestions_per_symbol || 3}</b></div><div><span class="label">Capacity enforcement</span><b>Operator controlled</b></div><div><span class="label">Preservation / income</span><b>${weeklyWeights.share_preservation ?? 40}% / ${weeklyWeights.income ?? 45}%</b></div></div></div><div class="section"><h2>Symbol limits</h2>${table(
    [
      "Symbol",
      "Shares owned",
      "Maximum active contracts",
      "Maximum shares covered",
      "Coverage",
    ],
    Object.entries(syms).map(
      ([k, v]) =>
        `<tr><td><b>${esc(k)}</b></td><td>${Number(v.shares_owned || 0).toLocaleString()}</td><td>${v.max_active_contracts}</td><td>${Number(v.max_active_contracts || 0) * 100}</td><td>${num(((Number(v.max_active_contracts || 0) * 100) / Math.max(1, Number(v.shares_owned || 0))) * 100, 1)}%</td></tr>`,
    ),
    { schema: "policySymbolLimits" },
  )}</div><div class="section"><h2>Risk distribution</h2>${table(
    ["Bucket", "Contracts", "Delta range", "Target delta"],
    buckets.map(
      (b) =>
        `<tr><td><b>${esc(b.name)}</b></td><td>${b.contracts}</td><td>${num(b.delta_min, 2)}–${num(b.delta_max, 2)}</td><td>${num(b.target_delta, 2)}</td></tr>`,
    ),
    { schema: "policyRiskDistribution" },
  )}</div><div class="section"><h2>Scoring weights</h2>${table(
    ["Factor", "Weight"],
    [
      ["Share preservation", w.share_preservation],
      ["Income generation", w.income],
      ["Liquidity", w.liquidity],
      ["Roll flexibility", w.roll_flexibility],
    ].map((x) => `<tr><td>${esc(x[0])}</td><td>${num(x[1], 0)}%</td></tr>`),
    { schema: "policyWeights" },
  )}</div>`;
}

function matchingOpenRoll(r, candidate) {
  return (r.open_roll_orders || []).find((order) => String(order.sto_contract?.expiration) === String(candidate.expiration) && Number(order.sto_contract?.strike) === Number(candidate.strike) && Number(order.contracts) === Number(candidate.quantity ?? r.contracts));
}
function submittedRollLimit(order) {
  if (order?.limit_price == null) return null;
  return String(order.order_type || "").includes("DEBIT") ? -Math.abs(Number(order.limit_price)) : Math.abs(Number(order.limit_price));
}
function openOrderSub(value) {
  return `<br><i class="open-order-secondary">${value}</i>`;
}
function rollCandidateTable(r, candidates) {
  return table(
    ["Rank", "Quantity", "BTC current contract", "BTC ask/share", "STO replacement contract", "STO bid/share", "Replacement STO premium", "Combined net-credit limit/share", "Additional net roll credit", "Delta", "Open interest", "Volume", "Risk", "Score"],
    candidates.map((c, i) => {
      const order=matchingOpenRoll(r,c);
      const sub=(value) => order ? openOrderSub(value) : "";
      const submitted=submittedRollLimit(order);
      return `<tr class="${order ? "candidate-has-open-order" : ""}"><td>${i + 1}${i === 0 ? " · Best" : ""}${sub(`Order ${esc(order?.order_id || "—")}`)}</td><td>${c.quantity ?? r.contracts}</td><td>BTC ${expiration(r.expiration)} · ${money(r.strike)}</td><td>${money(c.current_buyback_ask)}</td><td>STO ${expiration(c.expiration)} · ${money(c.strike)}</td><td>${money(c.bid)}</td><td>${money(c.replacement_sto_premium_total)}</td><td><b>${money(c.combined_limit_credit ?? c.net_credit)}</b>${sub(submitted == null ? "Order limit —" : `<b>${financial(submitted)}</b>`)}</td><td><b>${money(c.combined_limit_credit_total ?? c.net_credit_total)}</b>${sub(submitted == null ? "Order credit —" : financial(submitted*100*order.contracts))}</td><td>${num(c.delta)}</td><td>${num(c.open_interest, 0)}</td><td>${num(c.volume, 0)}</td><td>${esc(c.assignment_risk)}</td><td><b>${num(c.score, 1)}</b></td></tr>`;
    }),
    { horizontalScroll: true, schema: "rollCandidates" },
  );
}
function rejectedRollTable(r, rejected) {
  if (!rejected.length) return '<div class="warning-box"><b>No qualifying or near-credit roll was found.</b> The search included higher-strike candidates through 90 DTE while preserving the configured delta range. Refresh during market hours or decide whether accepting assignment fits your plan.</div>';
  return `<div class="warning-box"><b>No zero-or-positive net-credit roll qualified through ${r.roll_search_max_dte || 90} DTE.</b> The candidates below are monitoring references only. They currently price as debits and must not be entered unless their shortfall improves to zero.</div>${table(
    ["Rank", "Quantity", "BTC current contract", "BTC ask/share", "STO replacement contract", "STO bid/share", "Replacement STO premium", "Combined net-credit limit/share", "Additional net roll cash", "Delta", "Open interest", "Volume", "Risk", "Score"],
    rejected.map((c, i) => {
      const order=matchingOpenRoll(r,c);
      const sub=(value) => order ? openOrderSub(value) : "";
      const submitted=submittedRollLimit(order);
      return `<tr class="${order ? "candidate-has-open-order" : ""}"><td>${i + 1}${sub(`Order ${esc(order?.order_id || "—")}`)}</td><td>${c.quantity ?? r.contracts}</td><td>BTC ${expiration(r.expiration)} · ${money(r.strike)}</td><td>${money(c.current_buyback_ask)}</td><td>STO ${expiration(c.expiration)} · ${money(c.strike)}</td><td>${money(c.bid)}</td><td>${money(c.replacement_sto_premium_total)}</td><td><b>${financial(c.combined_limit_credit ?? c.net_credit)}</b>${sub(submitted == null ? "Order limit —" : `<b>${financial(submitted)}</b>`)}</td><td><b>${financial(c.combined_limit_credit_total ?? c.net_credit_total)}</b>${sub(submitted == null ? "Order credit —" : financial(submitted*100*order.contracts))}</td><td>${num(c.delta)}</td><td>${num(c.open_interest, 0)}</td><td>${num(c.volume, 0)}</td><td>${esc(c.assignment_risk)}</td><td><b>${num(c.score, 1)}</b></td></tr>`;
    }),
    { horizontalScroll: true, schema: "rollCandidates" },
  )}`;
}
function rollAdvisor() {
  const rows = (S.positions || []).map((row) => ({ ...row, ...(rollAdvisorOverrides.get(rollAdvisorContractKey(row)) || {}) })).filter(
    (r) => r.status?.startsWith("RED") || r.status?.startsWith("YELLOW"),
  ).sort((a, b) => (a.status?.startsWith("RED") ? 0 : 1) - (b.status?.startsWith("RED") ? 0 : 1) || String(a.expiration || "").localeCompare(String(b.expiration || "")) || String(a.symbol || "").localeCompare(String(b.symbol || "")) || Number(a.strike || 0) - Number(b.strike || 0));
  if (!rows.length)
    return `<div class="card"><h2>Intelligent Roll Advisor</h2><p class="muted">No ranked candidates are available. Schwab authorization and a live option chain are required, and only yellow/red positions are analyzed.</p></div>`;
  const panels=rows
    .map((r) => {
      let cs = r.roll_candidates || [];
      let rejected = r.roll_rejected_candidates || [];
      const key = rollAdvisorContractKey(r);
      const refreshedAt = r.advisor_refreshed_at || S.generated_at;
      const openOrderCount=(r.open_roll_orders || []).length;
      const best=cs[0] || rejected[0];
      const bestCredit=best ? (best.combined_limit_credit ?? best.net_credit) : null;
      return `<div class="section card roll-advisor-card command-roll-workspace${openOrderCount ? " has-open-roll" : ""}"><button type="button" class="roll-advisor-heading ${cls(r.status)}" data-roll-refresh-key="${esc(key)}"${demoMode ? " disabled" : ""} title="${demoMode ? "Static demo data cannot contact Schwab" : "Refresh this contract's Roll Advisor data"}"><span class="roll-advisor-title">${esc(r.symbol)} ${esc(r.expiration)} $${num(r.strike, 2)}<small>Advisor refreshed ${esc(displayRefreshTime(refreshedAt))}</small></span><span class="roll-advisor-header-status"><span class="pill ${cls(r.status)}">${esc(r.status)}</span>${openOrderCount ? `<span class="pill open-order-pill">${openOrderCount} OPEN ROLL ORDER${openOrderCount === 1 ? "" : "S"}</span>` : ""}</span></button><div class="roll-cockpit"><div><span class="cockpit-label">Current obligation</span><b>BTC ${esc(r.symbol)} ${expiration(r.expiration)} · ${money(r.strike)}</b><small>${r.contracts} contract${r.contracts === 1 ? "" : "s"} · Ask ${r.option_ask == null ? "—" : money(r.option_ask)}/share</small></div><span class="cockpit-flow" aria-hidden="true">→</span><div><span class="cockpit-label">Best replacement</span><b>${best ? `STO ${esc(r.symbol)} ${expiration(best.expiration)} · ${money(best.strike)}` : "No candidate"}</b><small>${best ? `${best.dte} DTE · Delta ${num(best.delta, 2)}` : "Refresh during market hours"}</small></div><div class="cockpit-credit ${Number(bestCredit) < 0 ? "negative-value" : ""}"><span class="cockpit-label">Linked order economics</span><b>${bestCredit == null ? "—" : financial(bestCredit)}</b><small>${cs.length ? "Net credit/share" : "Closest current debit/share"}</small></div></div>${r.roll_advisor_error ? `<div class="warning-box">${esc(r.roll_advisor_error)}</div>` : ""}${cs.length ? rollCandidateTable(r, cs) : rejectedRollTable(r, rejected)}</div>`;
    })
    .join("");
  return `${panels}<aside class="roll-advisor-reference-notes" aria-label="Roll Advisor reference notes"><p><b>Linked order:</b> Enter one linked two-leg Schwab roll order—not two separate orders. Leg 1 is Buy to Close the current call; Leg 2 is Sell to Open the same quantity at the candidate strike and expiration. Select <b>Net Credit Limit</b> and do not submit if Schwab’s order review changes to a debit. Refresh immediately before preparing the ticket because quotes move.</p><p><b>Column reference:</b> Replacement STO premium is the gross new-call premium at today’s bid. Additional net roll credit subtracts the BTC cost and is the cash this proposed roll adds before fees. Historical roll chains and outcomes are shown in History.</p></aside>`;
}
function bindRollAdvisorRefresh() {
  content.querySelectorAll("[data-roll-refresh-key]").forEach((button) => button.addEventListener("click", async () => {
    if (demoMode || button.disabled) return;
    const key = button.dataset.rollRefreshKey;
    const position = (S.positions || []).find((row) => rollAdvisorContractKey(row) === key);
    if (!position) return;
    button.disabled = true;
    button.classList.add("loading");
    const timestamp = button.querySelector("small");
    if (timestamp) timestamp.textContent = "Refreshing this contract…";
    try {
      const response = await fetch("/api/roll-advisor/refresh", {
        method: "POST", headers: { "X-CCDC-CSRF": document.querySelector('meta[name="ccdc-csrf"]')?.content || "", "Content-Type": "application/json" },
        body: JSON.stringify({ account: position.account, symbol: position.symbol, expiration: position.expiration, strike: position.strike, contracts: position.contracts }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Contract refresh failed.");
      rollAdvisorOverrides.set(key, { ...result, advisor_refreshed_at: result.refreshed_at });
    } catch (error) {
      rollAdvisorOverrides.set(key, { ...(rollAdvisorOverrides.get(key) || {}), roll_advisor_error: error.message || "Contract refresh failed." });
    }
    show("Roll Advisor");
  }));
}

function positions() {
  let mode = D.settings?.app?.mode || "demo";
  return `<div class="card"><div class="label">Position source</div><div class="mono">${mode === "schwab" ? "Schwab API" : "Schwab (Demo)"}</div><p class="muted">${mode === "schwab" ? "Open positions, prices and market details come only from Schwab." : "All positions, prices, option chains, and activity are synthetic; no brokerage connection is made."} Additional position types can be added as separate sections in this view.</p></div><div class="section"><h2>Covered Calls</h2>${coveredCallsTable(S.positions, true)}</div>`;
}
function providerStatusTable() {
  const rows = D.provider_status?.providers || [];
  return table(
    ["Provider", "Role", "Enabled", "Status", "Last attempt", "Details"],
    rows.map(
      (x) =>
        `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.role || "")}</td><td>${x.enabled ? "Yes" : "No"}</td><td><span class="pill ${x.enabled ? "green" : "gray"}">${esc(x.status || "")}</span></td><td>${esc(x.last_attempt || "—")}</td><td>${esc(x.details || "")}</td></tr>`,
    ),
    { schema: "providerStatus" },
  );
}
function diagnostics() {
  let d = D.diagnostics || {},
    rows = d.market_data || [],
    errs = d.activity_errors || [],
    mc = d.market_clock || {};
  return `<div class="summary-cards summary-cards-6"><div class="card"><div class="label">Schwab connection</div><div class="value">${d.schwab_connected ? "Connected" : "Not connected"}</div><p>${esc(d.schwab_position_error || "Position synchronization completed without a recorded error.")}</p></div><div class="card"><div class="label">Market clock</div><div class="value">${esc(mc.session || "Unknown")}</div><p>${esc(mc.now_market || "—")} · ${esc(mc.timezone || "America/New_York")}</p></div><div class="card"><div class="label">Market-data health</div><div class="value">${esc(d.market_data_health || "Unknown")}</div><p>Option-chain gaps are warnings; positions and history remain usable.</p></div><div class="card"><div class="label">Lifecycle reconciliation</div><div class="value">${Number(d.pending_lifecycle_reconciliation || 0)}</div><p>Past unmatched calls awaiting confirmed expiration or assignment.</p></div><div class="card"><div class="label">Market intelligence</div><div class="value">${esc((d.market_intelligence || {}).status || "Unknown")}</div><p>${esc((d.market_intelligence || {}).source || "Automatic earnings calendar")}</p></div><div class="card"><div class="label">Detailed log</div><div class="value mono">${esc(d.log_file || "logs/ccdc.log")}</div><p>Rotating diagnostic log. OAuth tokens, callback codes, and account identifiers are redacted.</p></div></div>${errs.length ? `<div class="warning-box">${errs.map(esc).join("<br>")}</div>` : ""}<div class="section"><h2>Provider status</h2>${providerStatusTable()}</div><div class="section"><h2>Market-data resolution</h2>${table(
    [
      "Symbol",
      "Expiration",
      "Strike",
      "Stock source",
      "Price",
      "Option source",
      "Delta",
      "Quote attempts",
      "Option attempts",
    ],
    rows.map((x) => {
      let p =
        (S.positions || []).find(
          (r) =>
            r.symbol === x.symbol &&
            r.expiration === x.expiration &&
            Number(r.strike) === Number(x.strike),
        ) || {};
      return `<tr><td><b>${esc(x.symbol)}</b></td><td>${expiration(x.expiration)}</td><td>${money(x.strike)}</td><td>${esc(x.quote_source)}</td><td>${p.current_price == null ? "—" : money(p.current_price)}</td><td>${esc(x.option_source)}</td><td>${num(p.delta)}</td><td class="diag-text">${esc(x.quote_attempts || "")}</td><td class="diag-text">${esc(x.option_attempts || "")}</td></tr>`;
    }),
    { schema: "marketResolution" },
  )}</div>`;
}
function rollContractKey(account, symbol, expirationDate, strike) {
  return [account || "", symbol || "", expirationDate || "", Number(strike || 0).toFixed(3)].join("|");
}
function rollLineageTree(rolls, contracts) {
  const nodes = new Map(), children = new Map(), incoming = new Set(), outcomes = new Map();
  const addOutcome = (contract) => {
    const key = rollContractKey(contract.account, contract.symbol, contract.expiration, contract.strike);
    if (!outcomes.has(key)) outcomes.set(key, []);
    outcomes.get(key).push(contract);
    if (!nodes.has(key)) nodes.set(key, { account: contract.account, symbol: contract.symbol, expiration: contract.expiration, strike: contract.strike, contracts: 0, fromRoll: false });
    if (!nodes.get(key).fromRoll) nodes.get(key).contracts += Number(contract.contracts || 0);
  };
  (rolls || []).forEach((roll) => {
    const oldKey = rollContractKey(roll.account, roll.symbol, roll.old_expiration, roll.old_strike);
    const newKey = rollContractKey(roll.account, roll.symbol, roll.new_expiration, roll.new_strike);
    nodes.set(oldKey, { account: roll.account, symbol: roll.symbol, expiration: roll.old_expiration, strike: roll.old_strike, contracts: roll.contracts, fromRoll: true });
    nodes.set(newKey, { account: roll.account, symbol: roll.symbol, expiration: roll.new_expiration, strike: roll.new_strike, contracts: roll.contracts, fromRoll: true });
    if (!children.has(oldKey)) children.set(oldKey, []);
    children.get(oldKey).push({ roll, childKey: newKey });
    incoming.add(newKey);
  });
  (contracts || []).forEach(addOutcome);
  const terminalLabel = (key) => {
    const outcome = (outcomes.get(key) || [])[0];
    if ((children.get(key) || []).length) return null;
    if (!outcome) return "Opened / outcome unknown";
    if (outcome.requires_reconciliation) return "Outcome pending";
    if (outcome.status === "OPEN") return "Opened";
    if (outcome.status === "CLOSED") return "Bought to Close";
    return String(outcome.status || "Opened").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  const openingDetails = (node, rows, incomingRoll) => {
    const outcome = rows[0] || {};
    const identity = incomingRoll ? "" : `<span><b>Symbol</b>${esc(node.symbol)}</span><span><b>Contracts</b>${Number(outcome.contracts ?? node.contracts ?? 0)}</span>`;
    return `<div class="roll-contract-details">${identity}<span><b>Expiration</b>${esc(node.expiration)}</span><span><b>Strike</b>${money(node.strike)}</span><span><b>Opened</b>${displayDate(outcome.opened_at || incomingRoll?.date)}</span><span><b>Opening credit/share</b>${outcome.premium_received == null ? (incomingRoll?.sell_to_open == null ? "—" : money(incomingRoll.sell_to_open)) : money(outcome.premium_received)}</span><span><b>Opening fees</b>${outcome.opening_fees == null ? (incomingRoll?.sto_fees == null ? "—" : money(incomingRoll.sto_fees)) : money(outcome.opening_fees)}</span>${incomingRoll ? `<span><b>BTC fill/share</b>${money(incomingRoll.buy_to_close)}</span><span><b>BTC fees</b>${incomingRoll.btc_fees == null ? "—" : money(incomingRoll.btc_fees)}</span><span><b>STO fill/share</b>${money(incomingRoll.sell_to_open)}</span><span><b>STO fees</b>${incomingRoll.sto_fees == null ? "—" : money(incomingRoll.sto_fees)}</span><span><b>Net roll cash</b>${financial(incomingRoll.net_cash_total == null ? incomingRoll.net_credit_total : incomingRoll.net_cash_total)}</span><span><b>Roll date</b>${displayDate(incomingRoll.date)}</span>` : ""}</div>`;
  };
  const terminalDetails = (outcome) => `<div class="roll-contract-details"><span><b>Outcome</b>${esc(outcome?.requires_reconciliation ? "Outcome pending · expiration or assignment not yet identified" : String(outcome?.close_reason || outcome?.status || "Unknown").replaceAll("_", " ").toLowerCase())}</span><span><b>Closed</b>${displayDate(outcome?.closed_at)}</span><span><b>Closing cost/share</b>${outcome?.closing_cost == null ? "—" : money(outcome.closing_cost)}</span><span><b>Closing fees</b>${outcome?.closing_fees == null ? "—" : money(outcome.closing_fees)}</span><span><b>Contract-stage P/L</b>${outcome?.realized_premium == null ? "—" : financial(outcome.realized_premium)}</span></div>`;
  const contractEventHeader = (node, eventLabel, disclosure = false, lifecyclePnl = null) => `<div class="roll-contract"><span class="${disclosure ? "disclosure-toggle" : "tree-toggle"}" aria-hidden="true">${disclosure ? "" : "•"}</span><span class="pill ${eventLabel === "ROLLED" ? "yellow" : "gray"}">${esc(eventLabel)}</span><b>${esc(node.symbol)} ${expiration(node.expiration)} · ${money(node.strike)}</b>${lifecyclePnl == null ? "" : `<span class="lifecycle-root-pnl"><b>Net lifecycle P/L</b>${financial(lifecyclePnl)}</span>`}</div>`;
  const renderContractEvent = (key, eventLabel, incomingRoll = null) => {
    const node = nodes.get(key), outcomeRows = outcomes.get(key) || [];
    if (!node) return "";
    return `<div class="roll-tree-node">${contractEventHeader(node, eventLabel)}${openingDetails(node, outcomeRows, incomingRoll)}</div>`;
  };
  const renderTerminalEvents = (key) => {
    const node = nodes.get(key), terminal = terminalLabel(key);
    if (!node || !terminal || terminal === "Opened" || terminal === "Opened / outcome unknown") return "";
    return (outcomes.get(key) || []).map((outcome) => `<div class="lifecycle-step"><div class="roll-tree-node"><div class="roll-contract"><span class="tree-toggle" aria-hidden="true">•</span><span class="pill ${cls(terminal.toUpperCase())}">${esc(terminal.toUpperCase())}</span><b>${esc(node.symbol)} ${expiration(node.expiration)} · ${money(node.strike)}</b></div>${terminalDetails(outcome)}</div></div>`).join("");
  };
  const renderProgression = (key, path = new Set()) => {
    if (path.has(key)) return '<div class="warning-box">Cycle detected in roll history.</div>';
    const nextPath = new Set(path); nextPath.add(key);
    const edges = children.get(key) || [];
    if (!edges.length) return renderTerminalEvents(key);
    return edges.map(({ roll, childKey }) => `<div class="lifecycle-step">${renderContractEvent(childKey, "ROLLED", roll)}</div>${renderProgression(childKey, nextPath)}`).join("");
  };
  const lifecycleRootLabel = (key, path = new Set()) => {
    if (path.has(key)) return "OPENED";
    const nextPath = new Set(path); nextPath.add(key);
    const edges = children.get(key) || [];
    if (edges.length) return edges.some(({ childKey }) => lifecycleRootLabel(childKey, nextPath) === "CLOSED") ? "CLOSED" : "OPENED";
    const terminal = terminalLabel(key);
    return terminal && terminal !== "Opened" && terminal !== "Opened / outcome unknown" && terminal !== "Outcome pending" ? "CLOSED" : "OPENED";
  };
  const lifecycleEventCount = (key, path = new Set()) => {
    if (path.has(key)) return 0;
    const nextPath = new Set(path); nextPath.add(key);
    const edges = children.get(key) || [];
    if (edges.length) return 1 + edges.reduce((sum, { childKey }) => sum + lifecycleEventCount(childKey, nextPath), 0);
    const terminal = terminalLabel(key);
    return 1 + (terminal && terminal !== "Opened" && terminal !== "Opened / outcome unknown" ? (outcomes.get(key) || []).length : 0);
  };
  const lifecycleTotalPnl = (key, path = new Set()) => {
    if (path.has(key)) return 0;
    const nextPath = new Set(path); nextPath.add(key);
    const ownValues = (outcomes.get(key) || []).filter((row) => row.realized_premium != null).map((row) => Number(row.realized_premium));
    let total = ownValues.reduce((sum, value) => sum + value, 0);
    const edges = children.get(key) || [];
    for (const { childKey } of edges) total += lifecycleTotalPnl(childKey, nextPath);
    return ownValues.length || edges.length ? total : null;
  };
  const roots = [...nodes.keys()].filter((key) => !incoming.has(key));
  const expired = (contracts || []).filter((row) => row.status === "EXPIRED").reduce((sum, row) => sum + Number(row.contracts || 0), 0);
  const assigned = (contracts || []).filter((row) => row.status === "ASSIGNED").reduce((sum, row) => sum + Number(row.contracts || 0), 0);
  const rolledContracts = (rolls || []).reduce((sum, row) => sum + Number(row.contracts || 0), 0);
  const metrics = `<div class="summary-cards summary-cards-4"><div class="card"><div class="label">Detected roll events</div><div class="value">${rolls.length}</div><p>Linked BTC/STO transactions.</p></div><div class="card"><div class="label">Rolled contract-events</div><div class="value">${rolledContracts}</div><p>A contract rolled more than once is counted each time.</p></div><div class="card"><div class="label">Expired unassigned</div><div class="value">${expired}</div><p>Contracts with a confirmed expired outcome.</p></div><div class="card"><div class="label">Assigned</div><div class="value">${assigned}</div><p>Contracts with a confirmed assignment outcome.</p></div></div>`;
  roots.sort((a, b) => String(nodes.get(b)?.expiration || "").localeCompare(String(nodes.get(a)?.expiration || "")) || String((outcomes.get(b) || [])[0]?.opened_at || "").localeCompare(String((outcomes.get(a) || [])[0]?.opened_at || "")));
  const renderLifecycle = (key) => {
    const node = nodes.get(key);
    const progression = renderProgression(key);
    const rootLabel = lifecycleRootLabel(key), expanded = rootLabel !== "CLOSED" || lifecycleEventCount(key) > 2;
    return `<details class="roll-chain"${expanded ? " open" : ""}><summary>${contractEventHeader(node, rootLabel, true, rootLabel === "CLOSED" ? lifecycleTotalPnl(key) : null)}</summary><div class="roll-tree">${openingDetails(node, outcomes.get(key) || [], null)}${progression ? `<div class="lifecycle-waterfall">${progression}</div>` : ""}</div></details>`;
  };
  const accountRoots = new Map();
  roots.forEach((key) => {
    const account = nodes.get(key)?.account || "Unknown account";
    const source = (outcomes.get(key) || [])[0]?.source || "Schwab";
    const groupKey = `${account}\u0000${source}`;
    if (!accountRoots.has(groupKey)) accountRoots.set(groupKey, { account, source, keys: [] });
    accountRoots.get(groupKey).keys.push(key);
  });
  const trees = accountRoots.size ? [...accountRoots.values()].sort((a, b) => String(a.account).localeCompare(String(b.account)) || String(a.source).localeCompare(String(b.source))).map((group) => `<section class="account-lifecycle"><h3><span>Account ${esc(maskAccount(group.account))}</span><span class="account-source">Source: ${esc(group.source)}</span></h3>${group.keys.map(renderLifecycle).join("")}</section>`).join("") : '<div class="empty">No covered-call lifecycle records are available.</div>';
  return `${metrics}<p class="muted">Lifecycle waterfalls are grouped by account. Each starts with the opening sale and follows detected rolls to the latest confirmed outcome. These are contract-events, not unique shares or tax lots.</p>${trees}`;
}
function history() {
  let c = D.contract_history?.contracts || [],
    m = D.premium_history?.months || [],
    t = D.transactions?.transactions || [],
    a = D.schwab_activity || [],
    rolls = D.schwab_detected_rolls || [],
    errs = D.schwab_activity_errors || [];
  let rollBlock = `<h2>Covered calls lifecycle</h2><p class="muted">Opening credits are received when Schwab fills each Sell to Open order. Expand a lifecycle to see every preserved contract detail and detected roll transition.</p>${rollLineageTree(rolls, c)}`;
  let activityBlock = `<div class="section"><h2>Recent filled option activity</h2><p class="muted">Read directly from provider order history. This includes contracts that were opened and closed today, not only positions that remain open.</p>${errs.length ? `<div class="warning-box">${errs.map(esc).join("<br>")}</div>` : ""}${accountGroupedTable(a,
    [
      "Date",
      "Symbol",
      "Action",
      "Contracts",
      "Expiration",
      "Strike",
      "Fill price",
      "Status",
    ],
    (x) => `<tr><td>${displayDate(x.date)}</td><td><b>${esc(x.symbol)}</b></td><td>${esc(x.action)}</td><td>${x.contracts}</td><td>${expiration(x.expiration)}</td><td>${money(x.strike)}</td><td>${money(x.price)}</td><td>${esc(x.status)}</td></tr>`, false, "history-recent-activity", { schema: "recentOptionActivity" },
  )}</div>`;
  return `${rollBlock}${activityBlock}<div class="section"><h2>Persistent option transactions</h2>${accountGroupedTable(t,
    [
      "Date",
      "Symbol",
      "Action",
      "Contracts",
      "Expiration",
      "Strike",
      "Price/share",
    ],
    (x) => `<tr><td>${displayDate(x.date)}</td><td><b>${esc(x.symbol)}</b></td><td>${esc(x.action)}</td><td>${x.contracts}</td><td>${expiration(x.expiration)}</td><td>${money(x.strike)}</td><td>${money(x.price)}</td></tr>`, false, "history-persistent-transactions", { schema: "optionTransactions" },
  )}</div><div class="section"><h2>Monthly option cash flow</h2><p class="muted">Signed gross option principal in each trade month, matching Schwab’s transaction convention: STO fills are positive deposits and BTC fills are negative withdrawals. Net option cash flow is STO deposits plus BTC withdrawals. Reported fees are listed separately and excluded. Expiration in a later month does not move the original credit into that month.</p>${table(
    [
      "Month",
      "STO deposits",
      "BTC withdrawals",
      "Fees included",
      "Net option cash flow",
      "Monthly target",
      "Target progress",
    ],
    m.map(
      (x) =>
        `<tr><td>${esc(x.month)}</td><td>${financial(x.sto_cash_received ?? x.premium_received)}</td><td>${withdrawal(x.btc_cash_paid ?? x.closing_costs)}</td><td>${financial(x.fees || 0)}</td><td>${financial(x.net_cash_flow ?? x.realized_premium)}</td><td>${financial(x.target)}</td><td>${pct(x.target_progress)}</td></tr>`,
    ),
    { schema: "monthlyOptionCashFlow" },
  )}</div><div class="section"><h2>Contract outcomes finalized by month</h2><p class="muted">Signed lifecycle P/L is classified when Schwab confirms how contracts ended. Positive values are retained option income; negative values are lifecycle losses where BTC cost exceeded the applicable opening STO credit. These outcomes explain contract performance and are not additional cash received in the finalization month.</p>${table(
    ["Month", "BTC-closed lifecycle P/L", "Expired lifecycle P/L", "Assigned lifecycle P/L", "Total finalized lifecycle P/L"],
    m.filter((x) => x.finalized_pnl || x.bought_back_pnl || x.expired_pnl || x.assigned_pnl).map(
      (x) => `<tr><td>${esc(x.month)}</td><td>${financial(x.bought_back_pnl || 0)}</td><td>${financial(x.expired_pnl || 0)}</td><td>${financial(x.assigned_pnl || 0)}</td><td>${financial(x.finalized_pnl || 0)}</td></tr>`,
    ),
    { schema: "finalizedOutcomes" },
  )}</div>`;
}
function decisionRulesTable() {
  let r = D.settings?.decision_rules || {};
  let rows = [
    ["GREEN", "Risk score 0–" + r.green_max, "No immediate action"],
    [
      "YELLOW",
      "Risk score " + (r.green_max + 1) + "–" + r.yellow_max,
      "Monitor daily and price roll choices",
    ],
    [
      "RED",
      "Risk score " + r.red_min + "–100",
      "Evaluate roll or assignment decision",
    ],
    [
      "Urgent",
      "DTE ≤ " + r.urgent_dte + " with high delta or ITM",
      "Decide today",
    ],
    [
      "Roll target",
      "Delta " + r.target_roll_delta_min + "–" + r.target_roll_delta_max,
      "Screened from the Schwab option chain",
    ],
  ];
  return table(
    ["Rule", "Threshold", "Meaning"],
    rows.map(
      (x) =>
        `<tr><td><span class="pill ${x[0].toLowerCase().includes("green") ? "green" : x[0].toLowerCase().includes("yellow") ? "yellow" : x[0].toLowerCase().includes("red") || x[0] == "Urgent" ? "red" : "gray"}">${esc(x[0])}</span></td><td>${esc(x[1])}</td><td>${esc(x[2])}</td></tr>`,
    ),
    { schema: "decisionRules" },
  );
}
function setup() {
  let a = D.settings?.app || {},
    f = D.settings?.files || {};
  let items = [
    ["Application", a.name],
    ["Version", appVersion],
    ["Mode", a.mode === "demo" ? "Schwab (Demo)" : "Schwab"],
    ["Monthly income target", money(a.monthly_income_target)],
    ["Default account", a.default_account],
    ["System of record", a.mode === "schwab" ? "Schwab" : "Synthetic demo scenario"],
    ["Demo scenario", f.demo_scenario || f.demo_positions],
    ["Snapshot cache", f.snapshot],
    ["Diagnostics cache", f.diagnostics],
    ["Contract history", f.contract_history],
    ["Premium history", f.premium_history],
    ["Roll queue", f.rolls],
    ["Expiration confirmations", f.expirations],
    ["Transaction history", f.transactions],
  ];
  const settingsTable = table(
    ["Setting", "Value"],
    items.map(
      (x) => `<tr><td>${esc(x[0])}</td><td class="mono">${esc(x[1])}</td></tr>`,
    ),
    { schema: "applicationSettings" },
  );
  return `<div class="section"><h2>Application setup</h2>${settingsTable}</div><div class="section"><h2>Decision Rules</h2><p class="muted section-intro">Current thresholds from the preserved <span class="mono">settings.decision_rules</span> configuration.</p>${decisionRulesTable()}</div>`;
}
function security() {
  const demo = D.settings?.app?.mode === "demo";
  return `<div class="summary-cards summary-cards-3"><div class="card"><div class="label">Execution</div><div class="value">Read only</div><p>Order submission is disabled by design.</p></div><div class="card"><div class="label">Storage</div><div class="value">Local Mac</div><p>JSON, HTML and logs stay local. ${demo ? "Demo mode uses no brokerage credentials or tokens." : "Schwab secrets and OAuth tokens are stored in macOS Keychain."}</p></div><div class="card"><div class="label">Credentials</div><div class="value">${demo ? "Not used" : "Never rendered"}</div><p>${demo ? "Synthetic demo refresh never initializes the Schwab API client." : "The Client Secret and Schwab OAuth tokens are excluded from JSON and dashboard data."}</p></div></div><div class="section card"><h2>Security checklist</h2><p>Keep <span class="mono">config/settings.json</span> private. Do not email or commit it. Use macOS account security and encrypted backups. PortfolioPilot does not transmit orders.</p></div>`;
}
const views = {
  "Morning Brief": brief,
  Recommendations: recommendations,
  "Roll Advisor": rollAdvisor,
  Positions: positions,
  History: history,
  Policy: policy,
  Diagnostics: diagnostics,
  Setup: setup,
  Security: security,
};
function commandStatusBar(tab) {
  const clock=S.market_clock || {};
  const mode=demoMode ? "Schwab Demo" : "Schwab Live";
  return `<div class="command-statusbar"><span class="command-live-dot ${String(clock.session || "").toLowerCase() === "open" ? "market-open" : ""}" aria-hidden="true"></span><b>${esc(clock.session || "Market status unknown")}</b><span>${esc(clock.now_market || clock.market_date || "")}</span><span class="command-status-separator"></span><span>${esc(mode)}</span><span>Data ${esc(displayRefreshTime(S.generated_at))}</span></div>`;
}
function show(t) {
  [...nav.children].forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === t),
  );
  content.innerHTML = `${commandStatusBar(t)}<div class="pp-page-header"><div><span class="pp-page-kicker">PortfolioPilot</span><h2>${esc(t)}</h2><p>${esc(tabDescriptions[t] || "")}</p></div><span class="pp-page-version">v${esc(appVersion)}</span></div><div class="command-surface">${views[t]()}</div>`;
  location.hash = t.replaceAll(" ", "-").toLowerCase();
  bindDisclosures();
  bindResizableTables();
  if (t === "Morning Brief") bindBriefCalendar();
  if (t === "Roll Advisor") bindRollAdvisorRefresh();
}
tabs.forEach((t) => {
  let b = document.createElement("button");
  b.type = "button";
  b.dataset.tab = t;
  b.title = t;
  b.innerHTML = `<span class="nav-marker" aria-hidden="true">${esc(tabIcons[t] || "•")}</span><span>${esc(t)}</span>`;
  b.onclick = () => show(t);
  nav.appendChild(b);
});
let start =
  tabs.find(
    (t) => t.replaceAll(" ", "-").toLowerCase() === location.hash.slice(1),
  ) || tabs[0];
show(start);

// v0.7.2 local HTTPS refresh controller. This is enabled only when served by CCDC.
(function initLocalRefresh() {
  const button = document.getElementById("refreshButton");
  const buttonLabel = button?.querySelector(".refresh-button-label");
  const status = document.getElementById("refreshStatus");
  const token = document.querySelector('meta[name="ccdc-csrf"]')?.content;
  if (!button || !status) return;
  const setButtonText = (text) => {
    if (buttonLabel) buttonLabel.textContent = text;
    else button.textContent = text;
  };
  if (demoMode) {
    button.hidden = false;
    button.disabled = true;
    button.classList.add("demo-data");
    setButtonText("Demo Data");
    button.title = "Synthetic demo data; run demo.command to regenerate the rolling-date scenario.";
    setTimeout(() => {
      status.textContent = "Offline synthetic data — no Schwab connection.";
      status.className = "refresh-status";
    }, 0);
    return;
  }
  if (!token || location.protocol !== "https:") return;
  button.hidden = false;
  let timer = null;
  let nextAutomaticRefresh = null;
  let autoRefreshMinutes = 10;
  let marketSession = "CLOSED";
  let healthCheckDue = 0;
  const setState = (text, kind = "") => {
    status.textContent = text;
    status.className = "refresh-status " + kind;
  };
  const poll = async () => {
    try {
      const response = await fetch("/api/refresh/status", {
        cache: "no-store",
      });
      const job = await response.json();
      if (job.state === "running") {
        button.disabled = true;
        setButtonText("Refreshing…");
        button.removeAttribute("data-countdown");
        setState(job.phase || "Refreshing Schwab data…");
        timer = setTimeout(poll, 1000);
        return;
      }
      button.disabled = false;
      setButtonText("Refresh Data");
      if (job.state === "complete") {
        setState(
          `Updated successfully${job.duration_seconds != null ? " in " + job.duration_seconds + "s" : ""}. Reloading…`,
          "success",
        );
        setTimeout(() => location.reload(), 450);
        return;
      }
      if (job.state === "failed")
        setState(
          job.error || "Refresh failed. Review Diagnostics and logs/ccdc.log.",
          "error",
        );
      if (job.state === "failed")
        nextAutomaticRefresh = Date.now() + autoRefreshMinutes * 60_000;
    } catch (err) {
      button.disabled = false;
      setButtonText("Refresh Data");
      setState("Local PortfolioPilot server is unavailable.", "error");
    }
  };
  const startRefresh = async () => {
    if (timer) clearTimeout(timer);
    button.disabled = true;
    setButtonText("Starting…");
    button.removeAttribute("data-countdown");
    setState("Starting secure local refresh…");
    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "X-CCDC-CSRF": token, "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok && response.status !== 409)
        throw new Error(body.error || "Refresh request failed.");
      poll();
    } catch (err) {
      button.disabled = false;
      setButtonText("Refresh Data");
      setState(err.message || "Refresh failed.", "error");
      nextAutomaticRefresh = Date.now() + autoRefreshMinutes * 60_000;
    }
  };
  const updateScheduleLabel = () => {
    if (marketSession !== "REGULAR" || button.disabled) {
      if (!button.disabled) setButtonText("Refresh Data");
      button.removeAttribute("data-countdown");
      button.title = "Refresh Schwab data now.";
      return;
    }
    if (!nextAutomaticRefresh)
      nextAutomaticRefresh = Date.now() + autoRefreshMinutes * 60_000;
    const seconds = Math.max(0, Math.ceil((nextAutomaticRefresh - Date.now()) / 1000));
    const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    setButtonText("Refresh Data");
    button.dataset.countdown = countdown;
    button.title = `Refresh Schwab data now. Automatic market-hours refresh in ${countdown}.`;
    if (seconds === 0) {
      nextAutomaticRefresh = Date.now() + autoRefreshMinutes * 60_000;
      startRefresh();
    }
  };
  const refreshMarketSession = async () => {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) return null;
      const health = await response.json();
      marketSession = String(health.market_session || "CLOSED");
      autoRefreshMinutes = Math.max(1, Number(health.market_hours_auto_refresh_minutes || 10));
      if (marketSession !== "REGULAR") nextAutomaticRefresh = null;
      return health;
    } catch (_) {
      marketSession = "CLOSED";
      return null;
    }
  };
  const scheduleTick = async () => {
    if (Date.now() >= healthCheckDue) {
      await refreshMarketSession();
      healthCheckDue = Date.now() + 30_000;
    }
    updateScheduleLabel();
    setTimeout(scheduleTick, 1000);
  };
  button.addEventListener("click", startRefresh);
  fetch("/api/health", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((health) => {
      marketSession = String(health.market_session || "CLOSED");
      autoRefreshMinutes = Math.max(1, Number(health.market_hours_auto_refresh_minutes || 10));
      healthCheckDue = Date.now() + 30_000;
      scheduleTick();
      if (health.refresh_on_first_page_load && health.refresh_generation === 0) {
        startRefresh();
      } else {
        setState("Secure local server connected.");
      }
    })
    .catch(() => {
      button.hidden = true;
      setState("");
    });
})();
