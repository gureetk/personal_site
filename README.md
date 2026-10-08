# gureet(8)

My personal site, written as a man page. You read it in a `less`-style pager, and the background is an encrypted hexdump. Move your cursor over it to decrypt what's underneath.

It's plain HTML, CSS and JavaScript. There's no framework, no build step, no dependencies and no trackers. The whole site is about 145 KB.

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
│   ├── og.png                  link preview image (1200 × 630)
│   └── favicon.svg
├── .well-known/security.txt    RFC 9116 security contact
├── _headers                    security headers for Codeberg Pages
├── deploy/Caddyfile            self-hosting with Caddy (automatic HTTPS)
├── deploy/nginx.conf           self-hosting with nginx
├── tools/diagram.py            redraws the homelab diagram in index.html
├── tools/og.html               source of the link preview image
├── .nojekyll                   stops GitHub Pages from hiding .well-known/
└── robots.txt
```

## Make it yours

1. **What's filled in.** Your name, the `gureet(8)` handle, the `gureet.ca` domain (including the deploy configs and `security.txt`), your email (`hello@gureet.ca`) and your accounts, which are `gureetk` on Codeberg, GitHub and LinkedIn. FastFahr links to `arkelziko/fast-fahr` because the repo lives on a teammate's account. The AUTHOR section links the site's source at `codeberg.org/gureetk/pages`, which is the repository name Codeberg Pages uses. What's left is the résumé. Its two links (under your name and in FILES) are commented out until `resume.pdf` exists.
2. **Projects.** Lead each entry with what it does and what came of it. On team projects, say which part was yours, the way FastFahr's "My part" does. Unfinished work gets `<span class="tag">in progress</span>` after its name, as wglink has; take the tag off once there's a release.
3. **History.** Add jobs, clubs, CTF teams and certifications as they come, newest first.
4. **Environment.** This is your homelab: the diagram, the entries under it and the table of services. Say what runs and why. Leave out IPs, hostnames, versions, and which services are reachable from the internet. The diagram comes in two drawings, a wide one for desktops and a stacked one for phones. Both live as plain ASCII in `tools/diagram.py`: edit them there, then run `python3 tools/diagram.py` to color them and write them into the page.
5. **Status line.** Under your name, the line with the green light. Change it, or delete the `<p class="status">` element.
6. **Résumé.** Put `resume.pdf` in the root folder with its metadata stripped, then uncomment its two links in `index.html`. Stripping matters because PDFs often carry your username, software versions and file paths. On Fedora, install the tools with `sudo dnf install perl-Image-ExifTool qpdf poppler-utils`, then run this on the file you exported:

   ```sh
   exiftool -all:all= -PDF:Title="Gureet Kharod, résumé" -o stripped.pdf resume-export.pdf
   qpdf --linearize stripped.pdf resume.pdf && rm stripped.pdf
   pdfinfo resume.pdf   # Title should be the only metadata left
   ```

   The `qpdf` step is what actually removes the old values; exiftool on its own only hides them, and they can be recovered from the file. The title is what a browser tab shows when someone opens the PDF. Don't use `mat2` on a résumé: by default it turns each page into an image, so the text can't be selected or searched and the links stop working. Its `--lightweight` mode keeps the text but still drops the links.
7. **SSH randomart.** FILES shows one drawing per key, labeled by device. When you add or change a key, run the command below on that device and paste the 11-line box into a `<pre>` in FILES, with the device name and the `SHA256:` fingerprint in its `<figcaption>`. If the art contains an `&`, write it as `&amp;`. The spans that color `S` and `E` are optional.

   ```sh
   ssh-keygen -lv -E sha256 -f ~/.ssh/id_ed25519.pub
   ```

8. **Hidden phrases.** The lens reveals the strings in `PHRASES` at the top of `assets/js/cipher.js`. Add your own. Just below the list, `SCROLL_SPEED` sets how fast the background scrolls compared with the page: `0` keeps it still, `1` moves it with the text, and the default `0.5` makes it read as sitting behind the page. For visitors who've asked their system for reduced motion, it stays still no matter what.
9. **Dates.** Update the footer date when you edit the page. Each September, update your year of study in HISTORY. `Expires` in `security.txt` should stay less than a year away.
10. **Link preview.** `assets/og.png` is `tools/og.html` at 1200 × 630, and chat apps show it when someone shares the link. If you change your name or tagline, open `tools/og.html` in Firefox, press Ctrl+Shift+M, set 1200 × 630 at 1x, take the screenshot with the camera button and save it over `assets/og.png`. Then shrink it with `pngquant --force --strip --quality 65-80 --ext .png assets/og.png`.
11. **Width.** `--frame` in `assets/css/site.css` sets how wide the page gets (1440px). Wider screens center it, and the background still fills the screen. Set it to `100vw` to keep the page pinned left at any width.

## Preview locally

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from disk mostly works, but some browsers block fonts on `file://` URLs.

## Deploy

**Codeberg Pages.** Codeberg is a non-profit forge run on free software.
1. Create an empty public repository named `pages`: no README, license or `.gitignore`. Push these files to a branch called `pages`.
2. `gureet.ca` is a bare domain, and a bare domain can't have a `CNAME`. Give it the `A` and `AAAA` records from [Codeberg's custom-domain page](https://docs.codeberg.org/codeberg-pages/using-custom-domain/) instead (in September 2026: `217.197.84.141` and `2a0a:4580:103f:c0de::2`). An `ALIAS` record also works if your DNS host has them, but not in a DNSSEC-signed zone. Then add a `TXT` record named `_git-pages-repository.gureet.ca` that contains the repository's HTTPS clone URL. On Cloudflare, set these records to DNS only. The old `.domains` file isn't used anymore.
3. In the repository, go to Settings → Webhooks → Add webhook → Forgejo. Set the target URL to the domain, `http://gureet.ca/`, and the branch filter to `pages`. The first deploy has to use `http://`; once the site is up, change the URL to `https://gureet.ca/`. Each push to `pages` then republishes the site. Skip the "Test delivery" button: it always fails for Pages webhooks. Push instead and check the site. A second webhook to `https://gureetk.codeberg.page/` also publishes it there, if you want that address too.

A project site such as `kitae.gureet.ca` works the same way from its own repository: a `pages` branch, a `CNAME` from `kitae.gureet.ca` to `codeberg.page`, a `TXT` record named `_git-pages-repository.kitae.gureet.ca` with that repository's clone URL, and a webhook to `http://kitae.gureet.ca/` (then `https://`).

`_headers` sets the security headers Codeberg Pages accepts: Content-Security-Policy, Permissions-Policy, Referrer-Policy and X-Frame-Options. It can't send HSTS or the other headers in `deploy/`. Details are at [docs.codeberg.org/codeberg-pages](https://docs.codeberg.org/codeberg-pages/).

**GitHub Pages.** Create a repository named `gureetk.github.io` and push these files. Then go to Settings → Pages and pick "Deploy from a branch" with `main` and `/ (root)`. The `.nojekyll` file makes sure `.well-known/` gets published. GitHub Pages can't send custom headers, so the Content Security Policy comes from the `<meta>` tag in the HTML.

**Cloudflare Pages or Netlify.** Both read `_headers` and accept more headers than Codeberg, so copy HSTS and the rest in from `deploy/Caddyfile`. There's no build command, and the output directory is the repository root.

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
