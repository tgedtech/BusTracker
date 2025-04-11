/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html",
      "./client/devPanel.html"
    ],
    theme: {
      extend: {},
    },
    plugins: [require("daisyui")],
  };