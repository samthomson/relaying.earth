import { type Theme } from "@/contexts/AppContext";

/**
 * Theme is fixed to light — this hook is kept for API compatibility.
 * @returns Always "light" and a no-op setter.
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  return {
    theme: "light",
    setTheme: () => {},
  };
}
