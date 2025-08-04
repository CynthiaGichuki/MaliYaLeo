import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import joblib
from datetime import datetime
from dateutil.relativedelta import relativedelta

# Load pretrained models and encoders
model_w = joblib.load("models/xgb_wholesale.pkl")
model_r = joblib.load("models/xgb_retail.pkl")
encoder = joblib.load("models/ohe_encoder.pkl")  # OneHotEncoder(handle_unknown="ignore")
feature_columns = joblib.load("models/feature_columns.pkl")

# Database connection
DB_URL = 'postgresql+psycopg2://neondb_owner:npg_AKeCc7uDLRa5@ep-summer-fog-a2szlczd-pooler.eu-central-1.aws.neon.tech/market_db?sslmode=require'
engine = create_engine(DB_URL)

def fetch_market_data():
    query = f"""
        SELECT "Date", "Commodity", "Market", "County","Classification",
               "WholesaleUnitPrice", "RetailUnitPrice"
        FROM market_data
         ORDER BY "Date" ASC;
    """
    df = pd.read_sql(query, engine)

    df["Date"] = pd.to_datetime(df["Date"])
    return df

def prepare_features(df, encoder, feature_columns):
    df = df.copy()
    df.sort_values(["Commodity", "Market", "County", "Date"], inplace=True)

    # Rolling averages
    df["Wholesale_MA7"] = df.groupby(["Commodity", "Market", "County"])["WholesaleUnitPrice"].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["Retail_MA7"] = df.groupby(["Commodity", "Market", "County"])["RetailUnitPrice"].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["Wholesale_MA30"] = df.groupby(["Commodity", "Market", "County"])["WholesaleUnitPrice"].transform(lambda x: x.rolling(30, min_periods=1).mean())
    df["Retail_MA30"] = df.groupby(["Commodity", "Market", "County"])["RetailUnitPrice"].transform(lambda x: x.rolling(30, min_periods=1).mean())

    # Time features
    df["Month"] = df["Date"].dt.month
    df["WeekOfYear"] = df["Date"].dt.isocalendar().week.astype(int)
    df["DayOfWeek"] = df["Date"].dt.dayofweek

    # Select most recent row per group
    latest_df = df.groupby(["Commodity", "Market", "County"]).tail(1)

    # One-hot encode
    cat_cols = ["Commodity", "Classification", "County", "Market"]
    encoded = encoder.transform(latest_df[cat_cols])
    encoded_df = pd.DataFrame(encoded, columns=encoder.get_feature_names_out(cat_cols), index=latest_df.index)

    latest_df_encoded = pd.concat([latest_df, encoded_df], axis=1)
    latest_df_encoded = latest_df_encoded.reindex(columns=feature_columns, fill_value=0)

    return latest_df[["Commodity", "Market", "County","Classification"]], latest_df_encoded

def forecast(df_raw, df_features, start_date, days=7):
    future_dates = pd.date_range(start=start_date, periods=days)
    results = []

    for idx, row in df_features.iterrows():
        group_info = df_raw.loc[idx, ["Commodity", "Market", "County", "Classification"]]

        base_features = row.copy()

        for d in future_dates:
            # Update time features for each date
            base_features["Month"] = d.month
            base_features["WeekOfYear"] = d.isocalendar().week
            base_features["DayOfWeek"] = d.weekday()

            # Reshape and predict
            group_data = base_features.values.reshape(1, -1)

            pred_w = np.expm1(model_w.predict(group_data)[0])
            pred_r = np.expm1(model_r.predict(group_data)[0])

            results.append({
                "Date": d.strftime("%Y-%m-%d"),
                "Commodity": group_info["Commodity"],
                "Classification": group_info["Classification"],
                "Market": group_info["Market"],
                "County": group_info["County"],
                "Wholesale_price": round(float(pred_w), 2),
                "Retail_price": round(float(pred_r), 2),
                "Currency": "KES",
                "Model_version": "v1"
            })

    return results

def predict_prices(commodity, market, county, start_date, days=7):
    # Fetch data
    market_df = fetch_market_data(days=200)

    # Filter for the specific group
    group_df = market_df[
        (market_df["Commodity"] == commodity) &
        (market_df["Market"] == market) &
        (market_df["County"] == county)
    ]

    if group_df.empty:
        return None  # No matching data

    # Prepare features
    group_meta_df, features_df = prepare_features(group_df, encoder, feature_columns)

    # If no feature rows matched, return None
    if features_df.empty:
        return None

    # Forecast
    predictions = forecast(group_meta_df, features_df, start_date, days=days)

    # Format response
    return {
        "commodity": commodity,
        "classification": predictions[0]["classification"],
        "market": market,
        "county": county,
        "predicted_prices": [
            {
                "date": p["Date"],
                "predicted_wholesale_price": p["Wholesale_price"],
                "predicted_retail_price": p["Retail_price"],
                "classification": p["classification"]
                

            }
            for p in predictions
        ],
        "currency": "KES"
    }

def save_predictions_to_db(predictions):
    df_pred = pd.DataFrame(predictions)
    df_pred.rename(columns={"Classification": "classification"}, inplace=True)

    df_pred.to_sql("predictions", engine, if_exists="append", index=False)

if __name__ == "__main__":
    start = datetime.now()
    today = datetime.today().strftime("%Y-%m-%d")

    print("Cleaning predictions table...")
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM predictions"))

    try:
        market_df = fetch_market_data()
        group_df, features_df = prepare_features(market_df, encoder, feature_columns)
        predictions = forecast(group_df, features_df, start_date=today, days=7)
        save_predictions_to_db(predictions)
        print(f"Predictions saved: {len(predictions)} rows")
    except Exception as e:
        print(" Error during prediction:", str(e))

    print(f"Total time: {(datetime.now() - start).seconds}s")
