# MaliYaLeo: Market-Price-Planning-Assistant-for-Kenyan-Consumers-and-Farmers

![MaliYaLeo Dashboard](link) 

**Team Members** : Sammy Macharia, Cynthia Gichuki, Abishang Mueni, Maureen Gathoni, Baraka Nyamai. 

## Introduction  

In Kenya, market prices for key food commodities fluctuate due to seasonal changes, weather patterns, transportation costs and middlemen influence. Farmers, traders and households struggle to access reliable, real-time information which limits their ability to make informed decisions.  

**MaliYaLeo** is a **data-driven solution** that provides:

-  Real-time and forecasted market prices.  
-  Predictive insights for 7–30 days ahead.  
-  Accessible delivery via **USSD, SMS, and Web Dashboard**  reaching even rural farmers with no smartphones or internet.

## Problem Statement  

- Farmers are vulnerable to exploitation due to lack of price transparency.  
- Households and traders face uncertainty in budgeting and purchasing decisions.  
- Current price reporting systems are often delayed or not user-friendly.

##  Business Objectives

**1. Provide Real-Time Market Price Information** – build a centralized data system to collect, clean and display up-to-date prices.  
**2. Predict Future Price Trends** – use ML models (Ridge Regresision,Prophet, XGBoost, LSTM) to forecast prices for better planning.  
**3. Deliver Insights via Inclusive Channels** – deploy to USSD, SMS and Web Dashboard for broad accessibility.  

## Dataset 

**DATASOURCE:**  

The dataset compiles historical market price data from KAMIS by Kilimo, an official Kenyan Government platform managed by the Ministry of Agriculture.  
[KAMIS Market Prices](https://kamis.kilimo.go.ke/site/market)
  
It includes daily and weekly wholesale & retail prices for a wide range of commodities across Kenyan markets.  This table contains a total of 63173 records and is structured with the following key columns

![Dataset Columns](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/Data_Columns.png)
![Columns Description](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/Column_Desc.png)

##  Project Approach  
**1. Data Pipeline** – Collected, cleaned and merged market datasets.  
**2. Exploratory Data Analysis (EDA)** – Identified trends, seasonality and anomalies.[**Download EDA script**](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/EDA_final.ipynb)

**3. Modeling** – Built and compared:  
   - Baseline Ridge Regression
   - Prophet (Time Series)
   - LSTM Neural Network
   - XGBoost
     
**4. Deployment Prep** – Exported `.pkl` models, designed database schema, created API endpoints.  
**5. Channels** – Web dashboard, USSD and SMS (Africa’s Talking).  

## Database Structure & Initial Checks

The **MaliYaLeo** system uses **PostgreSQL** as its main database. The schema currently consists of **4 core tables**:

* **market\_data** – Stores historical market prices for key commodities.
* **predictions** – Contains machine learning–generated price forecasts.
* **users** – Logs all user interactions via USSD, SMS, and web requests.
* **system\_logs** – Tracks API events, system messages, and errors.

Before modeling and analysis several data quality checks and cleaning steps were performed on the raw KAMIS dataset to ensure consistency and accuracy:

1. Dropped SupplyVolume – it was empty.
2. Filled missing prices – used median for WholesaleUnitPrice & RetailUnitPrice.
3. Created ReferencePrice – avg of wholesale & retail.
4. Standardized text – fixed casing & typos in Classification, Market and County.
5. Cleaned dates – ensured Date in YYYY-MM-DD format.
6. Removed duplicates – kept only clean, unique records.
7. Removed outliers – filtered unrealistic price points for accuracy.

![Entity Relationship Diagram here](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/database_structure.png) 


## Executive Summary  

###  Overview of Findings  

* Commodity prices follow clear seasonal patterns peaking around harvest and planting periods.
* XGBoost emerged as the best model predicting 7–30 day prices with R² > 0.88 enabling actionable planning for farmers and traders.
* USSD & SMS channels widen access  ensuring even rural users without smartphones benefit.

### Modeling Overview

We tested multiple approaches to forecast prices.

| Model            | Wholesale MSE ↓ | Wholesale R² ↑ |   Retail MSE ↓ |    Retail R² ↑ |
| ---------------- | --------------: | -------------: | -------------: | -------------: |
| Ridge Regression |          500.84 |         0.7850 |         704.32 |         0.7790 |
| Prophet          |           26.76 |         0.0865 |          16.98 |        -0.0656 |
| LSTM Neural Net  |  *Not reported* |         0.5850 | *Not reported* | *Not reported* |
| **XGBoost**      |      **259.87** |     **0.8884** |     **352.44** |     **0.8894** |

**Key takeaway:**
**XGBoost** achieved the **lowest error (MSE)** and **highest accuracy (R²)** making it the **best-performing model** for both wholesale and retail price forecasts.

## 📂 Project Structure

```
MaliYaLeo/
│
├──  EDA/  
│   └── Exploratory Data Analysis notebooks & scripts.  
│
├──  Modeling/  
│   ├── Baseline Ridge Regression  
│   ├── Prophet (Time Series)  
│   ├── LSTM Neural Network  
│   └── XGBoost (final model)  
│
├──  Database/ (PostgreSQL)  
│   ├── market_data       → Historical commodity prices  
│   ├── predictions       → Machine learning forecasts  
│   ├── users             → USSD, SMS & web interactions  
│   └── system_logs       → API events & error tracking  
│
├──  Deployment/  
│   ├── Web Dashboard (for price visualization)  
│   ├── USSD service (price queries for feature phones)  
│   └── SMS alerts (price updates & forecasts)
│
└── README.md
```
##  Tools & Libraries Used

* **Data Processing & Analysis**: numpy, pandas
* **Visualization**: Seaborn, Matplotlib`
* **Machine Learning Models**: scikit-learn (Ridge Regression), Prophet (Time Series), XGBoost
* **Deep Learning**: TensorFlow, Keras (LSTM)
* **Data Scaling & Prep**: StandardScaler, `MinMaxScaler`
* **Model Evaluation**: mean_squared_error, mean_absolute_error, r2_score

##  Insights Deep Dive  

### **1: Price Transparency**

* Retail prices are always higher than wholesale across all commodities and counties.
* Perishables (e.g. avocados) show the biggest markups while low-risk goods (e.g. tea) have smaller ones.
* Increased visibility exposes middlemen margins giving farmers leverage in negotiations.

![Retail_Wholesale Graph](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/Retail_Wholesale_Graph.png)  

### **2: Predictive Planning**

* XGBoost predicts prices 7–30 days ahead helping farmers and traders plan before shifts hit the market.

* Seasonal patterns are clear as prices drop in Aug–Sept (harvest season) and spike in Oct–Nov (pre-holiday demand).

* Retail prices remain steady while wholesale prices swing more showing how retailers absorb volatility for consumers.

![Monthly_Graph](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/Monthly_Graph.png)  

![Xgboost Graph](https://github.com/CynthiaGichuki/MaliYaLeo/blob/EDA/Images/XGboost_Graph.png)  

### **3: Regional Disparities**

*  **National price gap**:
  
**Kiambu (highest) = 140 KES, Isiolo (lowest): 35 KES**(Retailprice)

$$
\text{Gap} = \frac{(140 - 35)}{140} \times 100 = \mathbf{75\%}
$$

Households in Isiolo spend 75% less than those in Kiambu for the same goods — huge savings for buyers but lower profits for sellers.

Traders in high-price counties like Kiambu see higher margins, while those in lower-price counties face tighter competition.

Farmers near high-price markets can earn more per crop, while those in low-price regions risk being underpaid.


*  **Regional price gap** (within a single region or cluster of counties):

**Top county = 120 KES, Lowest county = 90 KES**(Wholesaleprice)

$$
\text{Gap} = \frac{(120 - 90)}{120} \times 100 = \mathbf{25\%}
$$

Households in the same region can pay up to 25% more depending on where they shop.

Traders can target low-price counties within a region to source cheaper goods.

Farmers can earn up to 25% more by selling in the right county market.

### **4: Access & Inclusivity**

* Over **77% of rural users depend on mobile money services** (e.g. M‑Pesa), based on **FinAccess 2024 data** ([CBK‑KNBS‑FSD Kenya FinAccess Survey 2024](https://www.centralbank.go.ke/2024/12/13/10960/)) :contentReference[oaicite:7]{index=7}
  
* Most of this activity is conducted over **USSD** since rural areas have lower smartphone ownership and limited internet access ([Nairobi Business Monthly, “How tech is accelerating financial inclusion”](https://nairobibusinessmonthly.com/kenyans-love-instant-payments-and-thus-unstructured-supplementary-service-data-ussd-comes-out-as-a-better-option/)) :contentReference[oaicite:8]{index=8}

* This confirms that USSD/SMS channels will provide essential access for rural and underserved users.

## Recommendations  
Based on the insights, we recommend:  

* With predictive price insights now available farmers should align harvest and selling schedules to take advantage of peak market prices ensuring they earn more during high-demand periods.

* Encourage households to use price forecasts for better monthly budgeting  like buying in bulk during price dips (Aug–Sept) and planning grocery spending ahead of seasonal spikes.

* Despite regional price gaps households should compare prices across nearby counties  even a short trip or bulk-shopping in lower-price counties like Isiolo can mean notable savings.

* Look into optimizing logistics and supply chains by leveraging county-level price forecasts enabling traders to source from low-price regions and sell in high-price counties like Kiambu for higher margins.

* With county disparities clear, farmers should build stronger links to markets in better-paying counties transporting crops to premium markets ensures better returns.

* Push for wider dashboard adoption by government agencies to guide subsidy allocation, food security measures and market stabilization policies.

* Establish expansion plans for commodity coverage by adding emerging high-value crops like avocados and macadamia to meet evolving market demand. 

## Assumptions & Caveats  

- Weather patterns were not sourced from a formal dataset instead, general knowledge of Kenya’s seasonal climate (harvest & planting seasons) was applied when interpreting price trends.
- Some market price anomalies were capped at 99th percentile to handle outliers.  
- Forecast accuracy is highest for 7–14 days uncertainty increases past 30 days.

##  Next Steps & Future Enhancements

* Add more contextual features like integrate transport costs, inflation data, weather insights and supply volume to improve model accuracy.
* Scale the model to other East African markets  extend beyond Kenya for regional price forecasting.
* Deploy an API & web dashboard to provide real-time price data access for farmers, traders and policymakers.
* Launch USSD & SMS service via Africa’s Talking  to ensure rural farmers without smartphones can access price forecasts.
