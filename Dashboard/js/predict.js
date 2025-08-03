
document.getElementById("pricePredictionForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const predictBtn = document.getElementById("prediction");
    const predictBtnText = document.getElementById("predictBtnText");
    const spinner = document.getElementById("spinner");
    
    if (predictBtn) {
        predictBtn.disabled = true;
    }
    if (predictBtnText) {
        predictBtnText.style.display = "none";
    }
    if (spinner) {
        spinner.style.display = "inline-block";
    }

    const commodity = document.getElementById("commodityDropdown").value;
    const county = document.getElementById("countyDropdown").value;
    const market = document.getElementById("marketDropdown").value;
    const date = document.getElementById("dateInput").value;

    // query parameters
    const params = new URLSearchParams({
        commodity,
        county,
        market,
        date
    });


    //API endpoint
    const apiUrl = `https://maliyaleo.onrender.com/latest?${params.toString()}`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            
        });

        if (!response.ok) throw new Error("Prediction failed");

        const data = await response.json();

        if (data.status === "error" || data.data === null) {
            document.getElementById("predictionOutput").innerHTML = `
            <p style="color: red;"><strong>No predictions available:</strong> ${data.message}</p>
                <p>Please try a different commodity, market, or date.</p>
            `;
            return;
        }

        if (!data.data.Predicted_prices || data.data.Predicted_prices.length === 0) {
            document.getElementById("predictionOutput").innerHTML = `
                <p style="color: red;"><strong>No predictions found</strong> for the selected parameters.</p>
                <p>Please try a different commodity, market, or date.</p>
            `;
            return;
        }

        const prediction = data.data.Predicted_prices[0];
        const wholesale = prediction.Wholesale;
        const retail = prediction.Retail;

        document.getElementById("predictionOutput").innerHTML = `
            <div style="color: green;">
                <p><strong>Wholesale Price:</strong> KES ${wholesale.toFixed(2)}</p>
                <p><strong>Retail Price:</strong> KES ${retail.toFixed(2)}</p>
                <p><small>Market: ${data.data.Market}, County: ${data.data.County}</small></p>
                <p><small>Classification: ${data.data.Classification}</small></p>
            </div>
        `;
    } catch (error) {
        document.getElementById("predictionOutput").innerHTML = `
            <p style="color: red;"><strong>Error:</strong> Unable to fetch predictions. Please check your connection and try again.</p>
        `;
        console.error("Fetch error:", error);
    }
    finally {
        
        if (predictBtn) {
            predictBtn.disabled = false;
        }
        if (predictBtnText) {
            predictBtnText.style.display = "inline-block";
        }
        if (spinner) {
            spinner.style.display = "none";
        }
    }
});

