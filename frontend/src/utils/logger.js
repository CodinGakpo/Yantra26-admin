const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === "true";

export function log(...args) {
  if (ENABLE_LOGS) {
    console.log(...args);
  }
}
