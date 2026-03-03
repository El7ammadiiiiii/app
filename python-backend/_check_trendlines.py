"""Quick script to check trendlines data in Firebase."""
import asyncio
from firebase_writer import init_firebase, get_db

async def check():
    init_firebase()
    db = get_db()
    
    # Check if data exists
    docs = db.collection('scanners_results').document('trendlines').collection('exchanges').document('binance').collection('timeframes').document('1h').collection('data').limit(10).stream()
    
    count = 0
    async for doc in docs:
        data = doc.to_dict()
        print(f"  {doc.id}: lines={data.get('line_count', 0)}, price={data.get('price', 0)}")
        count += 1
    
    print(f"\nTotal docs found: {count}")
    
    if count == 0:
        print("\n⚠️ No data found! Checking other paths...")
        # Try to list the pageIds
        pages = db.collection('scanners_results').stream()
        async for page in pages:
            print(f"  Page: {page.id}")

if __name__ == "__main__":
    asyncio.run(check())
