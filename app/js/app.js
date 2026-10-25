// Astro-Compass Dashboard SPA Controller (app.js)

document.addEventListener("DOMContentLoaded", () => {
  renderSBCGrid();
  renderEquityChart();
});

// Render the 81-Square Sarvatobhadra Chakra Grid
function renderSBCGrid() {
  const container = document.getElementById("sbc-matrix");
  if (!container) return;

  const sbcSampleLetters = [
    "അ", "ആ", "ഇ", "ഈ", "ഉ", "ഊ", "ഋ", "ൠ", "ഌ",
    "ക്രി", "രോ", "മൃ", "ആർ", "പു", "പൂ", "ആ", "മ", "പൂ",
    "ഉ", "ഹ", "ചി", "സ്വാ", "വി", "അ", "ജ്യേ", "മൂ", "പൂ",
    "ഉ", "അഭി", "ശ്ര", "ധ", "ശ", "പൂ", "ഉ", "രേ", "അ",
    "ഭ", "കൃ", "രോ", "മൃ", "ആ", "പു", "പൂ", "ആ", "മ",
    "പൂ", "ഉ", "ഹ", "ചി", "സ്വാ", "വി", "അ", "ജ്യേ", "മൂ",
    "ക", "ഖ", "ഗ", "ഘ", "ങ", "ച", "ഛ", "ജ", "ഝ",
    "ഞ", "ട", "ഠ", "ഡ", "ഢ", "ണ", "ത", "ഥ", "ദ",
    "ധ", "ന", "പ", "ഫ", "ബ", "ഭ", "മ", "യ", "ര"
  ];

  // Specific active Vedha coordinates (e.g. Jupiter aspecting Revati & Moon)
  const subhaIndices = new Set([4, 13, 22, 31, 40, 49, 58, 67, 76]); // Jupiter ray
  const papaIndices = new Set([10, 19, 28, 37]);                      // Saturn ray

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.className = "sbc-cell";
    cell.textContent = sbcSampleLetters[i] || `${i + 1}`;

    if (subhaIndices.has(i)) {
      cell.classList.add("active-subha");
    } else if (papaIndices.has(i)) {
      cell.classList.add("active-papa");
    }

    container.appendChild(cell);
  }
}

// Render Comparative Equity Curves using Chart.js
function renderEquityChart() {
  const ctx = document.getElementById("equityChart");
  if (!ctx) return;

  // Mock initial 10-day comparison curve
  const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9", "Today"];

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Trader 1: Pure AI Control",
          data: [1000000, 1002400, 1008500, 1006200, 1014500, 1018900, 1022000, 1029500, 1038000, 1042500],
          borderColor: "#3b82f6", // Blue
          backgroundColor: "rgba(59, 130, 246, 0.05)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2
        },
        {
          label: "Trader 2: Sunil (Father)",
          data: [1000000, 1003100, 1011200, 1009800, 1019800, 1026500, 1032000, 1041000, 1051500, 1058200],
          borderColor: "#d4af37", // Gold
          backgroundColor: "rgba(212, 175, 55, 0.05)",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 2
        },
        {
          label: "Trader 3: Neil (Son - Protected)",
          data: [1000000, 1001200, 1004500, 1003800, 1008200, 1011500, 1013200, 1015800, 1019000, 1021500],
          borderColor: "#10b981", // Emerald Green
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2
        },
        {
          label: "Trader 4: Shine (Brother)",
          data: [1000000, 1002800, 1009100, 1007400, 1016200, 1021000, 1025800, 1031200, 1037500, 1041000],
          borderColor: "#f59e0b", // Amber
          backgroundColor: "rgba(245, 158, 11, 0.05)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2
        }
      ]
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
