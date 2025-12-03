# API handler with various issues
# NOTE: This is a DEMO FILE with INTENTIONALLY FAKE credentials for testing
import json
import os

# Bug: Hardcoded credentials (FAKE - for demo only)
DATABASE_PASSWORD = "admin123"
API_KEY = "sk-1234567890abcdef"

class APIHandler:
    def __init__(self):
        self.cache = {}
    
    # Bug: No input sanitization
    def handle_request(self, user_input):
        # Dangerous: eval on user input
        result = eval(user_input)
        return result
    
    # Bug: No error handling
    def fetch_data(self, url):
        import requests
        response = requests.get(url)
        return response.json()
    
    # Bug: Race condition potential
    def update_counter(self):
        current = self.cache.get('counter', 0)
        # Time gap here allows race condition
        self.cache['counter'] = current + 1
        return self.cache['counter']
    
    # Bug: Memory leak - unbounded cache
    def cache_result(self, key, value):
        self.cache[key] = value
        # Never clears old entries
    
    # Bug: Logging sensitive data
    def authenticate(self, username, password):
        print(f"Login attempt: {username} / {password}")
        # ... authentication logic
        return True
    
    # Bug: No rate limiting
    def process_payment(self, amount, card_number):
        print(f"Processing payment of ${amount}")
        # Could be called unlimited times
        return {"status": "success", "card": card_number}

# Bug: Global mutable state
handler = APIHandler()

