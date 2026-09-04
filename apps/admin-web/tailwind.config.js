/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Satoshi', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
                'primary-dark': 'rgb(var(--primary-dark-rgb) / <alpha-value>)',
                border: '#e2e8f0',
                card: 'rgb(var(--card-rgb, 255 255 255) / <alpha-value>)',
            },
            boxShadow: {
                'glow-sky': '0 0 25px -5px rgba(14, 165, 233, 0.15)',
                'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.15)',
                'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.15)',
            },
        },
    },
    plugins: [],
};

