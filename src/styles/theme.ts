// Mupa Theme Configuration
export const theme = {
  colors: {
    // Brand colors - Mupa cyan/electric blue
    primary: "hsl(196 96% 46%)",
    primaryDark: "hsl(224 38% 7%)",
    primaryGlow: "hsl(192 100% 62%)",
    accent: "hsl(218 94% 49%)",
    secondary: "hsl(220 20% 92%)",
    
    // Surfaces
    background: "hsl(224 38% 7%)",
    foreground: "hsl(220 20% 96%)",
    card: "hsl(224 34% 10%)",
    sidebar: "hsl(224 36% 10%)",
    
    // Utility
    muted: "hsl(224 24% 14%)",
    mutedForeground: "hsl(220 14% 64%)",
    border: "hsl(224 30% 16%)",
    grayLight: "hsl(220 18% 88%)",
    
    // Semantic
    success: "hsl(152 70% 48%)",
    warning: "hsl(38 96% 58%)",
    destructive: "hsl(358 78% 56%)",
  },
  
  // RGB versions for framer-motion
  rgb: {
    primary: { r: 8, g: 145, b: 178 },
    accent: { r: 8, g: 92, b: 240 },
    cyan: { r: 175, g: 233, b: 253 }, // #AFE9FD
  }
};

// Helper to convert HSL to RGB for framer-motion
export const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return { r, g, b };
};
