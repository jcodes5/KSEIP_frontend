/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      colors: {
        accent: {
          500: '#FF6B35',
        },
        ministry: {
          50: "#f0f8f3",
          100: "#d9ecdf",
          500: "#1A6B3C",
          700: "#104527",
          900: "#082415"
        },
        leaf: {
          400: "#5DCAA5",
          600: "#1D9E75"
        },
        field: {
          100: "#EAF3DE",
          500: "#639922"
        }
      },
      boxShadow: {
        panel: "0 18px 45px rgba(26, 107, 60, 0.08)"
      }
    }
  },
  plugins: []
};

