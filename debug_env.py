import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Print raw DATABASE_URL
raw_url = os.environ.get("DATABASE_URL")
print(f"Raw DATABASE_URL from env: {repr(raw_url)}")

# Try to decode if necessary
if "\\x" in raw_url:
    try:
        decoded_url = bytes(raw_url, 'utf-8').decode('unicode_escape')
        print(f"Decoded URL: {repr(decoded_url)}")
    except Exception as e:
        print(f"Error decoding: {e}")
