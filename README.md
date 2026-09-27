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
│   └── favicon.svg
├── .well-known/security.txt    RFC 9116 security contact
├── _headers                    security headers for Cloudflare Pages and Netlify
├── deploy/Caddyfile            self-hosting with Caddy (automatic HTTPS)
├── deploy/nginx.conf           self-hosting with nginx
├── tools/diagram.py            redraws the homelab diagram in index.html
├── .nojekyll                   stops GitHub Pages from hiding .well-known/
└── robots.txt
```

## Make it yours

1. **What's filled in.** Your name, the `gureet(8)` handle, the `gureet.ca` domain (including the deploy configs and `security.txt`), and your accounts: Codeberg `wingback`, GitHub `gureett`, LinkedIn `gureetk`, and `hello@gureet.ca`. FastFahr links to `arkelziko/fast-fahr` because the repo lives on a teammate's account. The AUTHOR section links the site's source at `codeberg.org/wingback/pages`, which is the repository name Codeberg Pages uses. What's left is the résumé and the SSH randomart.
2. **Projects.** Lead each entry with what it does and what came of it. On team projects, say which part was yours, the way FastFahr's "My part" does. Unfinished work gets `<span class="tag">in progress</span>` after its name, as wglink has; take the tag off once there's a release.
3. **History.** Add jobs, clubs, CTF teams and certifications as they come, newest first.
4. **Environment.** This is your homelab: the diagram, the entries under it and the table of services. Say what runs and why. Leave out IPs, hostnames, versions, and which services are reachable from the internet. The diagram comes in two drawings, a wide one for desktops and a stacked one for phones. Both live as plain ASCII in `tools/diagram.py`: edit them there, then run `python3 tools/diagram.py` to color them and write them into the page.
5. **Status line.** Under your name, the line with the green light. Change it, or delete the `<p class="status">` element.
6. **Résumé.** Put `resume.pdf` in the root folder with its metadata stripped, because PDFs often carry your username, software versions and file paths. On Fedora, install the tools with `sudo dnf install perl-Image-ExifTool qpdf poppler-utils`, then run this on the file you exported:

   ```sh
   exiftool -all:all= -PDF:Title="Gureet Kharod, résumé" -o stripped.pdf resume-export.pdf
   qpdf --linearize stripped.pdf resume.pdf && rm stripped.pdf
   pdfinfo resume.pdf   # Title should be the only metadata left
   ```

   The `qpdf` step is what actually removes the old values; exiftool on its own only hides them, and they can be recovered from the file. The title is what a browser tab shows when someone opens the PDF. Don't use `mat2` on a résumé: by default it turns each page into an image, so the text can't be selected or searched and the links stop working. Its `--lightweight` mode keeps the text but still drops the links.
7. **SSH randomart.** Run the command below and paste the 11-line box into the `<pre>` in the FILES section. Put the `SHA256:` fingerprint in the `<figcaption>`. If the art contains an `&`, write it as `&amp;`. The spans that color `S` and `E` are optional.

   ```sh
   ssh-keygen -lv -E sha256 -f ~/.ssh/id_ed25519.pub
   ```

8. **Hidden phrases.** The lens reveals the strings in `PHRASES` at the top of `assets/js/cipher.js`. Add your own. Just below the list, `SCROLL_SPEED` sets how fast the background scrolls compared with the page: `0` keeps it still, `1` moves it with the text, and the default `0.5` makes it read as sitting behind the page. For visitors who've asked their system for reduced motion, it stays still no matter what.
9. **Dates.** Update the footer date when you edit the page. Each September, update your year of study in HISTORY. `Expires` in `security.txt` should stay less than a year away.
10. **Width.** `--frame` in `assets/css/site.css` sets how wide the page gets (1440px). Wider screens center it, and the background still fills the screen. Set it to `100vw` to keep the page pinned left at any width.

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
3. `gureet.ca` is a bare domain, and a bare domain can't have a `CNAME`. Give it the `A` and `AAAA` records from [Codeberg's custom-domain page](https://docs.codeberg.org/codeberg-pages/using-custom-domain/) instead (in September 2026: `217.197.84.141` and `2a0a:4580:103f:c0de::2`). An `ALIAS` record also works if your DNS host has them, but not in a DNSSEC-signed zone. Then add a `TXT` record named `_git-pages-repository.gureet.ca` that contains the repository's HTTPS clone URL. The old `.domains` file isn't used anymore.

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
