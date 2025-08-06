let allMarketData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;

// Pagination variables
const paginationConfig = {
    itemsPerPage: 10,
    currentPage: 1,
    totalPages: 0
};

// Fetch real current market prices from /latest endpoint
async function fetchLatestMarketData() {
    const marketData = [];
    
    try {
        // Get all county/market/commodity combinations from existing maps
        await loadCommodityMap(); 
        
        const fetchPromises = [];
        
        Object.entries(countyMarketMap).forEach(([county, markets]) => {
            markets.forEach(market => {
                const commodities = commodityMap[county]?.[market] || [];
                
                commodities.forEach(commodity => {
                    // Fetch latest data for each combination
                    const params = new URLSearchParams({
                        commodity,
                        county,
                        market
                    });
                    
                    const fetchPromise = fetch(`https://maliyaleo.onrender.com/latest?${params.toString()}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === "success" && data.data && data.data.Predicted_prices) {
                                const predictions = data.data.Predicted_prices;
                                
                                // Get today's prediction (closest to today)
                                const today = new Date().toISOString().split('T')[0]; 
                                let todayPrediction = predictions.find(p => p.Date === today);
                                
                                // If no exact match for today, get the closest future prediction
                                if (!todayPrediction) {
                                    const sortedPredictions = predictions.sort((a, b) => 
                                        new Date(a.Date) - new Date(b.Date)
                                    );
                                    todayPrediction = sortedPredictions[0];
                                }
                                
                                // LATEST prediction instead
                                // const sortedPredictions = predictions.sort((a, b) => 
                                //     new Date(b.Date) - new Date(a.Date)
                                // );
                                // todayPrediction = sortedPredictions[0];
                                
                                if (todayPrediction) {
                                    marketData.push({
                                        county: data.data.County,
                                        market: data.data.Market,
                                        commodity: data.data.Commodity,
                                        classification: data.data.Classification || 'N/A',
                                        wholesalePrice: todayPrediction.Wholesale.toFixed(2),
                                        retailPrice: todayPrediction.Retail.toFixed(2),
                                        date: todayPrediction.Date,
                                        currency: data.data.Currency || 'KES',
                                        priceType: 'predicted'
                                    });
                                }
                            }
                        })
                        .catch(error => {
                            console.warn(`Failed to fetch data for ${commodity} in ${market}, ${county}:`, error);
                        });
                    
                    fetchPromises.push(fetchPromise);
                });
            });
        });
        
        // Wait for all API calls to complete
        await Promise.all(fetchPromises);
        
        console.log(`Fetched ${marketData.length} market price records`);
        return marketData;
        
    } catch (error) {
        console.error("Error fetching market data:", error);
        return [];
    }
}

// Populate markets table with pagination
function populateMarketsTable() {
    const tbody = document.querySelector('#markets tbody');
    if (!tbody || filteredData.length === 0) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No market data available</td></tr>';
        }
        updatePagination(0);
        return;
    }

    // Calculate pagination
    const totalItems = filteredData.length;
    paginationConfig.totalPages = Math.ceil(totalItems / paginationConfig.itemsPerPage);
    
    // Get items for current page
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.itemsPerPage;
    const endIndex = startIndex + paginationConfig.itemsPerPage;
    const currentPageData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = currentPageData.map(item => `
        <tr>
            <td>${item.county}</td>
            <td>${item.market}</td>
            <td>${item.commodity}</td>
            <td>${item.classification}</td>
            <td class="price-cell">
                <div>Wholesale: <strong>${item.wholesalePrice} ${item.currency || 'KES'}</strong></div>
                <div>Retail: <strong>${item.retailPrice} ${item.currency || 'KES'}</strong></div>
            </td>
            <td class="date-cell">${formatDate(item.date)}</td>
        </tr>
    `).join('');

    updatePagination(totalItems);
}

// Update pagination controls
function updatePagination(totalItems) {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / paginationConfig.itemsPerPage);
    paginationConfig.totalPages = totalPages;

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    
    const startItem = totalItems === 0 ? 0 : (paginationConfig.currentPage - 1) * paginationConfig.itemsPerPage + 1;
    const endItem = Math.min(paginationConfig.currentPage * paginationConfig.itemsPerPage, totalItems);

    paginationContainer.innerHTML = `
        <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${totalItems} results
        </div>
        <div class="pagination-controls">
            <button ${paginationConfig.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${paginationConfig.currentPage - 1})">
                <i class="fa fa-chevron-left"></i> Previous
            </button>
            <span class="page-numbers">
                ${generatePageNumbers()}
            </span>
            <button ${paginationConfig.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${paginationConfig.currentPage + 1})">
                Next <i class="fa fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// Generate page numbers
function generatePageNumbers() {
    const maxVisible = 5;
    const current = paginationConfig.currentPage;
    const total = paginationConfig.totalPages;
    let pages = [];

    if (total <= maxVisible) {
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        if (current <= 3) {
            pages = [1, 2, 3, 4, '...', total];
        } else if (current >= total - 2) {
            pages = [1, '...', total - 3, total - 2, total - 1, total];
        } else {
            pages = [1, '...', current - 1, current, current + 1, '...', total];
        }
    }

    return pages.map(page => {
        if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
        }
        return `<button class="page-btn ${page === current ? 'active' : ''}" onclick="changePage(${page})">${page}</button>`;
    }).join('');
}

// Change page
function changePage(page) {
    if (page < 1 || page > paginationConfig.totalPages) return;
    paginationConfig.currentPage = page;
    populateMarketsTable();
}

// Simple date formatter
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-KE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

// Update markets table structure
function updateMarketsTableStructure() {
    const marketsSection = document.getElementById('markets');
    if (!marketsSection) return;

    marketsSection.innerHTML = `
        <div class="markets-header">
            <h2>Current Market Prices </h2>
            <button class="refresh-btn" onclick="refreshMarketData()">
                <i class="fa fa-refresh"></i> Refresh
            </button>
        </div>
        
        <div class="markets-filters">
            <select id="countyFilter">
                <option value="">All Counties</option>
            </select>
            <select id="marketFilter">
                <option value="">All Markets</option>
            </select>
            <select id="commodityFilter">
                <option value="">All Commodities</option>
            </select>
            <select id="dateFilter">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
            <input type="text" id="searchInput" placeholder="Search markets, commodities...">
        </div>

        <table class="markets-table">
            <thead>
                <tr>
                    <th onclick="sortTable('county')">County <i class="fa fa-sort"></i></th>
                    <th onclick="sortTable('market')">Market <i class="fa fa-sort"></i></th>
                    <th onclick="sortTable('commodity')">Commodity <i class="fa fa-sort"></i></th>
                    <th onclick="sortTable('classification')">Classification <i class="fa fa-sort"></i></th>
                    <th>Prices (KES/kg)</th>
                    <th onclick="sortTable('date')">Date <i class="fa fa-sort"></i></th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="6" style="text-align: center; padding: 20px;">Loading market data...</td></tr>
            </tbody>
        </table>

        <div class="pagination-container" style="display: none;">
            <!-- Pagination will be inserted here -->
        </div>
    `;

    setupFilters();
}

// Setup filter dropdowns with proper cascading logic
function setupFilters() {
    const countyFilter = document.getElementById('countyFilter');
    const marketFilter = document.getElementById('marketFilter');
    const commodityFilter = document.getElementById('commodityFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchInput');

    // Populate county filter
    if (countyFilter && allMarketData.length > 0) {
        countyFilter.innerHTML = '<option value="">All Counties</option>';
        const counties = [...new Set(allMarketData.map(item => item.county))].sort();
        counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countyFilter.appendChild(option);
        });
    }

    // Update markets based on selected county
    function updateMarketFilter() {
        const selectedCounty = countyFilter.value;
        marketFilter.innerHTML = '<option value="">All Markets</option>';
        
        if (selectedCounty) {
            // Only show markets for the selected county
            const marketsInCounty = [...new Set(
                allMarketData
                    .filter(item => item.county === selectedCounty)
                    .map(item => item.market)
            )].sort();
            
            marketsInCounty.forEach(market => {
                const option = document.createElement('option');
                option.value = market;
                option.textContent = market;
                marketFilter.appendChild(option);
            });
        } else {
            // Show all markets if no county selected
            const allMarkets = [...new Set(allMarketData.map(item => item.market))].sort();
            allMarkets.forEach(market => {
                const option = document.createElement('option');
                option.value = market;
                option.textContent = market;
                marketFilter.appendChild(option);
            });
        }
        
        // Reset commodity filter when market changes
        updateCommodityFilter();
    }

    // Update commodities based on selected county and market
    function updateCommodityFilter() {
        const selectedCounty = countyFilter.value;
        const selectedMarket = marketFilter.value;
        commodityFilter.innerHTML = '<option value="">All Commodities</option>';
        
        let filteredCommodities = allMarketData;
        
        // Filter by county if selected
        if (selectedCounty) {
            filteredCommodities = filteredCommodities.filter(item => item.county === selectedCounty);
        }
        
        // Filter by market if selected
        if (selectedMarket) {
            filteredCommodities = filteredCommodities.filter(item => item.market === selectedMarket);
        }
        
        const commodities = [...new Set(filteredCommodities.map(item => item.commodity))].sort();
        commodities.forEach(commodity => {
            const option = document.createElement('option');
            option.value = commodity;
            option.textContent = commodity;
            commodityFilter.appendChild(option);
        });
    }

    // Set up event listeners for cascading filters
    if (countyFilter) {
        countyFilter.addEventListener('change', () => {
            updateMarketFilter();
            applyFilters();
        });
    }

    if (marketFilter) {
        marketFilter.addEventListener('change', () => {
            updateCommodityFilter();
            applyFilters();
        });
    }

    if (commodityFilter) {
        commodityFilter.addEventListener('change', applyFilters);
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Initialize the market and commodity filters
    updateMarketFilter();
}

// Apply filters
function applyFilters() {
    const countyFilter = document.getElementById('countyFilter')?.value || '';
    const marketFilter = document.getElementById('marketFilter')?.value || '';
    const commodityFilter = document.getElementById('commodityFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Reset to first page when filtering
    paginationConfig.currentPage = 1;

    filteredData = allMarketData.filter(item => {
        const matchesCounty = !countyFilter || item.county === countyFilter;
        const matchesMarket = !marketFilter || item.market === marketFilter;
        const matchesCommodity = !commodityFilter || item.commodity === commodityFilter;
        const matchesSearch = !searchTerm || 
            item.county.toLowerCase().includes(searchTerm) ||
            item.market.toLowerCase().includes(searchTerm) ||
            item.commodity.toLowerCase().includes(searchTerm) ||
            item.classification.toLowerCase().includes(searchTerm);

        // Date filtering
        let matchesDate = true;
        if (dateFilter) {
            const itemDate = new Date(item.date);
            const today = new Date();
            
            switch (dateFilter) {
                case 'today':
                    matchesDate = itemDate.toDateString() === today.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesDate = itemDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    matchesDate = itemDate >= monthAgo;
                    break;
            }
        }

        return matchesCounty && matchesMarket && matchesCommodity && matchesSearch && matchesDate;
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

        if (column === 'retailPrice' || column === 'wholesalePrice') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else if (column === 'date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    populateMarketsTable();
}

// Refresh market data
async function refreshMarketData() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const tbody = document.querySelector('#markets tbody');
    
    if (refreshBtn) refreshBtn.disabled = true;
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fa fa-spinner fa-spin"></i> Fetching market data...</td></tr>';
    }
    
    try {
        allMarketData = await fetchLatestMarketData();
        filteredData = [...allMarketData];
        paginationConfig.currentPage = 1; // Reset to first page
        setupFilters(); // Refresh filters with new data
        applyFilters(); // Apply any existing filters
    } catch (error) {
        console.error('Failed to refresh market data:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c; padding: 20px;">Failed to load market data. Please try again.</td></tr>';
        }
    }
    
    if (refreshBtn) refreshBtn.disabled = false;
}

// Initialize markets when page loads
async function initializeMarkets() {
    updateMarketsTableStructure();
    await refreshMarketData();
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other scripts have loaded
    setTimeout(initializeMarkets, 500);
});

// Make functions available globally
window.refreshMarketData = refreshMarketData;
window.changePage = changePage;
window.sortTable = sortTable;