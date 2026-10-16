import re, sys, io, os
p = os.path.join(os.path.dirname(__file__), "..", "PROGRESS_TRACKER.md")
t = io.open(p, encoding="utf-8").read()
phases, cur = [], None
for line in t.split("\n"):
    if re.match(r"## P[0-9]", line):
        cur = {"name": line[3:].strip(), "c": {}}
        phases.append(cur)
    elif cur and re.match(r"\| \d+\.\d+ \|", line):
        status = line.split("|")[4].strip()
        cur["c"][status] = cur["c"].get(status, 0) + 1
    elif line.startswith("## ") and cur and not re.match(r"## P[0-9]", line):
        cur = None
rows = ["| Phase | Done | In progress | Blocked | Not started | Total |", "| ------ | ------ | ------ | ------ | ------ | ------ |"]
for ph in phases:
    c = ph["c"]
    tot = sum(c.values())
    rows.append("| %s | %d | %d | %d | %d | %d |" % (ph["name"], c.get("Done", 0), c.get("In progress", 0), c.get("Blocked", 0), c.get("Not started", 0), tot))
block = "<!-- SUMMARY-START -->\n" + "\n".join(rows) + "\n<!-- SUMMARY-END -->"
new = re.sub(r"<!-- SUMMARY-START -->.*?<!-- SUMMARY-END -->", lambda m: block, t, flags=re.S)
io.open(p, "w", encoding="utf-8", newline="\n").write(new)
print("\n".join(rows))
