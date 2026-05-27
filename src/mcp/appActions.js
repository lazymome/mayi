export const createTapnowActionResult = (ok, payload = {}) => ({
  ok,
  ...payload,
});

export const normalizeToolNumber = (value, fallback) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const normalizeToolString = (value, fallback = "") => {
  const next = String(value ?? "").trim();
  return next || fallback;
};

export const normalizeToolArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
