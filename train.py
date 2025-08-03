import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine
from datetime import datetime

# DB connection
DB_URL =  'postgresql+psycopg2://neondb_owner:npg_AKeCc7uDLRa5@ep-summer-fog-a2szlczd-pooler.eu-central-1.aws.neon.tech/market_db?sslmode=require'
engine = create_engine(DB_URL)

# 1. Fetch & Prepare Data 
def fetch_data(engine):
    """Fetch last `days` days of data, engineer features, return features + targets."""
    query = """
        SELECT "Date", "Commodity","Classification", "County", "Market", "WholesaleUnitPrice", "RetailUnitPrice"
        FROM market_data
    """
    df = pd.read_sql(query, engine)
    df["Date"] = pd.to_datetime(df["Date"])
    return df
def prepare_features(df):
    df = df.copy()
    df = df.dropna(subset=["WholesaleUnitPrice", "RetailUnitPrice"])
    df.sort_values(["Commodity", "Market", "County", "Date"], inplace=True)

    # Rolling features
    df["Wholesale_MA7"] = df.groupby(["Commodity", "Market", "County"])["WholesaleUnitPrice"].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["Retail_MA7"] = df.groupby(["Commodity", "Market", "County"])["RetailUnitPrice"].transform(lambda x: x.rolling(7, min_periods=1).mean())
    df["Wholesale_MA30"] = df.groupby(["Commodity", "Market", "County"])["WholesaleUnitPrice"].transform(lambda x: x.rolling(30, min_periods=1).mean())
    df["Retail_MA30"] = df.groupby(["Commodity", "Market", "County"])["RetailUnitPrice"].transform(lambda x: x.rolling(30, min_periods=1).mean())

    # Date features
    df["Month"] = df["Date"].dt.month
    df["WeekOfYear"] = df["Date"].dt.isocalendar().week.astype(int)
    df["DayOfWeek"] = df["Date"].dt.dayofweek

    # Drop nulls after feature engineering
    df.dropna(inplace=True)

    # Target variables
    df["log_wholesale"] = np.log1p(df["WholesaleUnitPrice"])
    df["log_retail"] = np.log1p(df["RetailUnitPrice"])

    # Encode categorical
    cat_cols = ["Commodity", "Classification", "County", "Market"]
    encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    encoded = encoder.fit_transform(df[cat_cols])
    encoded_df = pd.DataFrame(encoded, columns=encoder.get_feature_names_out(cat_cols), index=df.index)

    # Merge encoded + numerical
    features = pd.concat([
        df[["Wholesale_MA7", "Retail_MA7", "Wholesale_MA30", "Retail_MA30", "Month", "WeekOfYear", "DayOfWeek"]],
        encoded_df
    ], axis=1)

    return features, df["log_wholesale"], df["log_retail"], encoder, features.columns.tolist()


# Train Wholesale & Retail Models
def train_model(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False, random_state=42
    )
    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=500,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        random_state=42,
        n_jobs=-1,
        verbosity=0
    )
    model.fit(X_train, y_train)

    return model


# run training 
if __name__ == "__main__":
    print(" Training started...")
    start = datetime.now()

    df = fetch_data(engine)
    X, y_wholesale, y_retail, encoder, feature_cols = prepare_features(df)

    print(f" Training samples: {X.shape[0]}")
    model_w = train_model(X, y_wholesale)
    model_r = train_model(X, y_retail)

    # Save models and metadata
    joblib.dump(model_w, "models/xgb_wholesale.pkl")
    joblib.dump(model_r, "models/xgb_retail.pkl")
    joblib.dump(encoder, "models/ohe_encoder.pkl")
    joblib.dump(feature_cols, "models/feature_columns.pkl")

    print(" Models and encoder saved.")
    print(f" Total training time: {(datetime.now() - start).seconds}s")