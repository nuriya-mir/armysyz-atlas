# armysyz — Language Atlas & Living Voice Commons Pipeline

**Live Project:** [https://armysyz.kz](https://armysyz.kz) | **Repository:** [https://github.com/nuriya-mir/armysyz-atlas](https://github.com/nuriya-mir/armysyz-atlas)  
**Code License:** [MIT](./LICENSE) (`SPDX-License-Identifier: MIT`) | **Data & Schemas:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`SPDX-License-Identifier: CC-BY-4.0`)

---

## About `armysyz`

**armysyz** is about how the languages of the world meet: what they have in common, how they differ, and what they give each other — helping people find a common language, word by word. Kazakh greets first: the project's name is the Kazakh greeting *"Armysyz"* (*"Are you in peace and honour?"*). Its forms are a digital magazine, a 3D globe of encounters, and a language atlas.

Every encounter begins with human curiosity and mutual respect among equals — without didactic pressure, gamified streaks, or hierarchy between "major" and "minor" languages.

---

## What Is Already Built vs. Open Development Roadmap

### Already Live in Production (`https://armysyz.kz` & `./src`)
1. **Language Encounters & 3D Globe:** 99 trilingual (`KK` / `RU` / `EN`) encounters between Kazakh and languages across all inhabited continents, plus the core Kazakh hub (*Qazaq tili*), with original scripts, acoustic transcripts, and one-voice-at-a-time playback.
2. **Language Atlas — Step 1 (`src/build-atlas-data.mjs`, `src/atlas-curation.mjs`, `src/check-atlas.mjs`):**
   - Equal-area **Equal Earth** projection (`d3-geo-projection`) on **Natural Earth** public-domain boundaries (UN-recognized borders, neutral styling for disputed regions) so continental and island regions are never visually distorted.
   - Reproducible reconciliation of **Glottolog 5.3** (`CC BY 4.0`, genealogical trees, coordinates, ISO 639-3 / Glottocodes) and **Unicode CLDR 48** (`KK`/`RU`/`EN` localized names and endonyms) for the initial 100 languages.
   - Strict **`no invented translation` build gate**: if a language or family name is unattested in `CLDR 48` or peer-reviewed linguistic dictionaries for `KK`/`RU`, the pipeline outputs its verified self-name (`autonym`) and international code rather than fabricating coinages.
3. **"Бір сөз — көп тіл / One Word — Many Languages" — Part A (`src/words.ts`, `src/build-words-languages.mjs`):**
   - Public chapter architecture and language registry (`~7,700` entries from Glottolog 5.3 + CLDR 48) for shared human concepts (*mother, water, sun, peace, conscience, greeting, road*), with strict ethical and acoustic rules:
     - **Informed legal consent** (`CC0-1.0` or `CC-BY-4.0`) and contributor attribution;
     - **Egalitarian voice cap:** up to **5 native voices per word per language** (maximum 2 per region) so major and endangered languages are heard on equal terms;
     - **Transparency of voice origin:** any temporary synthetic audio is explicitly marked directly next to the recording (`§ 2`, `§ 4.7`).

### Planned Next Stage (NLnet Grant Scope)
1. **Language Atlas — Step 2 (Full World Language Coverage):**
   - Scaling the Equal Earth interactive map and static build pipeline from 100 languages to all **~7,700 languages** in **Glottolog 5.3**, enriched with **Wikidata (`CC0`)** and **Unicode CLDR 48** endonyms, script metadata, and vital-status indicators, while keeping client bundle sizes compact and offline-capable.
2. **"Бір сөз — көп тіл / One Word — Many Languages" — Part B (Open Living-Voice Intake & Verification Server):**
   - Self-hostable, zero-telemetry browser recorder (`Web Audio API`, `Opus/WAV`) with cryptographic consent receipts (`CC0-1.0` / `CC-BY-4.0`), dialect/region tagging, and a **dual native-speaker verification queue** (`pending → verified → published`) that exports static frictionless Data Packages (`datapackage.json`) for Commons and open linguistic archives.

---

## Repository Contents (`./src`)

- [`src/build-atlas-data.mjs`](./src/build-atlas-data.mjs) — Deterministic static data builder joining Glottolog 5.3 (`languoid.csv`), Unicode CLDR 48 (`KK`/`RU`/`EN`), and curated orthographic records into compact Equal Earth map payloads.
- [`src/atlas-curation.mjs`](./src/atlas-curation.mjs) — Verified autonyms, scripts, macro-regions, and curated trilingual nomenclature enforcing the `no invented translation` rule.
- [`src/check-atlas.mjs`](./src/check-atlas.mjs) — Automated verification suite checking coordinate bounds, ISO 639-3 / Glottocode integrity, trilingual label completeness, and bundle weight limits.
- [`src/words.ts`](./src/words.ts) — Data schema, ethical rules, and concept definitions for the *"Бір сөз — көп тіл / One Word — Many Languages"* living voice archive.
- [`src/build-words-languages.mjs`](./src/build-words-languages.mjs) — Generator compiling the full searchable registry of world languages (`Glottolog 5.3` + `CLDR 48`) for community voice submissions.

---

## Generative AI & Data Provenance Declaration

In accordance with the **NLnet Foundation Generative AI Policy (v1.1, January 26, 2026)**:
1. **Deterministic Pipeline:** All coordinate projections, Glottolog/CLDR joins, and integrity checks in this repository are **100% deterministic and reproducible**. No LLM is used to invent translations, endonyms, or linguistic classifications.
2. **Honest Audio Labeling:** On `armysyz.kz`, priority is given to live human voices. Where synthetic voice is temporarily used, it is explicitly labeled next to the audio player.
3. **Human Authorship:** Project architecture, curation rules, and code are authored by **Nuriya Mirsalimova** (Almaty, Kazakhstan).

---

## License

- **Source Code:** [MIT License](./LICENSE) (`SPDX-License-Identifier: MIT`)
- **Schemas & Curated Data Metadata:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) (`SPDX-License-Identifier: CC-BY-4.0`)

Copyright (c) 2026 Nuriya Mirsalimova (`https://armysyz.kz`).
