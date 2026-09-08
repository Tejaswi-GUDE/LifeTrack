/**
 * Tailwind is configured to consume the APPROVED design tokens
 * (docs/Flagship_Screens/tokens.css → src/styles/tokens.css), not to
 * introduce a new scale. Every utility below resolves to a CSS variable
 * defined in tokens.css so Tailwind utilities and the approved component
 * classes stay in lockstep.
 *
 * Preflight is disabled on purpose: tokens.css already provides the
 * baseline reset, and the approved flagship mockups render without
 * Tailwind's opinionated resets. We add back only `border-box` + a media
 * reset in styles/base.css.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    // Breakpoints from the Flagship Screens spec:
    //   ≥1200 = full layout · 768–1199 = tablet · <768 = mobile
    //   (Trainee Profile switches its 2-col layout at 1100)
    screens: {
      sm: '768px',
      lg: '1100px',
      xl: '1200px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      ink: {
        DEFAULT: 'var(--ink)',
        70: 'var(--ink-70)',
        30: 'var(--ink-30)',
        20: 'var(--ink-20)',
        10: 'var(--ink-10)',
      },
      paper: {
        DEFAULT: 'var(--paper)',
        raised: 'var(--paper-raised)',
      },
      slate: {
        DEFAULT: 'var(--slate)',
        30: 'var(--slate-30)',
        15: 'var(--slate-15)',
        10: 'var(--slate-10)',
        tint: 'var(--slate-tint)',
      },
      teal: {
        DEFAULT: 'var(--teal)',
        tint: 'var(--teal-tint)',
      },
      ochre: {
        DEFAULT: 'var(--ochre)',
        tint: 'var(--ochre-tint)',
      },
      brick: {
        DEFAULT: 'var(--brick)',
        tint: 'var(--brick-tint)',
      },
      plum: {
        DEFAULT: 'var(--plum)',
        tint: 'var(--plum-tint)',
      },
    },
    fontFamily: {
      sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      serif: ['IBM Plex Serif', 'Georgia', 'serif'],
      mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
    },
    // 4px base, restrained scale (Design System §5)
    spacing: {
      0: '0',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      12: '48px',
      16: '64px',
      24: '96px',
    },
    borderRadius: {
      none: '0',
      xs: 'var(--radius-xs)',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      pill: 'var(--radius-pill)',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      focus: 'var(--shadow-focus)',
    },
    fontSize: {
      // Modular scale, base 15px (Design System §4)
      caption: ['12px', { lineHeight: '1.4' }],
      'body-sm': ['13px', { lineHeight: '1.5' }],
      body: ['15px', { lineHeight: '1.55' }],
      h3: ['17px', { lineHeight: '1.35' }],
      h2: ['21px', { lineHeight: '1.3' }],
      h1: ['27px', { lineHeight: '1.2' }],
      display: ['34px', { lineHeight: '1.15' }],
      'data-lg': ['30px', { lineHeight: '1.1' }],
    },
    extend: {
      maxWidth: {
        modal: '560px',
        'modal-wide': '720px',
      },
    },
  },
  plugins: [],
};
