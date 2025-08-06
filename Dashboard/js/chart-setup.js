//Analytics functionality
const countyDropdown = document.getElementById("analyticsCountyDropdown");
const marketDropdown = document.getElementById("analyticsMarketDropdown");
const commodityDropdown = document.getElementById("analyticsCommodityDropdown");
const daysDropdown = document.getElementById("analyticsDaysDropdown");
const priceTypeDropDown = document.getElementById("priceType");
const generateGraphBtn = document.getElementById("generateGraphBtn");

let marketChart = null;


// Populate county dropdown
Object.keys(countyMarketMap).sort().forEach(county => {
  const option = document.createElement("option");
  option.value = county;
  option.textContent = county;
  countyDropdown.appendChild(option);
});

// Populate markets based on selected county
countyDropdown.addEventListener("change", () => {
  const selectedCounty = countyDropdown.value;
  const markets = countyMarketMap[selectedCounty] || [];

  marketDropdown.innerHTML = '<option value="">-- Select Market --</option>';
  markets.forEach(market => {
    const option = document.createElement("option");
    option.value = market;
    option.textContent = market;
    marketDropdown.appendChild(option);
  });
  // Clear commodity options too
  commodityDropdown.innerHTML = '<option value="">-- Select Commodity --</option>';
});

// Populate commodity dropdown once county and market selected
marketDropdown.addEventListener("change", async () => {
  const county = countyDropdown.value;
  const market = marketDropdown.value;

  commodityDropdown.innerHTML = '<option value="">-- Select Commodity --</option>';
  if (commodityMap[county] && commodityMap[county][market]) {
    commodityMap[county][market].forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      commodityDropdown.appendChild(option);
    });
  }

  resetChart();
});

// Fetch commodity trend data 
async function fetchCommodityTrendDataReal(county, market, commodity, days) {
  const queryParams = new URLSearchParams({
    county,
    market,
    commodity,
    days
  });

  const response = await fetch(`https://maliyaleo.onrender.com/history?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch trend data");
  }

  const json = await response.json();
  return json; 
}

function resetChart() {
  if (marketChart) {
    marketChart.data.labels = [];
    marketChart.data.datasets[0].data = [];
    marketChart.data.datasets[0].label = "No data yet";
    marketChart.update();
  }
}

async function updateChart() {
  const county = countyDropdown.value;
  const market = marketDropdown.value;
  const commodity = commodityDropdown.value;
  const days = daysDropdown.value;
  const priceType = priceTypeDropDown.value;

  if (!county || !market || !commodity || !days || !priceType) {
    console.warn("Missing input for chart update");
    return;
  }

 try {
    if (!marketChart) {
      // Init chart if not already created
      const ctx = document.getElementById("marketChart").getContext("2d");
      marketChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [{
            label: "Loading...",
            data: [],
            borderWidth: 2,
            fill: false,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Date' }
            },
            y: {
              title: { display: true, text: 'Price (KES/kg)' },
              beginAtZero: true
            }
          }
        }
      });
    }

    marketChart.data.datasets[0].label = `Loading ${commodity} data...`;
    marketChart.update();

    const trendData = await fetchCommodityTrendDataReal(county, market, commodity, days);
    const labels = trendData.data.map(entry => entry.Date);
    const dataPoints = trendData.data.map(entry => entry[priceType]);

    marketChart.data.labels = labels;
    marketChart.data.datasets[0].label = `${market} ${commodity} ${priceType === "RetailUnitPrice" ? "Retail" : "Wholesale"} Prices (KES/kg)`;
    marketChart.data.datasets[0].data = dataPoints;
    marketChart.update();

  } catch (error) {
    console.error("Error updating chart:", error);
    marketChart.data.datasets[0].label = `Error loading ${commodity} data`;
    marketChart.update();
  }
}

// Reset chart on changes but do not update automatically
commodityDropdown.addEventListener("change", resetChart);
daysDropdown.addEventListener("change", resetChart);
priceTypeDropDown.addEventListener("change", resetChart);
marketDropdown.addEventListener("change", resetChart);
countyDropdown.addEventListener("change", resetChart);

// only trigger update when user clicks the button
generateGraphBtn?.addEventListener("click", updateChart);
