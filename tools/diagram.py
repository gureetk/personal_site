#!/usr/bin/env python3
"""Color the homelab diagrams and write them into index.html.

Edit WIDE (800px and up, at most 73 columns) or NARROW (phones, at most 44),
then run from the repo root: python3 tools/diagram.py
"""
import html
import re
import sys
from pathlib import Path

WIDE = r"""
                                  internet
                                      |
                                      v
                +-- vps -----------------------------------+
                |  haproxy    passes TLS through unopened  |
                |  crowdsec   bouncer: blocks at the edge  |
                +---------------------+--------------------+
                                      |
                                      |  wireguard
                                      v
 trusted lan    +-- homelab -------------------------------+
 -- connects -->|  caddy      reverse proxy, ends TLS      |
 <-- replies ---|  crowdsec   reads caddy's logs           |
 split-horizon  |  anubis     proof-of-work vs scrapers    |  tailnet
 dns            |  tailscale  own LXC -> caddy             |<----------
                +---------------------+--------------------+ tailnet lock
                                      |
                                      |  wireguard
                                      v
                immich · opencloud · vaultwarden · jellyfin
                searxng · frigate · ntfy · pocket-id · stirling-pdf · ...
"""

NARROW = r"""
                 internet
                     |
                     v
+-- vps -----------------------------------+
|  haproxy    passes TLS through unopened  |
|  crowdsec   bouncer: blocks at the edge  |
|  wireguard  tunnel home to caddy         |
+--------------------+---------------------+
 trusted lan         |            tailnet
 split-horizon       |       tailnet lock
 dns                 |                  |
  |  ^               |                  |
  v  |  replies      v                  v
+-- homelab -------------------------------+
|  caddy      reverse proxy, ends TLS      |
|  crowdsec   reads caddy's logs           |
|  anubis     proof-of-work vs scrapers    |
|  tailscale  own LXC -> caddy             |
+--------------------+---------------------+
                     |
                     |  wireguard
                     v
  immich · opencloud · vaultwarden
  jellyfin · searxng · frigate · ntfy
  pocket-id · stirling-pdf · ...
"""

SOURCES = ["trusted lan", "internet", "tailnet"]           # where traffic comes from
LINKS = ["split-horizon", "tailnet lock", "wireguard", "dns", "connects", "replies"]  # how it travels

LIMITS = {"wide": 73, "narrow": 44}


def colorize(line):
    cls = [None] * len(line)

    def mark(start, end, name):
        if all(c is None for c in cls[start:end]):
            cls[start:end] = [name] * (end - start)

    for m in re.finditer(r"\+-- ([a-z][\w-]*) ", line):          # box titles
        mark(m.start(1), m.end(1), "dg-box")
    phrases = [(p, "dg-box") for p in SOURCES] + [(p, "dg-wire") for p in LINKS]
    for phrase, name in sorted(phrases, key=lambda x: -len(x[0])):
        for m in re.finditer(r"(?<![\w-])" + re.escape(phrase) + r"(?![\w-])", line):
            mark(m.start(), m.end(), name)
    for m in re.finditer(r"\|  ([a-z][\w-]*)", line):              # first word in a box row
        mark(m.start(1), m.end(1), "dg-key")
    for i, ch in enumerate(line):                                   # lines and arrows
        if cls[i] is not None:
            continue
        before = line[i - 1] if i else " "
        after = line[i + 1] if i + 1 < len(line) else " "
        if ch in "+|<>^":
            cls[i] = "dg-frame"
        elif ch == "-" and not (before.isalpha() and after.isalpha()):
            cls[i] = "dg-frame"
        elif ch == "v" and before == " " and after == " ":
            cls[i] = "dg-frame"

    out, i = [], 0
    while i < len(line):
        j = i
        while j < len(line) and cls[j] == cls[i]:
            j += 1
        text = html.escape(line[i:j], quote=False)
        out.append(f'<span class="{cls[i]}">{text}</span>' if cls[i] else text)
        i = j
    return "".join(out)


def render(art, name):
    lines = [l.rstrip() for l in art.strip("\n").splitlines()]
    widest = max(map(len, lines))
    if widest > LIMITS[name]:
        sys.exit(f"{name} diagram is {widest} columns wide; the limit is {LIMITS[name]}.")
    return "\n".join(colorize(l) for l in lines)


def main():
    page_path = Path(__file__).resolve().parent.parent / "index.html"
    page = page_path.read_text()
    for name, art in (("wide", WIDE), ("narrow", NARROW)):
        pattern = re.compile(r'(<pre[^>]*data-diagram="' + name + r'"[^>]*>)(.*?)(</pre>)', re.S)
        page, count = pattern.subn(lambda m: m.group(1) + render(art, name) + m.group(3), page)
        if count != 1:
            sys.exit(f'Expected one <pre data-diagram="{name}"> in index.html, found {count}.')
    page_path.write_text(page)
    print("Updated both diagrams in index.html.")


if __name__ == "__main__":
    main()
