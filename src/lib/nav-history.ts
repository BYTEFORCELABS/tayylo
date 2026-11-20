"use client";

// Tracks in-app navigation so Back can return to the screen the user really
// came from (like a native app), and fall back to a parent route when the
// screen was opened directly (deep link, refresh, new tab).

const KEY = "tayylo-nav-stack";
const MAX = 50;

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(stack: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX)));
  } catch {}
}

export function recordNavigation(path: string) {
  const stack = read();
  if (stack[stack.length - 1] === path) return;
  // Returning to the previous entry is a back navigation: pop instead of push.
  if (stack[stack.length - 2] === path) stack.pop();
  else stack.push(path);
  write(stack);
}

/** The in-app screen before this one, if there is one. */
export function previousPath(): string | undefined {
  const stack = read();
  return stack.length > 1 ? stack[stack.length - 2] : undefined;
}
