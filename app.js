const defaultState = {
  risk: "balanced",
  assets: [
    { key: "usEquity", label: "US equity", value: 42, color: "#196b69" },
    { key: "intlEquity", label: "International equity", value: 18, color: "#426aa8" },
    { key: "bonds", label: "Core bonds", value: 25, color: "#c99728" },
    { key: "cash", label: "Cash", value: 8, color: "#7a8680" },
    { key: "alternatives", label: "Alternatives", value: 7, color: "#9b5f7f" },
  ],
};

const targets = {
  conservative: { usEquity: 28, intlEquity: 12, bonds: 45, cash: 10, alternatives: 5 },
  balanced: { usEquity: 42, intlEquity: 18, bonds: 28, cash: 7, alternatives: 5 },
  growth: { usEquity: 56, intlEquity: 24, bonds: 12, cash: 3, alternatives: 5 },
};

const scenarios = [
  { name: "Mild recession", returnShift: -0.18, contributionShift: -0.15 },
  { name: "Inflation pressure", returnShift: -0.08, contributionShift: -0.05 },
  { name: "Soft landing", returnShift: 0.04, contributionShift: 0.04 },
];

const form = document.querySelector("#plannerForm");
const chart = document.querySelector("#allocationChart");
const ctx = chart.getContext("2d");
const allocationRows = document.querySelector("#allocationRows");
const scenarioList = document.querySelector("#scenarioList");
const moveList = document.querySelector("#moveList");
const insightList = document.querySelector("#insightList");
const exportDialog = document.querySelector("#exportDialog");
const exportText = document.querySelector("#exportText");
const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const formatPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

let state = structuredClone(defaultState);

function numberFromInput(id) {
  return Number(document.querySelector(`#${id}`).value || 0);
}

function getInputs() {
  return {
    age: numberFromInput("age"),
    retirementAge: numberFromInput("retirementAge"),
    portfolioValue: numberFromInput("portfolioValue"),
    monthlyContribution: numberFromInput("monthlyContribution"),
    income: numberFromInput("income"),
    retirementGoal: numberFromInput("retirementGoal"),
    cashReserve: numberFromInput("cashReserve"),
    monthlyExpenses: numberFromInput("monthlyExpenses"),
    expectedReturn: numberFromInput("expectedReturn") / 100,
    inflation: numberFromInput("inflation") / 100,
  };
}

function futureValue(inputs, overrides = {}) {
  const years = Math.max(0, inputs.retirementAge - inputs.age);
  const annualReturn = Math.max(-0.5, inputs.expectedReturn + (overrides.returnShift || 0));
  const annualContribution = inputs.monthlyContribution * 12 * (1 + (overrides.contributionShift || 0));
  const growth = Math.pow(1 + annualReturn, years);
  if (annualReturn === 0) {
    return inputs.portfolioValue + annualContribution * years;
  }
  return inputs.portfolioValue * growth + annualContribution * ((growth - 1) / annualReturn);
}

function requiredMonthlyContribution(inputs) {
  const years = Math.max(1, inputs.retirementAge - inputs.age);
  const annualReturn = inputs.expectedReturn;
  const growth = Math.pow(1 + annualReturn, years);
  const futureCurrent = inputs.portfolioValue * growth;
  const gap = Math.max(0, inputs.retirementGoal - futureCurrent);
  if (annualReturn === 0) {
    return gap / years / 12;
  }
  const annualContribution = gap / ((growth - 1) / annualReturn);
  return annualContribution / 12;
}

function inflationAdjustedGoal(inputs) {
  const years = Math.max(0, inputs.retirementAge - inputs.age);
  return inputs.retirementGoal * Math.pow(1 + inputs.inflation, years);
}

function readinessScore(inputs, projected) {
  const base = Math.min(100, (projected / Math.max(1, inputs.retirementGoal)) * 100);
  const cashMonths = inputs.monthlyExpenses ? inputs.cashReserve / inputs.monthlyExpenses : 0;
  const cashBoost = Math.min(8, cashMonths);
  const savingsRate = inputs.income ? (inputs.monthlyContribution * 12) / inputs.income : 0;
  const savingsBoost = Math.min(10, savingsRate * 50);
  return Math.round(Math.min(100, base * 0.82 + cashBoost + savingsBoost));
}

function targetAllocation() {
  return targets[state.risk];
}

function drawAllocation() {
  const dpr = window.devicePixelRatio || 1;
  const size = 260;
  chart.width = size * dpr;
  chart.height = size * dpr;
  chart.style.width = `${size}px`;
  chart.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = 104;
  const lineWidth = 34;
  let start = -Math.PI / 2;

  state.assets.forEach((asset) => {
    const slice = (asset.value / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, start, start + slice);
    ctx.strokeStyle = asset.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "butt";
    ctx.stroke();
    start += slice;
  });

  ctx.beginPath();
  ctx.arc(center, center, radius - lineWidth / 2 - 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#17211c";
  ctx.font = "800 25px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.risk[0].toUpperCase() + state.risk.slice(1), center, center - 3);
  ctx.fillStyle = "#66716a";
  ctx.font = "700 13px Inter, system-ui, sans-serif";
  ctx.fillText("target profile", center, center + 20);
}

function renderAllocation(inputs) {
  const target = targetAllocation();
  const rows = state.assets
    .map(
      (asset) => `
        <div class="allocation-row" role="row">
          <span class="asset-name" role="cell">
            <span class="swatch" style="background:${asset.color}"></span>
            ${asset.label}
          </span>
          <span role="cell">${asset.value}%</span>
          <span role="cell">${target[asset.key]}%</span>
        </div>
      `,
    )
    .join("");
  allocationRows.innerHTML = rows;

  const drift = state.assets.reduce((sum, asset) => sum + Math.abs(asset.value - target[asset.key]), 0) / 2;
  document.querySelector("#rebalanceStatus").textContent = drift >= 8 ? "Rebalance" : "Aligned";
  document.querySelector("#rebalanceStatus").classList.toggle("neutral", drift < 8);
  drawAllocation(inputs);
}

function renderScenarios(inputs) {
  const goal = inputs.retirementGoal;
  scenarioList.innerHTML = scenarios
    .map((scenario) => {
      const projected = futureValue(inputs, scenario);
      const percent = Math.min(100, Math.max(4, (projected / Math.max(1, goal)) * 100));
      const shortfall = projected - goal;
      const tone = shortfall >= 0 ? "positive" : "negative";
      return `
        <article class="scenario-item">
          <div class="scenario-top">
            <strong>${scenario.name}</strong>
            <span class="${tone}">${formatCurrency.format(shortfall)}</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill ${tone}" style="width:${percent}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMoves(inputs) {
  const target = targetAllocation();
  const moves = state.assets
    .map((asset) => {
      const deltaPercent = target[asset.key] - asset.value;
      const dollars = (inputs.portfolioValue * Math.abs(deltaPercent)) / 100;
      return { ...asset, deltaPercent, dollars };
    })
    .filter((move) => Math.abs(move.deltaPercent) >= 2)
    .sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));

  if (!moves.length) {
    moveList.innerHTML = `
      <article class="move-item">
        <div class="move-top">
          <strong>Allocation is inside the drift band</strong>
          <span>No major move</span>
        </div>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:100%"></div></div>
      </article>
    `;
    return;
  }

  moveList.innerHTML = moves
    .map((move) => {
      const action = move.deltaPercent > 0 ? "Buy" : "Trim";
      const className = move.deltaPercent > 0 ? "buy" : "sell";
      const width = Math.min(100, Math.max(12, Math.abs(move.deltaPercent) * 8));
      return `
        <article class="move-item ${className}">
          <div class="move-top">
            <strong>${action} ${move.label}</strong>
            <span>${formatCurrency.format(move.dollars)} / ${Math.abs(move.deltaPercent)} pts</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width:${width}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderInsights(inputs, projected, score) {
  const cashMonths = inputs.monthlyExpenses ? inputs.cashReserve / inputs.monthlyExpenses : 0;
  const savingsRate = inputs.income ? (inputs.monthlyContribution * 12) / inputs.income : 0;
  const required = requiredMonthlyContribution(inputs);
  const insights = [];

  if (score < 75) {
    insights.push(
      `Increase monthly contributions toward ${formatCurrency.format(required)} to improve retirement readiness.`,
    );
  } else {
    insights.push("The current contribution pace is broadly aligned with the stated retirement goal.");
  }

  if (cashMonths < 4) {
    insights.push(`Cash reserve covers ${cashMonths.toFixed(1)} months; target at least 4 to 6 months before adding risk.`);
  } else {
    insights.push(`Cash reserve covers ${cashMonths.toFixed(1)} months, supporting a steadier investment plan.`);
  }

  if (savingsRate < 0.12) {
    insights.push(`Savings rate is ${formatPercent.format(savingsRate)}; consider auto-escalation after income changes.`);
  } else {
    insights.push(`Savings rate is ${formatPercent.format(savingsRate)}, a strong foundation for compounding.`);
  }

  const realGoal = inflationAdjustedGoal(inputs);
  if (realGoal > projected) {
    insights.push(`Inflation-adjusted target is ${formatCurrency.format(realGoal)}, so purchasing power needs monitoring.`);
  }

  insightList.innerHTML = insights.map((insight) => `<li>${insight}</li>`).join("");
}

function renderMetrics(inputs) {
  const projected = futureValue(inputs);
  const goal = inputs.retirementGoal;
  const gap = requiredMonthlyContribution(inputs) - inputs.monthlyContribution;
  const cashMonths = inputs.monthlyExpenses ? inputs.cashReserve / inputs.monthlyExpenses : 0;
  const score = readinessScore(inputs, projected);

  document.querySelector("#projectedValue").textContent = formatCurrency.format(projected);
  document.querySelector("#projectionDelta").textContent =
    projected >= goal ? `${formatCurrency.format(projected - goal)} above goal` : `${formatCurrency.format(goal - projected)} short`;
  document.querySelector("#readinessScore").textContent = score;
  document.querySelector("#readinessCopy").textContent =
    score >= 85 ? "Strong" : score >= 70 ? "Watch list" : "Needs attention";
  document.querySelector("#monthlyGap").textContent = gap > 0 ? formatCurrency.format(gap) : "$0";
  document.querySelector("#cashRunway").textContent = `${cashMonths.toFixed(1)} mo`;
  document.querySelector("#cashRunwayCopy").textContent = cashMonths >= 6 ? "Healthy reserve" : "Build reserve";
  document.querySelector("#riskStatus").textContent = state.risk[0].toUpperCase() + state.risk.slice(1);
  renderInsights(inputs, projected, score);
}

function renderExport(inputs) {
  const projected = futureValue(inputs);
  const score = readinessScore(inputs, projected);
  const target = targetAllocation();
  const allocation = state.assets.map((asset) => `- ${asset.label}: ${asset.value}% current / ${target[asset.key]}% target`).join("\n");

  return `Fidelity Investment Insights

Planning snapshot
- Age: ${inputs.age}
- Retirement age: ${inputs.retirementAge}
- Current portfolio: ${formatCurrency.format(inputs.portfolioValue)}
- Monthly contribution: ${formatCurrency.format(inputs.monthlyContribution)}
- Retirement goal: ${formatCurrency.format(inputs.retirementGoal)}
- Projected value: ${formatCurrency.format(projected)}
- Readiness score: ${score}/100
- Risk profile: ${state.risk}

Allocation
${allocation}

Notes
- Educational prototype only.
- Review assumptions before making financial decisions.
- Not affiliated with Fidelity Investments.`;
}

function render() {
  document.querySelector("#expectedReturnOutput").textContent = `${numberFromInput("expectedReturn")}%`;
  document.querySelector("#inflationOutput").textContent = `${numberFromInput("inflation")}%`;
  const inputs = getInputs();
  renderMetrics(inputs);
  renderAllocation(inputs);
  renderScenarios(inputs);
  renderMoves(inputs);
}

form.addEventListener("input", render);
document.querySelector("#expectedReturn").addEventListener("input", render);
document.querySelector("#inflation").addEventListener("input", render);

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.risk = button.dataset.risk;
    document.querySelectorAll(".segment").forEach((segment) => segment.classList.remove("is-active"));
    button.classList.add("is-active");
    render();
  });
});

document.querySelector("#resetButton").addEventListener("click", () => {
  state = structuredClone(defaultState);
  form.reset();
  document.querySelector("#expectedReturn").value = 6.5;
  document.querySelector("#inflation").value = 2.75;
  document.querySelectorAll(".segment").forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.risk === "balanced");
  });
  render();
});

document.querySelector("#exportButton").addEventListener("click", () => {
  exportText.value = renderExport(getInputs());
  exportDialog.showModal();
});

window.addEventListener("resize", drawAllocation);
render();
