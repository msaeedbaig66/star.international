import type { Config } from 'tailwindcss'

const config: Config = {
 darkMode: 'class',
 content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './src/app/**/*.{ts,tsx,js,jsx}',
    './src/components/**/*.{ts,tsx,js,jsx}',
    './src/lib/**/*.{ts,tsx,js,jsx}',
  ],
 theme: {
 extend: {
 colors: {
 primary: {
        DEFAULT: 'var(--color-primary)',
        hover: '#059669',
        light: '#ecfdf5',
        foreground: '#FFFFFF',
      },
 secondary: {
        DEFAULT: 'var(--color-secondary)',
        light: '#f0fdf4',
        foreground: '#FFFFFF',
      },

 accent: { DEFAULT:'#F59E0B', light:'#FEF3C7', foreground:'#FFFFFF' },
 destructive: { DEFAULT:'#DC2626', light:'#FEE2E2', foreground:'#FFFFFF' },
 success: { DEFAULT:'#16A34A', light:'#DCFCE7' },
 warning: { DEFAULT:'#D97706', light:'#FEF3C7' },
 surface: {
        DEFAULT: 'var(--color-surface-low)',
        'low': 'var(--color-surface-low)',
        'mid': 'var(--color-surface)',
        'high': 'var(--color-surface-high)',
      },
      border: {
        DEFAULT: 'var(--color-surface-high)',
        strong: '#94a3b8',
      },
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-muted)',
        muted: '#94a3b8',
        disabled: '#cbd5e1',
      },
 },
 fontFamily: {
 sans: ['var(--font-inter)', 'sans-serif'],
 mono: ['var(--font-geist-mono)', 'monospace'],
 },
 boxShadow: {
 focus: '0 0 0 3px rgba(26, 107, 69, 0.25)',
 },
 container: {
 center: true,
 padding: { DEFAULT:'1rem', sm:'1.5rem', lg:'2rem' },
 screens: { '2xl':'1400px' },
 },
 },
 },
 plugins: [],
}

export default config
