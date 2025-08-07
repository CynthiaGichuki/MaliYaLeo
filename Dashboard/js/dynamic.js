function updateDashboardSummary() {
    if (typeof commodityMap === 'undefined' || Object.keys(commodityMap).length === 0) {
        // If commodity map isn't loaded yet, try again in a bit
        setTimeout(updateDashboardSummary, 500);
        return;
    }

    // Use the stored active section or detect it
    const activeSection = window.activeDashboardSection || document.querySelector('.section[style*="block"]')?.id || 'home';
    
    let countyDropdown, marketDropdown, commodityDropdown;

    // Only get dropdowns from the currently active section
    if (activeSection === 'home') {
        countyDropdown = document.getElementById("countyDropdown");
        marketDropdown = document.getElementById("marketDropdown");
        commodityDropdown = document.getElementById("commodityDropdown");
    } else if (activeSection === 'analytics') {
        countyDropdown = document.getElementById("analyticsCountyDropdown");
        marketDropdown = document.getElementById("analyticsMarketDropdown");
        commodityDropdown = document.getElementById("analyticsCommodityDropdown");
    } else {
        // For other sections (like markets), show totals
        resetDashboardToTotals();
        return;
    }

    // Get selected values 
    const selectedCounty = countyDropdown?.value || "";
    const selectedMarket = marketDropdown?.value || "";
    const selectedCommodity = commodityDropdown?.value || "";

    let totalCounties, totalMarkets, totalCommodities;

    if (!selectedCounty) {
        // Default state - show all totals
        totalCounties = Object.keys(countyMarketMap).length;
        totalMarkets = Object.values(countyMarketMap).reduce((sum, markets) => sum + markets.length, 0);
        
        // Count unique commodities across all counties and markets
        const allCommodities = new Set();
        Object.values(commodityMap).forEach(countyData => {
            Object.values(countyData).forEach(marketCommodities => {
                marketCommodities.forEach(commodity => allCommodities.add(commodity));
            });
        });
        totalCommodities = allCommodities.size;
        
    } else if (!selectedMarket) {
        // County selected - show markets and commodities in that county
        totalCounties = 1;
        totalMarkets = countyMarketMap[selectedCounty]?.length || 0;
        
        // Count unique commodities in this county
        const countyCommodities = new Set();
        if (commodityMap[selectedCounty]) {
            Object.values(commodityMap[selectedCounty]).forEach(marketCommodities => {
                marketCommodities.forEach(commodity => countyCommodities.add(commodity));
            });
        }
        totalCommodities = countyCommodities.size;
        
    } else if (!selectedCommodity) {
        // County + Market selected - show commodities in that market
        totalCounties = 1;
        totalMarkets = 1;
        totalCommodities = commodityMap[selectedCounty]?.[selectedMarket]?.length || 0;
        
    } else {
        // All selected - show 1 of each
        totalCounties = 1;
        totalMarkets = 1;
        totalCommodities = 1;
    }

    // Update the UI based on HTML structure
    const commodityValueEl = document.querySelector('.summary-box:nth-child(1) .value');
    const marketValueEl = document.querySelector('.summary-box:nth-child(2) .value');
    const countyValueEl = document.querySelector('.summary-box:nth-child(3) .value');

    if (commodityValueEl) commodityValueEl.textContent = totalCommodities;
    if (marketValueEl) marketValueEl.textContent = totalMarkets;
    if (countyValueEl) countyValueEl.textContent = totalCounties;

    // Add visual feedback for filtered state
    const summaryBoxes = document.querySelectorAll('.summary-box');
    if (selectedCounty || selectedMarket || selectedCommodity) {
        summaryBoxes.forEach(box => box.classList.add('filtered'));
    } else {
        summaryBoxes.forEach(box => box.classList.remove('filtered'));
    }
}

// Setup function that adds listeners only to the currently active section
function setupDashboardUpdates() {
    // Get the currently active section
    const activeSection = document.querySelector('.section[style*="block"]')?.id || 'home';
    
    // Store the active section globally so dashboard update knows which dropdowns to read
    window.activeDashboardSection = activeSection;
    
    if (activeSection === 'home') {
        // Add listeners to home section dropdowns only
        const countyDropdown = document.getElementById("countyDropdown");
        const marketDropdown = document.getElementById("marketDropdown");
        const commodityDropdown = document.getElementById("commodityDropdown");

        if (countyDropdown && !countyDropdown.hasAttribute('data-dashboard-listener')) {
            countyDropdown.addEventListener("change", updateDashboardSummary);
            countyDropdown.setAttribute('data-dashboard-listener', 'true');
        }
        if (marketDropdown && !marketDropdown.hasAttribute('data-dashboard-listener')) {
            marketDropdown.addEventListener("change", updateDashboardSummary);
            marketDropdown.setAttribute('data-dashboard-listener', 'true');
        }
        if (commodityDropdown && !commodityDropdown.hasAttribute('data-dashboard-listener')) {
            commodityDropdown.addEventListener("change", updateDashboardSummary);
            commodityDropdown.setAttribute('data-dashboard-listener', 'true');
        }
        
    } else if (activeSection === 'analytics') {
        // Add listeners to analytics section dropdowns only
        const analyticsCountyDropdown = document.getElementById("analyticsCountyDropdown");
        const analyticsMarketDropdown = document.getElementById("analyticsMarketDropdown");
        const analyticsCommodityDropdown = document.getElementById("analyticsCommodityDropdown");

        if (analyticsCountyDropdown && !analyticsCountyDropdown.hasAttribute('data-dashboard-listener')) {
            analyticsCountyDropdown.addEventListener("change", updateDashboardSummary);
            analyticsCountyDropdown.setAttribute('data-dashboard-listener', 'true');
        }
        if (analyticsMarketDropdown && !analyticsMarketDropdown.hasAttribute('data-dashboard-listener')) {
            analyticsMarketDropdown.addEventListener("change", updateDashboardSummary);
            analyticsMarketDropdown.setAttribute('data-dashboard-listener', 'true');
        }
        if (analyticsCommodityDropdown && !analyticsCommodityDropdown.hasAttribute('data-dashboard-listener')) {
            analyticsCommodityDropdown.addEventListener("change", updateDashboardSummary);
            analyticsCommodityDropdown.setAttribute('data-dashboard-listener', 'true');
        }
    }
    
    // Initial update for the active section
    setTimeout(updateDashboardSummary, 100);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for commodity map to load before setting up
    const checkCommodityMap = setInterval(() => {
        if (typeof commodityMap !== 'undefined' && Object.keys(commodityMap).length > 0) {
            setupDashboardUpdates();
            clearInterval(checkCommodityMap);
        }
    }, 100);
});

// Handle dashboard updates when switching sections
const sidebarLinks = document.querySelectorAll('.sidebar ul li[data-section]');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetSection = link.getAttribute('data-section');
        
        // Always reset to totals first when switching sections
        resetDashboardToTotals();
        
        // Wait for section to be visible, then setup listeners for that section only
        setTimeout(() => {
            setupDashboardUpdates(); // only add listeners to the active section
        }, 200);
    });
});

// Function to reset dashboard to show total figures
function resetDashboardToTotals() {
    if (typeof commodityMap === 'undefined' || Object.keys(commodityMap).length === 0) {
        setTimeout(resetDashboardToTotals, 500);
        return;
    }

    // Calculate totals regardless of form selections
    const totalCounties = Object.keys(countyMarketMap).length;
    const totalMarkets = Object.values(countyMarketMap).reduce((sum, markets) => sum + markets.length, 0);
    
    // Count unique commodities across all counties and markets
    const allCommodities = new Set();
    Object.values(commodityMap).forEach(countyData => {
        Object.values(countyData).forEach(marketCommodities => {
            marketCommodities.forEach(commodity => allCommodities.add(commodity));
        });
    });
    const totalCommodities = allCommodities.size;

    // Update the UI
    const commodityValueEl = document.querySelector('.summary-box:nth-child(1) .value');
    const marketValueEl = document.querySelector('.summary-box:nth-child(2) .value');
    const countyValueEl = document.querySelector('.summary-box:nth-child(3) .value');

    if (commodityValueEl) commodityValueEl.textContent = totalCommodities;
    if (marketValueEl) marketValueEl.textContent = totalMarkets;
    if (countyValueEl) countyValueEl.textContent = totalCounties;

    // Remove filtered state
    const summaryBoxes = document.querySelectorAll('.summary-box');
    summaryBoxes.forEach(box => box.classList.remove('filtered'));
}