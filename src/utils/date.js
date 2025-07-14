export const toDateSafe = (value, fallback = new Date()) => {
  if (!value) return fallback;               // null / undefined
  if (value instanceof Date) return value;   // already Date
  if (typeof value.toDate === "function") {  // Firestore Timestamp
    return value.toDate();
  }
  return new Date(value);                    // string | number
};
