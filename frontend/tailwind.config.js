export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    forest: { 50: "#f0f7f1", 100: "#dcece0", 500: "#2f7d4a", 600: "#256b3d", 700: "#1d5632", 800: "#16422a", 900: "#0f2e1d" },
    leaf: { 400: "#6cc070", 500: "#4daa57" }, cream: "#faf7f0", amber: { 500: "#d9921b", 600: "#b87710" } },
    fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] } } },
};
