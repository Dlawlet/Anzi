/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          100: '#EBF1F5',
          200: '#D9E3EA',
          300: '#C5D2DC',
          400: '#9BA9B4',
          500: '#707D86',
          600: '#55595F',
          700: '#33363A',
          800: '#25282C',
          900: '#151719',
        },
        brown: {
          100: '#FFC98F',
          200: '#FFB262',
          300: '#FF9C34',
          400: '#FF8506',
          500: '#D76E00',
          600: '#A95700',
          700: '#7B3F00',
          800: '#7B3F00',
          900: '#7B3F00',
        },
        // Anzi design tokens (docs/design-2026-10.md section 2.2). `gray` and `brown` stay for the legacy pages.
        night: { 900: '#151719', 800: '#25282C', 700: '#33363A', 400: '#9BA9B4', 300: '#C5D2DC' },
        earth: '#42210B',
        sun: { DEFAULT: '#FF8506', 200: '#FFE2BF', 50: '#FFF3E3' },
        clay: { DEFAULT: '#A95700', 700: '#7B3F00' },
        sand: '#FBF6EF',
        line: '#E7DED3',
        field: '#857A70',
        muted: '#55595F',
        leaf: { DEFAULT: '#157F3B', 50: '#EAF6EE' },
        danger: '#B42318',
        you: '#1A73E8',
      },
      boxShadow: {
        warm1: '0 1px 2px rgba(66,33,11,.08), 0 4px 12px -2px rgba(66,33,11,.12)',
        warm2: '0 2px 4px rgba(66,33,11,.08), 0 18px 36px -10px rgba(66,33,11,.28)',
      },
      spacing: {
        '9/16': '56.25%',
        '3/4': '75%',
        '1/1': '100%',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        'architects-daughter': ['var(--font-architects-daughter)', 'sans-serif']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3.25rem',
        '6xl': '4rem',
      },
      inset: {
        'full': '100%',
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.01em',
        wider: '0.02em',
        widest: '0.4em',
      },
      minWidth: {
        '10': '2.5rem',
      },
      scale: {
        '98': '.98'
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
