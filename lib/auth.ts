"use client";

import { useEffect, useState } from "react";
import { api, type ApiUser } from "@/lib/api";

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
    callback("detail" in event ? (event as CustomEvent<ApiUser | null>).detail : getLocalUser());
  }

  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

  return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
}

export async function refreshAuthUser(): Promise<ApiUser | null> {
  try {
    const user = normalizeUser(
      await Promise.race([
        api.me(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Auth refresh timeout")), 3000)
        ),
      ])
    );
    setLocalUser(user);
    return user;
  } catch {
    setLocalUser(null);
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("videotosrt.auth.session_token");
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    console.log("[Auth] Saving token to localStorage");
    window.localStorage.setItem("videotosrt.auth.session_token", token);
  } else {
    console.log("[Auth] Removing token from localStorage");
    window.localStorage.removeItem("videotosrt.auth.session_token");
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function useAuthUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const removeAuthListener = onAuthChange((nextUser) => {
      if (mounted) {
        setUser(nextUser);
      }
    });

    refreshAuthUser()
      .then((nextUser) => {
        if (mounted) {
          setUser(nextUser);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      removeAuthListener();
    };
  }, []);

  return { user, loading, setUser };
}
