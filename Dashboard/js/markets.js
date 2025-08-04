// markets.js - Simple markets functionality
let allMarketData = [];
let filteredData = [];

// Generate market data from your existing commodity map
async function generateMarketData() {
    await loadCommodityMap(); // Use your existing function
    const marketData = [];
    const now = new Date();

    // Loop through your existing countyMarketMap and commodityMap
    Object.entries(countyMarketMap).forEach(([county, markets]) => {
        markets.forEach(market => {
            // Get commodities for this county/market from commodityMap
            const commodities = commodityMap[county]?.[market] || ['Maize', 'Beans', 'Tomatoes']; // fallback
            
            commodities.forEach(commodity => {
                const basePrice = getBasePriceForCommodity(commodity);
                const currentPrice = basePrice + (Math.random() - 0.5) * 20;
                const change = (Math.random() - 0.5) * 10; // Random change %

                marketData.push({
                    county,
                    market,
                    commodity,
                    price: Math.round(currentPrice),
                    change: Math.round(change * 10) / 10,
                    date: new Date(now - Math.random() * 24 * 60 * 60 * 1000) // Random time within 24h
                });
            });
        });
    });

    return marketData;
}

// Base prices for commodities
function getBasePriceForCommodity(commodity) {
    const basePrices = {
        'Maize': 55, 'Beans': 85, 'Rice': 120, 'Wheat': 65,
        'Tomatoes': 70, 'Potatoes': 45, 'Onions': 60, 'Carrots': 55,
        'Cabbage': 40, 'Kales': 35, 'Bananas': 50, 'Oranges': 80,
        'Mangoes': 90, 'Avocado': 150, 'Fish': 320
    };
    return basePrices[commodity] || 60;
}

// Populate markets table
function populateMarketsTable() {
    const tbody = document.querySelector('#markets tbody');
    if (!tbody || filteredData.length === 0) return;

    tbody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${item.county}</td>
            <td>${item.market}</td>
            <td>${item.commodity}</td>
            <td class="price-cell">
                ${item.price} KES
                <span class="price-change ${item.change >= 0 ? 'price-up' : 'price-down'}">
                    ${item.change >= 0 ? '+' : ''}${item.change}%
                </span>
            </td>
            <td class="date-cell">${formatDate(item.date)}</td>
        </tr>
    `).join('');
}

// Simple date formatter
function formatDate(date) {
    return new Intl.DateTimeFormat('en-KE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Update your existing markets table HTML structure
function updateMarketsTableStructure() {
    const marketsSection = document.getElementById('markets');
    if (!marketsSection) return;

    marketsSection.innerHTML = `
        <div class="markets-header">
            <h2>Current Market Prices</h2>
            <button class="refresh-btn" onclick="refreshMarketData()">
                <i class="fa fa-refresh"></i> Refresh
            </button>
        </div>
        
        <div class="markets-filters">
            <select id="countyFilter">
                <option value="">All Counties</option>
            </select>
            <select id="commodityFilter">
                <option value="">All Commodities</option>
            </select>
            <input type="text" id="searchInput" placeholder="Search...">
        </div>

        <table class="markets-table">
            <thead>
                <tr>
                    <th onclick="sortTable('county')">County</th>
                    <th onclick="sortTable('market')">Market</th>
                    <th onclick="sortTable('commodity')">Commodity</th>
                    <th onclick="sortTable('price')">Price (KES/kg)</th>
                    <th onclick="sortTable('date')">Last Updated</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    setupFilters();
}

// Setup filter dropdowns
function setupFilters() {
    const countyFilter = document.getElementById('countyFilter');
    const commodityFilter = document.getElementById('commodityFilter');
    const searchInput = document.getElementById('searchInput');

    if (countyFilter) {
        // Populate county filter
        const counties = [...new Set(allMarketData.map(item => item.county))].sort();
        counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countyFilter.appendChild(option);
        });

        countyFilter.addEventListener('change', applyFilters);
    }

    if (commodityFilter) {
        // Populate commodity filter
        const commodities = [...new Set(allMarketData.map(item => item.commodity))].sort();
        commodities.forEach(commodity => {
            const option = document.createElement('option');
            option.value = commodity;
            option.textContent = commodity;
            commodityFilter.appendChild(option);
        });

        commodityFilter.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
}

// Apply filters
function applyFilters() {
    const countyFilter = document.getElementById('countyFilter')?.value || '';
    const commodityFilter = document.getElementById('commodityFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    filteredData = allMarketData.filter(item => {
        const matchesCounty = !countyFilter || item.county === countyFilter;
        const matchesCommodity = !commodityFilter || item.commodity === commodityFilter;
        const matchesSearch = !searchTerm || 
            item.county.toLowerCase().includes(searchTerm) ||
            item.market.toLowerCase().includes(searchTerm) ||
            item.commodity.toLowerCase().includes(searchTerm);

        return matchesCounty && matchesCommodity && matchesSearch;
    });

    populateMarketsTable();
}

// Simple sorting
let currentSort = { column: null, direction: 'asc' };

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        if (column === 'price') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        } else if (column === 'date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    populateMarketsTable();
}

// Refresh market data
async function refreshMarketData() {
    allMarketData = await generateMarketData();
    filteredData = [...allMarketData];
    populateMarketsTable();
    setupFilters(); // Refresh filters too
}

// Initialize markets when page loads
async function initializeMarkets() {
    allMarketData = await generateMarketData();
    filteredData = [...allMarketData];
    updateMarketsTableStructure();
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other scripts have loaded
    setTimeout(initializeMarkets, 500);
});