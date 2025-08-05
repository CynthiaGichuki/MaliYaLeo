from fastapi import FastAPI, Form, Query, HTTPException
from typing import Optional
from fastapi.responses import JSONResponse, PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
import pandas as pd
from sqlalchemy.orm import Session,sessionmaker
from sqlalchemy import text,create_engine
from sqlalchemy.exc import SQLAlchemyError
import psycopg2
from datetime import datetime, timedelta, date
from model import predict_prices  # ML prediction function

from fastapi.middleware.cors import CORSMiddleware
#  Database connection 
DB_URL =  'postgresql+psycopg2://neondb_owner:npg_AKeCc7uDLRa5@ep-summer-fog-a2szlczd-pooler.eu-central-1.aws.neon.tech/market_db?sslmode=require'
engine = create_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
app = FastAPI(title="Market Price Forecast API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#  Request body for /predict 
class PredictionRequest(BaseModel):
    commodity: str
    market: str
    county: str
    date: str  # Starting date for forecast (e.g., "2025-07-28")
    days: int = 7

# Standardized API Response 
def api_response(status: str, data=None, message="", error_code=0):
    return JSONResponse(content={
        "status": status,
        "error_code": error_code,
        "data": data,
        "message": message
    })

@app.get("/")
def home():
    return {"message": "Welcome to MaliYaLeo – Your market price prediction API is running!"}

# Route to serve the main dashboard
#@app.get("/")
#def read_index():
#    return FileResponse("static/index.html")
# Serve static frontend files
#app.mount("/static", StaticFiles(directory="static"), name="static")

#  Dashboard/UI Endpoints 
@app.get("/history")
def get_history(commodity: str, market: str, days: int = 30):
    try:
        query = f"""
            SELECT "Date", "Commodity", "Classification","Market", "County", "WholesaleUnitPrice", "RetailUnitPrice"
            FROM market_data
            WHERE "Commodity"='{commodity}' AND "Market"='{market}'
            ORDER BY "Date" DESC LIMIT {days}
        """
        df = pd.read_sql(query, engine)
        if df.empty:
            return api_response("error", None, f"No data found for {commodity} in {market}.", 404)
        
        df["Date"] = df["Date"].astype(str)
        return api_response("success", df.to_dict(orient="records"), "Historical prices retrieved.")
    except Exception as e:
        return api_response("error", None, f"Database error: {str(e)}", 500)

@app.post("/predict")
def forecast_prices(req: PredictionRequest):
    try:
        preds = predict_prices(req.commodity, req.market, req.county, req.date, req.days)
        if not preds:
            return api_response("error", None, f"No predictions for {req.commodity} in {req.market}.", 404)

        return api_response(
            "success",
            {
                "Commodity": preds["Commodity"],
                "classification": preds["classification"],
                "Market": preds["Market"],
                "County": preds["County"],
                "Date": req.date,
                "Predicted_prices": preds["Predicted_prices"],
                "Currency": preds["Currency"]
            },
            "Price forecast retrieved successfully."
        )
    except Exception as e:
        return api_response("error", None, f"Prediction error: {str(e)}", 500)

@app.get("/latest")
def get_latest_predictions(
    commodity: str = Query(...),
    market: str = Query(...),
    county: str = Query(...),
    date: Optional[str] = Query(None)
):
    # Sanitize inputs
    commodity = commodity.strip()
    market = market.strip()
    county = county.strip()
    db: Session = SessionLocal()
    try:
        query = f"""
        SELECT "Date", "Commodity", "Market", "classification", "County",
               "Wholesale_price", "Retail_price", "Currency"
        FROM predictions
        WHERE "Commodity" = '{commodity}'
          AND "Market" = '{market}'
          AND "County" = '{county}'
    """
        if date:
            query += f""" AND "Date" = '{date}'"""

        query += """ ORDER BY "Date" ASC"""
        df = pd.read_sql(query, engine)
        if df.empty:
            return api_response("error", None, f"No cached predictions for {commodity} in {market}.", 404)
        classification = df["classification"].iloc[0]

        predictions = [
            {
                "Date": row["Date"].strftime("%Y-%m-%d"),
                "Wholesale": float(row["Wholesale_price"]),
                "Retail": float(row["Retail_price"])
            }
            for _, row in df.iterrows()
        ]
        return api_response(
            "success",
            {
                "Commodity": commodity,
                "Classification": classification,
                "Market": market,
                "County": county,
                "Predicted_prices": predictions,
                "Currency": "KES"
            },
            "Cached predictions retrieved."
        )
    except SQLAlchemyError as e:
        db.rollback()  # rollback when there's a DB error
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()


def get_prediction_from_db(commodity, price_type, market, county, date_str):
    column_map = {
        "Wholesale": "Wholesale_price",
        "Retail": "Retail_price"
    }
    print("DEBUG: price_type =", price_type)

    try:
        column = column_map[price_type]
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid price type passed to prediction query.")

    query = text(f"""
        SELECT "{column}"
        FROM predictions
        WHERE "Commodity" = :commodity AND "Market" = :market AND "County" = :county AND "Date" = :date
    """)

    with engine.connect() as conn:
        result = conn.execute(query, {
            "commodity": commodity,
            "market": market,
            "county": county,
            "date": date_str
        }).fetchone()

    return result[0] if result else None

def update_user_preference(phone, commodity=None, market=None, county=None):
    updates = []
    params = {"phone": phone}

    if commodity:
        updates.append("preferred_commodity = :commodity")
        params["commodity"] = commodity
    if market:
        updates.append("preferred_market = :market")
        params["market"] = market
    if county:
        updates.append("preferred_county = :county")
        params["county"] = county

    if updates:
        update_str = ", ".join(updates) + ", last_accessed = CURRENT_TIMESTAMP"
        stmt = text(f"""
            UPDATE users SET {update_str}
            WHERE phone_number = :phone
        """)
        with engine.begin() as conn:
            conn.execute(stmt, params)

def upsert_user(phone):
    with engine.begin() as conn:
        stmt = text("""
            INSERT INTO users (phone_number, last_accessed, subscribed_alerts)
            VALUES (:phone, CURRENT_TIMESTAMP, FALSE)
            ON CONFLICT (phone_number)
            DO UPDATE SET last_accessed = CURRENT_TIMESTAMP;
        """)
        conn.execute(stmt, {"phone": phone})

def toggle_subscription(phone):
    with engine.begin() as conn:
        stmt = text("""
            UPDATE users
            SET subscribed_alerts = NOT subscribed_alerts,
                last_accessed = CURRENT_TIMESTAMP
            WHERE phone_number = :phone;
        """)
        conn.execute(stmt, {"phone": phone})

def get_subscription_status(phone):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT subscribed_alerts FROM users WHERE phone_number = :phone;
        """), {"phone": phone})
        row = result.fetchone()
        return row[0] if row else False
    

#  USSD Menu Handler 
@app.post("/ussd")
async def ussd_handler(
    sessionId: str = Form(...),
    serviceCode: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form("")
):
    user_response = text.strip().split("*")
    level = len(user_response)

    # Ensure user is created/upserted
    upsert_user(phoneNumber)

    if text == "":
        response = "CON Welcome to Market Prices\n"
        response += "1. Check Price\n"
        response += "2. Update Preferences\n"
        response += "3. Subscribe/Unsubscribe Alerts"

    # PRICE CHECK (Farmer or Consumer)
    elif user_response[0] == "1":
        if level == 1:
            response = "CON Are you a:\n1. Farmer\n2. Consumer"
        elif level == 2:
            if user_response[1] not in ["1", "2"]:
                response = "END Invalid selection. Please try again."
            else:
                response = "CON Enter commodity:"
        elif level == 3:
            response = "CON Enter market:"
        elif level == 4:
            response = "CON Enter county:"
        elif level == 5:
            response = "CON Enter date (YYYY-MM-DD):"
        elif level == 6:
            user_type_input = user_response[1]
            commodity = user_response[2].capitalize()
            market = user_response[3].title()
            county = user_response[4].title()
            date_input = user_response[5]

            # Validate date format
            from datetime import datetime
            try:
                query_date = datetime.strptime(date_input, "%Y-%m-%d").date()
            except ValueError:
                return PlainTextResponse("END Invalid date format. Use YYYY-MM-DD.")
            
            query_date = datetime.strptime(date_input, "%Y-%m-%d").date()
            today = date.today()

            if query_date < (today - timedelta(days=10)):
                return PlainTextResponse("END Date too far in the past. Please enter a date within the last 10 days or any future date.")


            price_type = "Wholesale" if user_type_input == "1" else "Retail"

            update_user_preference(phoneNumber, commodity, market, county)
            price = get_prediction_from_db(commodity, price_type, market, county, str(query_date))

            if price:
                return PlainTextResponse(f"END {price_type} price for {commodity} in {market}, {county} on {query_date} is KES {price}.")
            else:
                return PlainTextResponse(f"END No {price_type.lower()} price data found for {commodity} in {market}, {county} on {query_date}.")


    # UPDATE PREFERENCES
    elif user_response[0] == "2":
        if level == 1:
            response = "CON Enter preferred commodity:"
        elif level == 2:
            response = "CON Enter preferred market:"
        elif level == 3:
            response = "CON Enter preferred county:"
        elif level == 4:
            commodity = user_response[1].capitalize()
            market = user_response[2].title()
            county = user_response[3].title()
            update_user_preference(phoneNumber, commodity, market, county)
            response = "END Preferences updated successfully."

    # SUBSCRIBE/UNSUBSCRIBE
    elif user_response[0] == "3":
        toggle_subscription(phoneNumber)
        sub_status = get_subscription_status(phoneNumber)
        msg = "Subscribed to alerts." if sub_status else "Unsubscribed from alerts."
        response = f"END {msg}"

    else:
        response = "END Invalid choice. Try again."

    return PlainTextResponse(response)


# def get_price_from_db(commodity, price_type, market, county, date_str):
#     column = f'"{price_type}UnitPrice"'
#     query = text(f"""
#         SELECT {column}
#         FROM market_data
#         WHERE "Commodity" = :commodity AND "Market" = :market AND "County" = :county AND "Date" = :date
#         ORDER BY "Date" DESC
#         LIMIT 1
#     """)

#     with engine.connect() as conn:
#         result = conn.execute(query, {
#             "commodity": commodity,
#             "market": market,
#             "county": county,
#             "date": date_str
#         }).fetchone()

#     return result[0] if result else None

    
# Refresh forecasts every 7 days 
def update_all_forecasts():
    today = datetime.today().strftime("%Y-%m-%d")
    try:
        df = pd.read_sql('SELECT DISTINCT "Commodity", "Market", "County" FROM market_data', engine)
        for _, row in df.iterrows():
            predict_prices(row["Commodity"], row["Market"], row["County"], today, 7)
        print(f"[{datetime.now()}] Forecasts updated for all commodities.")
    except Exception as e:
        print(f"Scheduler error: {str(e)}")

scheduler = BackgroundScheduler()
scheduler.add_job(update_all_forecasts, "interval", days=7)
scheduler.start()

  
