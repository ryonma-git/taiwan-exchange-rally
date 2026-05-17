# Handoff Notes

## Project

Taiwan exchange school QR quiz rally web app.

- Stack: React + TypeScript + Vite static app
- Main data file: `src/data/questions.json`
- App URL format:
  - Question: `/?q=r15hn85q` for J01 in the current dummy data
  - Treasure: `/?treasure=r16izxik` for T01 in the current treasure data
- Deployment target: GitHub Pages
  - Public URL: `https://ryonma-git.github.io/taiwan-exchange-rally/`
  - Pages source: `gh-pages` branch
  - Workflow: `.github/workflows/deploy-pages.yml`

## Core Rules

- QR scanning is not implemented in the app. Students use the iPad Camera app, then open Safari.
- Scores, team name, answer history, used translation keys, claimed treasure IDs, and timer state are stored in LocalStorage.
- One team uses one device. Do not switch browser/device during the event.
- Result collection is manual: teams show or screenshot the Result screen and submit through LoiloNote.
- J questions should be Japanese.
- C questions should be Traditional Chinese / Taiwanese Mandarin.
- `translationText` is a translation, not a hint.
- Question URLs use opaque public codes generated from internal IDs. The internal IDs like `J01` remain in `questions.json`, QR card labels, question posters, and answer history.
- Treasure URLs also use opaque public codes. The internal claimed IDs remain `T01` and `T02`.
- Debug aliases are accepted by the app: `?q=J01` resolves to the same screen as the opaque URL for J01, and `?treasure=T01` resolves to the same screen as the opaque treasure URL. Generated QR lists and print PDFs must still output only opaque URLs.

## Important Commands

```bash
npm run dev
npm run lint
npm run build
npm run generate:question-template
npm run import:questions
npm run generate:qr -- --base https://ryonma-git.github.io/taiwan-exchange-rally/
npm run generate:print -- --base https://ryonma-git.github.io/taiwan-exchange-rally/
VITE_BASE_PATH=/taiwan-exchange-rally/ npm run build
```

## Generated Files

- QR URL data:
  - `public/qr-data/qr_urls.csv`
  - `public/qr-data/qr_urls.json`
- `public/qr-data/samples/*.png`
- Question replacement Excel:
  - `dist-print/question_replacement_template.xlsx`
- Print PDFs:
  - `dist-print/qr_cards.pdf`
  - `dist-print/treasure_cards.pdf`
  - `dist-print/question_posters.pdf`
  - `dist-print/answer_sheet.pdf`

## Current Features

- Start screen with team name registration
- Home screen with score, solved count, translation keys, timer, QR guidance, safety guidance
- Question screen from `?q=...`
- Old internal URLs such as `?q=J01` are intentionally not used for printed QR cards.
- Fixed UI text is displayed with Japanese and Traditional Chinese side by side.
- One answer per question
- Confirm dialog before answer submission
- Dedicated correct/incorrect result screen after answer submission
- Translation Key feature with limited uses
- Excel question imports combine `translationQuestion` and `translationChoice1`-`translationChoice4` into `translationText` using `A. ...` lines.
- Excel `translationExplanation` is imported into `questions.json` and shown on the answer result screen as the explanation translation.
- Treasure QR feature that grants one translation key once per treasure ID
- Result screen optimized for screenshot collection
- Teacher reset with two confirmations
- LocalStorage hardening and question-set signature reset
- GitHub Pages deployment through `gh-pages`

## Assets

- `public/assets/treasure-chest.png`: user-provided treasure chest image
- `public/assets/noto-emoji/*.svg`: Google Noto Emoji assets
  - License: SIL Open Font License 1.1

## Notes For Next Agent

- Keep the app static. Avoid adding server-side aggregation unless explicitly requested.
- If adding central collection, it needs an external endpoint such as Google Apps Script, Google Forms, Firebase, or Supabase, and school iPad allowlist testing.
- Before production QR printing, regenerate QR/PDF with the final deployment URL.
- If `questions.json` changes, existing LocalStorage answer history resets automatically because the app stores a question-set signature.
- Timer default is 20 minutes. It starts when the team starts the rally and blocks new unanswered questions after the limit.
- The per-device time limit can be changed from the Start screen before pressing Start.

## Verification Checklist

Before handing back:

```bash
npm run lint
npm run build
npm run generate:print -- --base https://ryonma-git.github.io/taiwan-exchange-rally/
```

Then push:

```bash
git add .
git commit -m "..."
git push origin main
```
