export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split(".");
  const parts2 = v2.split(".");

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parseInt(parts1[i] || "0", 10);
    const p2 = parseInt(parts2[i] || "0", 10);

    if (!isNaN(p1) && !isNaN(p2)) {
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    } else {
      const str1 = parts1[i] || "";
      const str2 = parts2[i] || "";
      const strCompare = str1.localeCompare(str2);
      if (strCompare !== 0) return strCompare;
    }
  }

  return 0;
};

export const sanitizeSearchString = (inputString: string): string => {
  if (!inputString) return "";
  return inputString
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};
