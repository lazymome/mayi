/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tapnow: {
                    bg: "rgb(var(--tapnow-bg) / <alpha-value>)",
                    fg: "rgb(var(--tapnow-fg) / <alpha-value>)",
                    surface: "rgb(var(--tapnow-surface) / <alpha-value>)",
                    "surface-muted": "rgb(var(--tapnow-surface-muted) / <alpha-value>)",
                    border: "rgb(var(--tapnow-border) / <alpha-value>)",
                    muted: "rgb(var(--tapnow-muted) / <alpha-value>)",
                    accent: "rgb(var(--tapnow-accent) / <alpha-value>)",
                    "accent-fg": "rgb(var(--tapnow-accent-fg) / <alpha-value>)",
                },
            },
            zIndex: {
                header: "40",
                panel: "50",
                popover: "60",
                modal: "70",
                toast: "80",
                overlay: "90",
            },
        },
    },
    plugins: [],
}
