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
                               remote devices
                                      |
                                      |  inner wireguard
                                      v
                +-- vps -----------------------------------+
                |  wireguard  outer tunnel to the homelab  |
                |             no keys to the inner tunnel  |
                +---------------------+--------------------+
                                      |
                                      |  outer wireguard
                                      |  (inner one inside)
                                      v
 trusted lan    +-- homelab -------------------------------+
 -- connects -->|  caddy      reverse proxy, access rules  |
 <-- replies ---|  firewall   limits what devices reach    |
 split-horizon  |  wireguard  own LXC, ends inner tunnels  |
 dns            +---------------------+--------------------+
                                      |
                                      |  wireguard
                                      v
                immich · opencloud · vaultwarden · jellyfin
                searxng · frigate · ntfy · pocket-id · stirling-pdf · ...
"""

NARROW = r"""
              remote devices
                     |
                     |  inner wireguard
                     v
+-- vps -----------------------------------+
|  wireguard  outer tunnel to the homelab  |
|             no keys to the inner tunnel  |
+--------------------+---------------------+
 trusted lan         |
 split-horizon       |  outer wireguard
 dns                 |  (inner one inside)
  |  ^               |
  v  |  replies      v
+-- homelab -------------------------------+
|  caddy      reverse proxy, access rules  |
|  firewall   limits what devices reach    |
|  wireguard  own LXC, ends inner tunnels  |
+--------------------+---------------------+
                     |
                     |  wireguard
                     v
  immich · opencloud · vaultwarden
  jellyfin · searxng · frigate · ntfy
  pocket-id · stirling-pdf · ...
"""

SOURCES = ["trusted lan", "remote devices"]                 # where traffic comes from
LINKS = ["split-horizon", "inner wireguard", "outer wireguard", "wireguard", "dns",
         "connects", "replies"]                             # how it travels

LIMITS = {"wide": 73, "narrow": 44}


def colorize(line):
    cls = [None] * len(line)

    def mark(start, end, name):
        if all(c is None for c in cls[start:end]):
            cls[start:end] = [name] * (end - start)

    for m in re.finditer(r"\+-- ([a-z][\w-]*) ", line):          # box titles
        mark(m.start(1), m.end(1), "dg-box")
    for m in re.finditer(r"\|  ([a-z][\w-]*)(?= {2,}\S[^|]*\|)", line):  # first word in a box row
        mark(m.start(1), m.end(1), "dg-key")
    phrases = [(p, "dg-box") for p in SOURCES] + [(p, "dg-wire") for p in LINKS]
    for phrase, name in sorted(phrases, key=lambda x: -len(x[0])):
        for m in re.finditer(r"(?<![\w-])" + re.escape(phrase) + r"(?![\w-])", line):
            mark(m.start(), m.end(), name)
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
