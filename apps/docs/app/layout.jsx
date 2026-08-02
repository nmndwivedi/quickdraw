import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './brand.css'

export const metadata = {
  metadataBase: new URL('https://tryquickdraw.com'),
  title: {
    default: 'Quickdraw Docs',
    template: '%s — Quickdraw Docs',
  },
  description:
    'Documentation for Quickdraw, the MIT-licensed infinite-canvas whiteboard SDK for React, React Native, and plain JavaScript.',
  icons: { icon: [{ url: '/docs/favicon.svg', type: 'image/svg+xml' }] },
}

const logo = (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 700,
      fontSize: '17px',
      letterSpacing: '-0.01em',
    }}
  >
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 22 C6 12, 12 6, 20 7 C27 8, 28 16, 22 19 C17 21.5, 12 20, 13 15"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="25.5" cy="25.5" r="3" fill="currentColor" />
    </svg>
    Quickdraw
    <span style={{ fontWeight: 500, opacity: 0.55 }}>Docs</span>
  </span>
)

// npm's wordmark, sized to sit next to Nextra's 24px GitHub icon.
const npmLink = (
  <a
    href="https://www.npmjs.com/package/@quickdrawjs/react"
    target="_blank"
    rel="noreferrer"
    aria-label="Quickdraw on npm"
    title="@quickdrawjs/react on npm"
    className="qd-npm-link"
  >
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" />
    </svg>
  </a>
)

const navbar = (
  <Navbar
    logo={logo}
    logoLink="https://tryquickdraw.com"
    projectLink="https://github.com/nmndwivedi/quickdraw"
  >
    {npmLink}
  </Navbar>
)

const footerLink = { textDecoration: 'underline' }

// One <span> so the whole line is a single flex item of Nextra's footer and
// wraps as ordinary text instead of one child per row.
const footer = (
  <Footer>
    <span>
      MIT licensed. Built in the open —{' '}
      <a
        href="https://github.com/nmndwivedi/quickdraw"
        target="_blank"
        rel="noreferrer"
        style={footerLink}
      >
        contributions welcome
      </a>
      . On npm:{' '}
      <a
        href="https://www.npmjs.com/package/@quickdrawjs/core"
        target="_blank"
        rel="noreferrer"
        style={footerLink}
      >
        @quickdrawjs/core
      </a>
      ,{' '}
      <a
        href="https://www.npmjs.com/package/@quickdrawjs/react"
        target="_blank"
        rel="noreferrer"
        style={footerLink}
      >
        @quickdrawjs/react
      </a>
      ,{' '}
      <a
        href="https://www.npmjs.com/package/@quickdrawjs/react-native"
        target="_blank"
        rel="noreferrer"
        style={footerLink}
      >
        @quickdrawjs/react-native
      </a>
      .
    </span>
  </Footer>
)

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 221, saturation: 82, lightness: { light: 45, dark: 65 } }} />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/nmndwivedi/quickdraw/edit/main/apps/docs"
          editLink="Edit this page on GitHub"
          sidebar={{ defaultMenuCollapseLevel: 2 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
