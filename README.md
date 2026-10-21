# armysyz — Language Atlas & Living Voice Commons Pipeline

**Live Project:** [https://armysyz.kz](https://armysyz.kz) | **Repository:** [https://github.com/nuriya-mir/armysyz-atlas](https://github.com/nuriya-mir/armysyz-atlas)  
**Code License:** [MIT](./LICENSE) (`SPDX-License-Identifier: MIT`) | **Data & Schemas:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`SPDX-License-Identifier: CC-BY-4.0`)

---

## About `armysyz`

**armysyz** is about how the languages of the world meet: what they have in common, how they differ, and what they give each other — helping people find a common language, word by word. Kazakh greets first: the project's name is the Kazakh greeting *"Armysyz"* (*"Are you in peace and honour?"*). Its forms are a digital magazine, a 3D globe of encounters, and a language atlas.

Every encounter begins with human curiosity and mutual respect among equals — without didactic pressure, gamified streaks, or hierarchy between "major" and "minor" languages.

---

## What Is Already Built vs. Open Development Roadmap

### 1. Already Live in Production (`https://armysyz.kz`)
- **Language Encounters & 3D Globe (`https://armysyz.kz/en/`):** 99 trilingual (`KK` / `RU` / `EN`) encounters between Kazakh and languages across all inhabited continents, plus the core Kazakh hub (*Qazaq tili*), with original scripts, acoustic transcripts, and one-voice-at-a-time playback.
- **Language Atlas — Step 1 (`https://armysyz.kz/en/atlas/` & `./src/build-atlas-data.mjs`):**
  - Equal-area **Equal Earth** projection (`d3-geo-projection`) on **Natural Earth** public-domain boundaries (UN-recognized borders, neutral styling for disputed regions) so continental and island regions are never visually distorted.
  - Reproducible reconciliation of **Glottolog 5.3** (`CC BY 4.0`, genealogical trees, coordinates, ISO 639-3 / Glottocodes) and **Unicode CLDR 48** (`KK`/`RU`/`EN` localized names and endonyms) for the initial 100 languages.
  - Strict **`no invented translation` build gate**: if a language or family name is unattested in `CLDR 48` or peer-reviewed linguistic dictionaries for `KK`/`RU`, the pipeline outputs its verified self-name (`autonym`) and international code rather than fabricating coinages.

### 2. Already Built in Code (`./src/words.ts`, `./src/build-words-languages.mjs`)
- **"Бір сөз — көп тіл / One Word — Many Languages" — Part A (Client Architecture & Schema in `./src`):**
  - Data schema, validation rules, and searchable language registry generator (`~6,917` spoken and `224` sign languages from Glottolog 5.3 + CLDR 48) for shared human words (*greeting, mother, thank you, water*) and core comparative concepts across 12 human themes:
    - **Verification rule (`G21`):** Every word, literal meaning, and greeting response is verified by **2 independent native speakers (not from the same family) + an attested dictionary/academic source with publication year** (with a specialist linguist arbitrating dialectal or orthographic questions; regional variants are preserved side by side rather than discarded);
    - **Egalitarian voice cap (`G20`):** Up to 5 published native voices per word per language (maximum 2 from the same region/variety) so major and minority languages are heard on equal terms;
    - **Licensing separation (`G12`):**
      * **Wikimedia Commons / Lingua Libre / Wikidata Track:** All recordings of core dictionary vocabulary and greetings produced under Wikimedia community documentation initiatives are released under **`CC0 1.0`** (the standard license for Lingua Libre and Wikidata Lexeme forms), with signed adult (`18+`) speaker consent and zero non-commercial (`NC`) restrictions.
      * **Direct Web Submissions on `armysyz.kz`:** Individual visitors submitting directly through the website form may choose `CC0-1.0`, `CC-BY-4.0`, or `CC-BY-NC-4.0`; only `CC0-1.0` and `CC-BY-4.0` recordings are exported to Wikimedia Commons.

### 3. Open Technical & Documentation Tracks
*(Note: Software engineering on `armysyz.kz` and community voice documentation for Wikimedia Commons operate as independent tracks with separate budgets and deliverables. Field recording and Wikimedia Commons / Wikidata / Wiktionary uploads do not depend on website backend development.)*
1. **Wikimedia Open Audio & Lexicographical Documentation Track (Phase 1 — Kazakh `kaz`, Uzbek `uzb` & Tatar `tat`):**
   - Recording and verification of core everyday dictionary vocabulary and greetings in **Kazakh (`kaz`)**, **Uzbek (`uzb`)**, and **Tatar (`tat`)** as the initial three languages of the series, verified by independent native speakers + cited academic dictionary sources (`G21`), mastered to `.ogg` / `.wav`, uploaded to **Wikimedia Commons / Lingua Libre** under `CC0 1.0`, and linked to **Wikidata Lexeme Forms (`P443`)** and **Kazakh Wiktionary (`kk.wiktionary.org`)**.
2. **Open Software Engineering Roadmap (Independent of Wikimedia Content Grants):**
   - Scaling the Equal Earth static build pipeline from 100 languages to the full Glottolog 5.3 catalog (`~7,700` languages) and deploying the self-hosted web intake queue on `armysyz.kz`.

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
