import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export function useAuth() {
  const ctx = useContext(AuthContext);

  return {
    user: ctx.user,
    loading: ctx.loading,
    refresh: ctx.refresh,
    login: () => {
      window.location.href = "/auth/login";
    },
    logout: () => {
      window.location.href = "/auth/logout";
    },
  };
}
