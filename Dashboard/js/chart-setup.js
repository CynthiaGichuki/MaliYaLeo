//Analytics functionality
const analyticsCommodityDropdown = document.getElementById("analyticsCommodityDropdown");

// Populate analytics commodity dropdown
async function populateAnalyticsCommodities() {
  await loadCommodityMap(); // global commodityMap

  const uniqueCommodities = new Set();

  Object.values(commodityMap).forEach(markets => {
    Object.values(markets).forEach(commodities => {
      if (Array.isArray(commodities)) {
        commodities.forEach(c => uniqueCommodities.add(c));
      }
    });
  });

  // Clear existing options except the default
  analyticsCommodityDropdown.innerHTML = '<option value="">-- Select Commodity --</option>';

  // Populate with sorted commodities
  [...uniqueCommodities].sort().forEach(commodity => {
    const option = document.createElement("option");
    option.value = commodity;
    option.textContent = commodity;
    analyticsCommodityDropdown.appendChild(option);
  });
}

// Fetch commodity trend data (replace with real API call later)
async function fetchCommodityTrendData(commodity) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fakeData = {};

  months.forEach(month => {
    fakeData[month] = Math.floor(Math.random() * 100) + 50;
  });

  return fakeData;
}

// Handle commodity selection and update chart
analyticsCommodityDropdown.addEventListener("change", async function () {
  const selectedCommodity = this.value;
  
  if (!selectedCommodity) {
    // Reset chart if no commodity selected
    marketChart.data.labels = [];
    marketChart.data.datasets[0].label = 'Select a commodity to view trends';
    marketChart.data.datasets[0].data = [];
    marketChart.update();
    return;
  }

  try {
    //loading state
    marketChart.data.datasets[0].label = `Loading ${selectedCommodity} data...`;
    marketChart.update();

    // Fetch and update chart data
    const trendData = await fetchCommodityTrendData(selectedCommodity);
    const labels = Object.keys(trendData);
    const dataPoints = Object.values(trendData);

    marketChart.data.labels = labels;
    marketChart.data.datasets[0].label = `${selectedCommodity} Prices (KES/kg)`;
    marketChart.data.datasets[0].data = dataPoints;
    marketChart.update();

  } catch (error) {
    console.error("Error fetching commodity data:", error);
    marketChart.data.datasets[0].label = `Error loading ${selectedCommodity} data`;
    marketChart.update();
  }
});

populateAnalyticsCommodities();