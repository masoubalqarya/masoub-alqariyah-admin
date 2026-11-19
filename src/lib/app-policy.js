export function versionParts(version) {
  return typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version)
    ? version.split(".").map(Number) : null;
}

export function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function validPolicy(policy, platform) {
  if (!policy || !["off", "optional", "forced"].includes(policy.mode)) return false;
  if (policy.mode === "off") return true;
  if (!versionParts(policy.version)) return false;
  try {
    const url = new URL(policy.url);
    return url.protocol === "https:" && !url.username && !url.password &&
      (platform === "ios"
        ? url.hostname === "apps.apple.com" && /\/id\d+/.test(url.pathname)
        : platform === "android" && url.hostname === "play.google.com" && url.pathname === "/store/apps/details" && !!url.searchParams.get("id"));
  } catch { return false; }
}

export function requiredUpdate(policy, platform, currentVersion) {
  return validPolicy(policy, platform) && policy.mode !== "off" &&
    compareVersions(currentVersion, policy.version) === -1;
}
