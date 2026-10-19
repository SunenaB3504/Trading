"""Builds docs/UAT/UAT-4/UAT-4.html from the UAT-3 page: same machinery, new cases.

Run from the repo root:  python tools/makeUat4.py
"""
import io
import json
import os
import re

SRC = "docs/UAT/UAT-3/UAT-3.html"
DST = "docs/UAT/UAT-4/UAT-4.html"

PH = "Test Person, 1975-08-15, 10:30, Mumbai, IN"

CASES = [
    # [id, group, must, auto, title, steps, expected]
    ["A1", "A. Lots popup (Ledger tab)", True, True, "Each holding shows its average price and a lots link",
     ["Open <code>http://127.0.0.1:8080</code> in a new private window and open the <b>Ledger</b> tab. Scroll to <b>Open positions</b>."],
     "<b>AAA</b> reads <b>47 shares, average ₹1,108.05, basis ₹52,078.25, mark …</b> with a link <b>3 lots</b>. <b>BBB</b>: 20 shares, average <b>₹510.75</b>, link <b>1 lot</b>. <b>CCC</b>: 200 shares, average <b>₹191.80</b>, link <b>1 lot</b>."],
    ["A2", "A. Lots popup (Ledger tab)", True, True, "The popup lists the open lots oldest first, in month groups",
     ["Press <b>3 lots</b> under AAA."],
     "A window opens titled <b>AAA: 3 open lots</b>, then the line <b>A sale takes the oldest lot first: 30 shares bought 2026-01-13 at ₹1,096.15.</b> Below it, three month groups: <b>2026-01</b>: 2026-01-13, 30 shares at ₹1,096.15, basis ₹32,884.50. <b>2026-02</b>: 2026-02-11, 7 shares at ₹1,139.25, basis ₹7,974.75. <b>2026-06</b>: 2026-06-15, 10 shares at ₹1,121.90, basis ₹11,219.00."],
    ["A3", "A. Lots popup (Ledger tab)", True, True, "The lots add up to the holding, and sold pieces are listed",
     ["In the AAA popup add the shares of the three lots and their bases. Read the last group, <b>Sold pieces</b>."],
     "30 + 7 + 10 = <b>47</b> shares, the same as the position. ₹32,884.50 + ₹7,974.75 + ₹11,219.00 = <b>₹52,078.25</b>, the same as the basis. Sold pieces: <b>2026-05-05: 50 shares, proceeds ₹57,822.50, net ₹2,874.59</b>. This is the answer to your question in round 1 about ₹1,108.05."],
    ["A4", "A. Lots popup (Ledger tab)", True, False, "The popup closes three ways",
     ["Open the popup and press <b>Close</b>.", "Open it again and press <b>Esc</b>.", "Open it again and click on the dark area outside the white window."],
     "Each of the three closes the popup and leaves the Ledger exactly as it was, scroll position included."],
    ["A5", "A. Lots popup (Ledger tab)", True, False, "The popup is read-only and fits a phone",
     ["With the popup open look for any button other than Close. Then press F12, Ctrl+Shift+M, width <b>390</b>, and open the popup again."],
     "No control chooses a lot or places an order (lot choice is the open decision D36). At 390 px wide the window fits with a margin, long lines wrap, and the lot list scrolls inside the window if it is long."],

    ["B1", "B. Edit my birth details", True, True, "The Edit button opens the form already filled in",
     ["New private window at <code>http://127.0.0.1:8080/?layer=on</code>, Profile tab. Enter " + PH + " (pick Mumbai, IN), gender Female, star Anizh (pick Anuradha). Save.", "Press <b>Edit my birth details</b> (above the Delete section)."],
     "The form opens with Name, date, time and place all filled in as saved, Female selected and the star box showing <b>Anuradha</b>. There is a <b>Cancel</b> button next to Save."],
    ["B2", "B. Edit my birth details", True, True, "Cancel changes nothing",
     ["In the edit form change the time to 11:45 but press <b>Cancel</b>."],
     "You are back at <b>Your chart facts</b> and the clock row still reads <b>1975-08-15T05:00 UTC</b>."],
    ["B3", "B. Edit my birth details", True, True, "A saved edit recomputes the chart",
     ["Press Edit, change the time to <b>11:45</b>, Save."],
     "The chart facts update: the clock row now reads <b>1975-08-15T06:15 UTC, Asia/Kolkata zone, +05:30</b>. The saved details are replaced, not added to: pressing Edit again shows 11:45."],
    ["B4", "B. Edit my birth details", True, False, "A bad edit is refused and the saved record is kept",
     ["Press Edit, set the date to <b>2020-02-30</b>, Save.", "Reload the page and open the Profile tab."],
     "A message says <b>Not a real date and time: 2020-02-30 11:45</b> and the form stays open. After the reload the chart facts are those of the last good save (your 1975 details)."],
    ["B5", "B. Edit my birth details", True, False, "Edit works in Malayalam",
     ["Press <b>മലയാളം</b>."],
     "The buttons read <b>എന്റെ ജനന വിവരങ്ങൾ തിരുത്തുക</b> (Edit) and, inside the form, <b>റദ്ദാക്കുക</b> (Cancel). Everything else on the form is Malayalam as before."],

    ["C1", "C. Hindi", True, True, "The switcher offers three languages",
     ["Profile tab with saved details (Mumbai 1975, no star needed)."],
     "At the top: <b>Language</b> with <b>മലയാളം</b>, <b>English</b>, <b>हिन्दी</b>."],
    ["C2", "C. Hindi", True, True, "Hindi shows the right facts with Hindi names",
     ["Press <b>हिन्दी</b>."],
     "<b>लग्न: कन्या 26°11′</b>; <b>चंद्र राशि: वृश्चिक</b>; <b>जन्म नक्षत्र: अनुराधा, चरण 3</b>; <b>इंदु लग्न: पुष्टि बाकी है</b>. The running period (valid on 2026-10-19): <b>सूर्य, 2026-04-01 से 2032-03-31 तक</b> and <b>चंद्र, 2026-07-19 से 2027-01-18 तक</b>. Dates and times stay in Latin digits."],
    ["C3", "C. Hindi", True, True, "The whole Profile tab is in Hindi",
     ["Read every part of the tab from top to bottom in Hindi. Use Ctrl+F for English words such as <i>Rising sign</i>, <i>Your chart facts</i>, <i>Tara Bala for a stock</i>."],
     "A draft note <b>यह अनुवाद एक प्रारूप है; अभी इसकी समीक्षा नहीं हुई है।</b> is shown. Every heading, label, button and sentence is Hindi. Only place names, the zone name, UTC, IST and the tags <b>[H] PH-11</b> and <b>[M] [V] PH-12</b> stay in Latin letters. The disclaimers say <b>सलाह नहीं</b> (not advice)."],
    ["C4", "C. Hindi", True, True, "A star can be typed in Devanagari",
     ["In Hindi, delete the details and fill the form again. In the star box type <b>अनु</b>, pick the suggestion, Save, then press <b>English</b>."],
     "The suggestion is <b>अनुराधा</b>. After saving, the row <b>दिया गया जन्म नक्षत्र</b> reads <b>अनुराधा (मेल खाता है)</b>. In English the same row reads <b>Anuradha (matches)</b>."],
    ["C5", "C. Hindi", True, True, "Hindi has its own font, loaded only when chosen, from the app itself",
     ["F12, Network, filter Font, clear the list, reload on the Profile tab in English, then press <b>हिन्दी</b>."],
     "In English no <b>NotoSansDevanagari</b> file is requested; after pressing हिन्दी the Devanagari files load. All requests go to <code>127.0.0.1</code>. Conjuncts such as क्ष, ज्ञ, श्र and the vowel marks join and sit correctly."],
    ["C6", "C. Hindi", True, True, "A locked device gets no Hindi and no font",
     ["New private window at the plain address <code>http://127.0.0.1:8080</code> (never with <code>?layer=on</code>). Network: clear, reload."],
     "No Profile tab. No <code>.ttf</code> file is requested, in particular no Devanagari one. IndexedDB <code>kv</code> has no <code>settings/profile-language</code>, <code>settings/layer</code> or <code>profile/birth</code>."],
    ["C7", "C. Hindi", False, False, "Your review of the Hindi text (exploratory)",
     ["Read the Hindi text on every part of the tab: star, sign and planet names (गुरु for Jupiter, चंद्र for Moon), the Tara class names (जन्म, संपत, विपत, क्षेम, प्रत्यरि, साधक, वध, मित्र, अतिमित्र), the warnings and the privacy notice."],
     "A list of corrections, or “reviewed, no changes”. When you are satisfied I switch off the draft note. The disclaimers must mean exactly what the English means."],

    ["D1", "D. Carried over from round 3", True, False, "The language choice is remembered",
     ["Choose Malayalam, reload, open Profile. Then choose English, reload."],
     "After each reload the tab is in the language last chosen."],
    ["D2", "D. Carried over from round 3", True, False, "The Malayalam text is reviewed and Delete works in Malayalam",
     ["In Malayalam press <b>എന്റെ ജനന വിവരങ്ങൾ ഇല്ലാതാക്കുക</b> twice. Look at IndexedDB and reload."],
     "The form returns empty, in Malayalam. <code>profile/birth</code> and the <code>birth</code> key are gone; <code>settings/profile-language</code> stays."],
    ["D3", "D. Carried over from round 3", False, False, "Your review of the Malayalam text (exploratory)",
     ["Read the Malayalam text on every part of the tab and note any corrections."],
     "A list of corrections, or “reviewed, no changes”. Then I switch off its draft note."],
    ["D4", "D. Carried over from round 3", True, False, "The report says “1 trade”, not “1 trades”",
     ["New private window at the plain address. On Trade place a buy AAA 10 market 2026-03-02, then a sell AAA 10 market 2026-03-02. Open Report, Net of costs, and scroll to By stock."],
     "The line reads <b>AAA (few trades): 1 trade, win rate 0.0%, expectancy -0.4%, profit -₹39.83</b>."],

    ["E1", "E. Command line (back end)", True, False, "Full verification",
     ["In the terminal run: <pre>pnpm verify</pre>"],
     "Ends without errors: 927 tests passed at last count, size and architecture checks clean."],
    ["E2", "E. Command line (back end)", True, False, "Every browser check",
     ["After <code>pnpm --filter @trading/app export:web</code> run each: <pre>pnpm e2e:airplane\npnpm e2e:orders\npnpm e2e:backup\npnpm e2e:universe\npnpm e2e:phone\npnpm e2e:noastro\npnpm e2e:profile</pre>"],
     "Each exits without a failure. At last count: airplane 9 checks, orders 14, backup 11, universe 9, phone 118, no-astro 25, profile 46."],
]

html = io.open(SRC, encoding="utf-8").read()

# Title, heading and scope.
html = html.replace("<title>UAT 3 web app</title>", "<title>UAT 4 web app</title>")
html = re.sub(r"<h1>.*?</h1>", "<h1>User acceptance test 4: lots popup, edit details and Hindi</h1>", html, count=1)
html = re.sub(
    r'(<h1>.*?</h1>\s*<p class="muted">).*?(</p>)',
    r"\1Scope: the lots popup on the Ledger (WP-3.12), Edit my birth details (WP-4.12) and the Hindi language (WP-4.11), plus the round 3 cases that were skipped. Tester: Sunil, on the local laptop. Prepared 2026-10-19 against the build of that date.\2",
    html, count=1, flags=re.S)

# The "not covered" list.
html = re.sub(
    r"(<h2>4\. Not covered in this round</h2>\s*<div class=\"card\">\s*<ul>).*?(</ul>)",
    r"\1<li>The Android build and the Android keystore and font names (WP-6.1).</li>"
    r"<li>Choosing a lot to sell (open decision D36), dividends on the Trade screen.</li>"
    r"<li>Regional name sets for other states.</li>"
    r"<li>Everything in P5 (the experiment harness): it has no screen yet.</li>\2",
    html, count=1, flags=re.S)

# Get-ready bullet that listed what is not covered.
html = re.sub(r"\s*<li>Changes that are not covered:.*?</li>", "", html, count=1, flags=re.S)

# Cases and state.
start = html.index("const CASES = [")
end = html.index("\n];", start) + 3
html = html[:start] + "const CASES = " + json.dumps(CASES, ensure_ascii=False, indent=1) + ";" + html[end:]
html = html.replace('const KEY = "uat-3-results-v1";', 'const KEY = "uat-4-results-v1";')
html = html.replace('download("UAT-3.html"', 'download("UAT-4.html"')
html = html.replace("UAT-3_results", "UAT-4_results")
html = re.sub(
    r'(<script id="state" type="application/json">).*?(</script>)', r"\1{}\2", html, count=1, flags=re.S)
html = html.replace('const PREPASS = "2026-10-19";', 'const PREPASS = "2026-10-19";')

os.makedirs(os.path.dirname(DST), exist_ok=True)
io.open(DST, "w", encoding="utf-8", newline="\n").write(html)
print("cases:", len(CASES), "bytes:", len(html))
