# Fonts for the Profile languages (T24, WP-4.10)

The Profile tab is set in **Google Noto Sans**: Noto Sans for Latin text, Noto Sans Malayalam for Malayalam
(Noto Sans Devanagari is added with Hindi, WP-4.11).

**Licence.** SIL Open Font License 1.1, which allows bundling and redistribution with the app. The licence files
ship beside the fonts in `packages/app/assets/fonts/` (`OFL.txt` for Noto Sans, `OFL-Malayalam.txt` for Noto
Sans Malayalam; "Copyright 2022 The Noto Project Authors"). The fonts must not be sold on their own and keep their
names.

**Source.** The official release files from github.com/notofonts (`NotoSans-Regular/Bold.ttf`,
`NotoSansMalayalam-Regular/Bold.ttf`), downloaded once into the git-ignored `data/raw/fonts/`.

**What is shipped.** Subsets, made with fontTools (`python -m fontTools.subset ... --layout-features='*'
--no-hinting`), keeping every shaping table, which Malayalam depends on:
- Noto Sans: Basic Latin, Latin-1, general punctuation, rupee sign, arrows, minus (36 KB per weight).
- Noto Sans Malayalam: the Malayalam block U+0D00 to U+0D7F, the zero-width joiners, space and dotted circle
  (61 KB per weight).

**How they are loaded.** Self-hosted inside the app and never from a font server, so the Profile flow makes no
network call and works offline. Only the gated Profile screen loads them: Noto Sans when the tab opens, and the
Malayalam files only when Malayalam is chosen. A locked device never requests a font file (checked by the
browser checks `e2e:profile` and `e2e:noastro`).

**Limits.** The check boxes in the Tara form (the characters for a ticked and an empty box) are not in Noto Sans and
come from the device's own symbol font. Android will need the font families named one at a time, which is a
WP-6.1 task.
