import pandas as pd
import json
from collections import defaultdict

# Load the file
df = pd.read_csv("results.unknown")

# Build nested structure
nested = defaultdict(lambda: defaultdict(set))

for _, row in df.iterrows():
    county = row["County"]
    market = row["Market"]
    commodity = row["Commodity"]
    nested[county][market].add(commodity)

# Convert sets to sorted lists
final_mapping = {
    county: {
        market: sorted(list(commodities))
        for market, commodities in markets.items()
    }
    for county, markets in nested.items()
}

# Save to JSON
with open("commodity_map.json", "w") as f:
    json.dump(final_mapping, f, indent=2)
