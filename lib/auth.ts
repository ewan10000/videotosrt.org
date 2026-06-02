"use client";

import type { ApiUser } from "@/lib/api";

const AUTH_USER_KEY = "videotosrt.auth.user";
const AUTH_CHANGE_EVENT = "videotosrt:auth-change";

export type AuthUserResponse = ApiUser | { user?: ApiUser | null } | null;

export function normalizeUser(data: AuthUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  if ("user" in data) {
    return data.user ?? null;
  }

  return data as ApiUser;
}

export function getLocalUser(): ApiUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ApiUser;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setLocalUser(user: ApiUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }

  window.dispatchEvent(new CustomEvent<ApiUser | null>(AUTH_CHANGE_EVENT, { detail: user }));
}

export function onAuthChange(callback: (user: ApiUser | null) => void) {
  function handleChange(event: Event) {
    callback((event as CustomEvent<ApiUser | null>).detail ?? getLocalUser());
  }

  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

  return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
}
