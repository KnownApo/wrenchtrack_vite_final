/** @type {import('tailwindcss').Config} */
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        brand: {
          50:  "#e9f5ff",
          100: "#d0eaff",
          200: "#a0d5ff",
          300: "#70c0ff",
          400: "#40abff",
          500: "#0096ff",
          600: "#0077cc",
          700: "#005999",
          800: "#003b66",
          900: "#001d33",
        },
      },
      boxShadow: {
        card: "0 4px 15px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [
    forms,
    typography,
  ],
};
