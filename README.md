# Fidelity Investment Insights

A static investment-planning prototype built for brokerage, retirement, and advisor-style workflows. It helps a user explore portfolio allocation, retirement readiness, stress scenarios, cash runway, and rebalancing moves without requiring a backend or paid market-data API.

This project is educational and is not affiliated with Fidelity Investments.

## Features

- Retirement projection using current portfolio value, contribution rate, age, expected return, and inflation assumptions.
- Readiness score with savings-rate and cash-reserve context.
- Conservative, balanced, and growth target allocations.
- Visual allocation chart and asset-class drift table.
- Rebalancing suggestions based on current versus target allocation.
- Stress scenarios for recession, inflation pressure, and soft-landing cases.
- Exportable planning snapshot for advisor or household review.
- Fully static deployment through GitHub Pages.

## Local Preview

Open `index.html` in a browser, or serve the directory locally:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deployment

The repository is configured for GitHub Pages from the `main` branch at the repository root. Pushes to `main` publish the static site at:

https://mohan143-web.github.io/fidelity-investment-insights/

## Project Notes

- The app intentionally avoids live brokerage data, account aggregation, or investment recommendations.
- Calculations are simplified and intended for product demonstration.
- No user data leaves the browser.
