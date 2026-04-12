export function useTheme() {
  return { theme: "light" as const, toggle: () => {}, isDark: false };
}
