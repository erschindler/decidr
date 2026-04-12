export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  console.log("[Intent] Redirecting:", path, "initial:", initial);
  return '/';
}

