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
                sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'var(--ring)',
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                primary: {
                    DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
                    dark: 'rgb(var(--primary-dark-rgb) / <alpha-value>)',
                    foreground: 'var(--primary-foreground)'
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    foreground: 'var(--secondary-foreground)'
                },
                destructive: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)'
                },
                muted: {
                    DEFAULT: 'var(--muted)',
                    foreground: 'var(--muted-foreground)'
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    foreground: 'var(--accent-foreground)'
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)'
                },
                card: {
                    DEFAULT: 'var(--card)',
                    foreground: 'var(--card-foreground)'
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            }
        },
    },
    plugins: [],
};
