#!/usr/bin/env python3
"""Inline the two WOFF2 fonts into src/template.html -> index.html."""
import base64, pathlib
here = pathlib.Path(__file__).parent
html = (here / "src/template.html").read_text()
for token, name in (("__GEIST__", "geist.woff2"), ("__MONO__", "mono.woff2")):
    html = html.replace(token, base64.b64encode((here / "src/fonts" / name).read_bytes()).decode())
(here / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes")
