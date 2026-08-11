(function updateStaticDemoDates() {
  const data = window.CCDC_DATA;
  const snapshot = data?.snapshot;
  const anchorText = snapshot?.market_clock?.market_date;
  if (!data || !anchorText) return;

  const marketParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  const todayText = `${marketParts.year}-${marketParts.month}-${marketParts.day}`;
  const anchor = new Date(`${anchorText}T12:00:00Z`);
  const today = new Date(`${todayText}T12:00:00Z`);
  const dayMs = 86400000;
  const dayShift = Math.round((today - anchor) / dayMs);
  const anchorMonth = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth();
  const currentMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const monthShift = currentMonth - anchorMonth;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T/;
  const monthPattern = /^\d{4}-\d{2}$/;

  function isoDate(value) {
    return value.toISOString().slice(0, 10);
  }
  function shiftMonth(value) {
    const [year, month] = value.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, month - 1 + monthShift, 1));
    return shifted.toISOString().slice(0, 7);
  }
  function nextFriday(value) {
    const shifted = new Date(value);
    shifted.setUTCDate(shifted.getUTCDate() + ((5 - shifted.getUTCDay() + 7) % 7));
    return shifted;
  }
  function shiftDate(value, key) {
    const original = new Date(`${value}T12:00:00Z`);
    const offset = Math.round((original - anchor) / dayMs);
    let shifted = new Date(today);
    shifted.setUTCDate(shifted.getUTCDate() + offset);
    if (key === "expiration" || key === "projected_expiration") shifted = nextFriday(shifted);
    if (key === "review_date" && shifted.getUTCDay() === 6) shifted.setUTCDate(shifted.getUTCDate() + 2);
    if (key === "review_date" && shifted.getUTCDay() === 0) shifted.setUTCDate(shifted.getUTCDate() + 1);
    return isoDate(shifted);
  }
  function shiftTimestamp(value) {
    const shifted = new Date(value);
    shifted.setUTCDate(shifted.getUTCDate() + dayShift);
    return shifted.toISOString();
  }
  function visit(value, key = "") {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([childKey, child]) => {
      if (typeof child === "string" && datePattern.test(child)) {
        value[childKey] = shiftDate(child, childKey);
      } else if (typeof child === "string" && timestampPattern.test(child)) {
        value[childKey] = shiftTimestamp(child);
      } else if (typeof child === "string" && monthPattern.test(child) && childKey === "month") {
        value[childKey] = shiftMonth(child);
      } else {
        visit(child, childKey);
      }
    });
    if (typeof value.expiration === "string" && Object.hasOwn(value, "dte")) {
      value.dte = Math.round((new Date(`${value.expiration}T12:00:00Z`) - today) / dayMs);
    }
  }

  visit(data);
  const now = new Date().toISOString();
  data.snapshot.generated_at = now;
  if (data.diagnostics) data.diagnostics.generated_at = now;
  if (data.provider_status) data.provider_status.generated_at = now;
  if (data.recommendations) data.recommendations.generated_at = now;
  const clock = data.snapshot.market_clock || {};
  clock.market_date = todayText;
  clock.now_utc = now;
  clock.now_market = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", dateStyle: "medium", timeStyle: "long",
  }).format(new Date());
  clock.session = "DEMO";
  if (data.diagnostics) data.diagnostics.market_clock = {...clock};
  window.PORTFOLIOPILOT_STATIC_DEMO = {anchor_date: anchorText, rendered_market_date: todayText};
})();
