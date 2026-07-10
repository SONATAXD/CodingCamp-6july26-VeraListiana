# Ledger — Expense & Budget Visualizer

A mobile-friendly web app for tracking daily spending: add transactions, see your total balance update live, and view a pie chart of spending by category. Built with plain HTML, CSS, and JavaScript — no frameworks, no backend, no build step.

## Features

- **Input form** — item name, amount, category (with validation)
- **Transaction list** — scrollable, deletable, sortable
- **Total balance** — updates automatically
- **Pie chart** — spending by category, powered by Chart.js (loaded via CDN)
- **Data persistence** — everything is saved in the browser's Local Storage

### Optional challenges implemented
- ✅ Custom categories — click "+ Add custom category" in the form
- ✅ Sort transactions — by newest, amount, or category
- ✅ Dark / light mode toggle — the moon/sun icon in the header

## Folder structure

```
expense-visualizer/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

## Running it locally

No build tools needed. Just open `index.html` in a browser, or use a local server (recommended so Local Storage behaves consistently):

```bash
# Python
python3 -m http.server 8000

# or VS Code / Kiro's "Live Server" extension
```

Then visit `http://localhost:8000`.

## Tech notes

- Chart.js is loaded from a CDN (`cdn.jsdelivr.net`) — an internet connection is needed the first time the page loads.
- All data (transactions + custom categories + theme preference) is stored client-side only, under the `ledger_*` keys in `localStorage`. Clearing browser data will reset the app.
