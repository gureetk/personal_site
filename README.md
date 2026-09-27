# gureet(8)

My personal site, written as a man page. You read it in a `less`-style pager, and the background is an encrypted hexdump. Move your cursor over it to decrypt what's underneath.

It's plain HTML, CSS and JavaScript. There's no framework, no build step, no dependencies and no trackers. The whole site is about 130 KB.

```
.
├── index.html                  all of the content (readable without JavaScript)
├── 404.html                    "No manual entry for this page"
├── assets/
│   ├── css/site.css            layout, type, light and dark themes
│   ├── js/theme-init.js        applies a saved theme before first paint
│   ├── js/site.js              pager prompt, less keys, help screen, theme toggle
│   ├── js/cipher.js            the hexdump background and decryption lens
│   ├── fonts/                  self-hosted woff2 files and their OFL licenses
│   └── favicon.svg
├── .well-known/security.txt    RFC 9116 security contact
├── _headers                    security headers for Cloudflare Pages and Netlify
├── deploy/Caddyfile            self-hosting with Caddy (automatic HTTPS)
├── deploy/nginx.conf           self-hosting with nginx
├── tools/diagram.py            redraws the homelab diagram in index.html
├── .nojekyll                   stops GitHub Pages from hiding .well-known/
└── robots.txt
```

## Preview locally

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from disk mostly works, but some browsers block fonts on `file://` URLs.

## Deploy

**Codeberg Pages.** Codeberg is a non-profit forge run on free software.
1. Create a public repository named `pages` and push these files to a branch called `pages`.
2. In the repository settings, add a webhook pointing at `https://wingback.codeberg.page/`, with the branch filter set to `pages`. Each push to that branch then publishes the site at `wingback.codeberg.page`.
3. For a custom domain, point a `CNAME` at `codeberg.page` (use `A`/`AAAA` records instead if your domain has DNSSEC). Add a `TXT` record named `_git-pages-repository.gureet.ca` that contains the repository's HTTPS clone URL. The old `.domains` file isn't used anymore.

Codeberg Pages also reads `_headers`, but only accepts certain headers. As of August 2026 the list covers Content-Security-Policy, Permissions-Policy, Referrer-Policy and X-Frame-Options. If a deploy complains, trim `_headers` down to those. Details are at [docs.codeberg.org/codeberg-pages](https://docs.codeberg.org/codeberg-pages/).

**GitHub Pages.** Create a repository named `gureett.github.io` and push these files. Then go to Settings → Pages and pick "Deploy from a branch" with `main` and `/ (root)`. The `.nojekyll` file makes sure `.well-known/` gets published. GitHub Pages can't send custom headers, so the Content Security Policy comes from the `<meta>` tag in the HTML.

**Cloudflare Pages or Netlify.** Both read `_headers`, so you get the full header set, including HSTS and `frame-ancestors`. There's no build command, and the output directory is the repository root.

**Your own server.** A VPS or a box in your homelab works. `deploy/Caddyfile` gets you HTTPS with no extra setup. `deploy/nginx.conf` explains the one `add_header` gotcha that catches most people. After deploying, check the headers with [securityheaders.com](https://securityheaders.com) and [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory).

## Keys

The prompt in the bottom-left corner works like `less`. Press `h` for help, or tap the prompt on a phone.

| Key | Action |
| --- | --- |
| `j` `k` | line down / up |
| `f` `b` or Space | window down / up |
| `d` `u` | half window down / up |
| `g` `G` | top / bottom |
| `n` `N` | next / previous section |
| `t` | light / dark |
| `q` | try it |

Single-key shortcuts can be switched off in the help screen, for people who use voice control.

## Why it's built this way

- **No third-party requests.** The fonts are self-hosted and there's no analytics. The CSP only allows files from this origin, so the browser blocks anything else.
- **Nothing to break.** There are no packages to update and no build to fail. Fixing a typo is a one-line commit.
- **Works without JavaScript.** Every word is in the HTML, so it reads fine in Tor Browser's Safest mode. JavaScript only adds the background, the prompt and the keys.
- **It respects your settings.** It follows the system's light or dark theme. It stops animating when you've asked for reduced motion, and the background turns off when you've asked for more contrast. It prints as a clean man page.

## Credits

Fonts: [Iosevka](https://github.com/be5invis/Iosevka) by Belleve Invis, plus [Atkinson Hyperlegible Next and Mono](https://www.brailleinstitute.org/freefont/) by the Braille Institute. All are under the SIL Open Font License 1.1. Iosevka Bold is subset to Latin characters (`pyftsubset`), which shrinks it from 988 KB to 22 KB.

Code is MIT-licensed; see `LICENSE`.
