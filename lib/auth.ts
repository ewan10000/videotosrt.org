"use client";

import type { ApiUser, ApiUserResponse } from "@/lib/api";

const AUTH_USER_KEY = "videotosrt.auth.user";
const AUTH_SESSION_TOKEN_KEY = "videotosrt.auth.session_token";
const AUTH_CHANGE_EVENT = "videotosrt:auth-change";
const SESSION_COOKIE = "vts_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_PARAM_NAMES = ["token", "session_token", "sessionToken", "access_token", "auth_token", "jwt"];
const USER_PARAM_NAMES = ["user", "auth_user"];

export type AuthUserResponse = ApiUserResponse;

export function normalizeUser(data: AuthUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  if ("user" in data) {
    return data.user ?? null;
  }

  if ("data" in data) {
    return data.data?.user ?? null;
  }

  return data as ApiUser;
}

export function getUserDisplayName(user: ApiUser | null) {
  if (!user) {
    return "";
  }

  return user.name ?? user.username ?? user.display_name ?? user.full_name ?? user.email ?? "Signed in";
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

export function getSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_SESSION_TOKEN_KEY) ?? "";
}

export function clearSessionToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None`;
}

function getFirstParam(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = params.get(name);
    if (value) {
      return value;
    }
  }

  return "";
}

function deleteParams(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    params.delete(name);
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

function decodeUserParam(value: string): ApiUser | null {
  const candidates = [value];

  try {
    candidates.push(decodeBase64Url(value));
  } catch {
    // Some callbacks send plain JSON, others send base64url JSON.
  }

  for (const candidate of candidates) {
    try {
      const user = JSON.parse(candidate) as ApiUser;
      if (user && typeof user === "object") {
        return user;
      }
    } catch {
      // Try the next encoding.
    }
  }

  return null;
}

export function consumeSessionTokenFromLocation() {
  if (typeof window === "undefined") {
    return false;
  }

  const url = new URL(window.location.href);
  const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(rawHash);
  const searchParams = new URLSearchParams(url.search);
  const token = getFirstParam(hashParams, TOKEN_PARAM_NAMES) || getFirstParam(searchParams, TOKEN_PARAM_NAMES);
  const rawUser = getFirstParam(hashParams, USER_PARAM_NAMES) || getFirstParam(searchParams, USER_PARAM_NAMES);
  const user = rawUser ? decodeUserParam(rawUser) : null;

  if (!token && !user) {
    return false;
  }

  if (token) {
    window.localStorage.setItem(AUTH_SESSION_TOKEN_KEY, token);
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; Secure; SameSite=None`;
  }

  if (user) {
    setLocalUser(user);
  }

  deleteParams(hashParams, TOKEN_PARAM_NAMES);
  deleteParams(hashParams, USER_PARAM_NAMES);
  deleteParams(searchParams, TOKEN_PARAM_NAMES);
  deleteParams(searchParams, USER_PARAM_NAMES);
  url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
  url.search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  window.history.replaceState(window.history.state, "", url.toString());

  return true;
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
