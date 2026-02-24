# o5102o.com

Personal website and portfolio for o5102o — developer based in Seoul, Korea.

## Pages

| URL | Path | Description |
|-----|------|-------------|
| `o5102o.com` | `/index.html` | Main landing page |
| `by.o5102o.com` | `/by/index.html` | Portfolio |
| `card.o5102o.com` | `/card/index.html` | Digital card + contact |
| `o5102o.com/info/` | `/info/index.html` | Redirect to `card.o5102o.com` |

## Stack

- Pure HTML5 + embedded CSS
- Minimal vanilla JavaScript (card contact form + info redirect fallback)
- No build tools, no dependencies
- Deployed via [Cloudflare Pages](https://pages.cloudflare.com)

## Structure

```
o5102o.com/
├── index.html       # Main landing page
├── by/
│   └── index.html   # Portfolio page
├── card/
│   └── index.html   # Digital card + contact
└── info/
    └── index.html   # Redirect to card.o5102o.com
```

## SEO / Social Meta

- `index.html` → `og:url: https://o5102o.com`
- `by/index.html` → `og:url: https://by.o5102o.com`
- `card/index.html` → `og:url: https://card.o5102o.com`
- `info/index.html` keeps redirect behavior to `https://card.o5102o.com`

## Design

- Dark theme (`#0a0a0a` background)
- Monospace font stack (SF Mono, Fira Code, Fira Mono, Roboto Mono)
- Responsive — mobile-first
- Accessible — `prefers-reduced-motion` support, keyboard navigation, focus states

## Contact

- Web: [o5102o.com](https://o5102o.com)
- GitHub: [@jaylee1020](https://github.com/jaylee1020)
- Email: jyounglee1020@gmail.com
