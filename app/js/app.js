// Mock Trading Dashboard Controller (app.js)

document.addEventListener("DOMContentLoaded", () => {
  renderEquityChart();
});

// Render Comparative Equity Curves using Chart.js
function renderEquityChart() {
  const ctx = document.getElementById("equityChart");
  if (!ctx) return;

  // Seed point only; real NAV series are read from data/live_ledger/ in Phase 5
  const labels = ["Start"];
  const accounts = [
    { label: "Account 1: Index Benchmark", color: "#3b82f6" },
    { label: "Account 2: Sunil", color: "#d4af37" },
    { label: "Account 3: Neil", color: "#10b981" },
    { label: "Account 4: Shine", color: "#f59e0b" },
    { label: "Account 5: Sandbox", color: "#a855f7" }
  ];

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: accounts.map((a) => ({
        label: a.label,
        data: [1000000],
        borderColor: a.color,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#9ca3af",
            font: { size: 12, family: "'Inter', sans-serif" },
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ₹${context.raw.toLocaleString("en-IN")}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#6b7280" }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#6b7280",
            callback: function (val) {
              return `₹${(val / 100000).toFixed(1)}L`;
            }
          }
        }
      }
    }
  });
}
