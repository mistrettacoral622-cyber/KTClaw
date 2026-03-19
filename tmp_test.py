import re
html = open("old.html", "r", encoding="utf-8").read()
f2_start = html.find("<!-- ===== Frame 2: ")
f3_start = html.find("<!-- ===== Frame 3: ")
f2_html = html[f2_start:f3_start]
print("original \n<div count:", f2_html.count("<div"), "\n</div count:", f2_html.count("</div"))

match = re.search(r'<div class="cc">[\s\S]*?<div class="cw">[\s\S]*?</button></div>\s*</div>\s*</div>', f2_html)
if match:
    print("Match length:", len(match.group(0)))
    print("Match ending:", repr(match.group(0)[-30:]))
    print("Has <main> ?", "</main>" in match.group(0) )
else:
    print("No match")
