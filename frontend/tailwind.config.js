import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f0ff",
          100: "#e6e1ff",
          400: "#8f7bff",
          500: "#7a5cff",
          600: "#6842f5",
          700: "#5732d1",
        },
      },
    },
  },
  plugins: [typography],
};
