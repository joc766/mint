import os
import plaid
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from datetime import datetime, date
from typing import List, Dict, Any

class PlaidService:
    def __init__(self):
        self.client_id = os.getenv("PLAID_CLIENT_ID")
        self.secret = os.getenv("PLAID_SECRET")
        self.environment = os.getenv("PLAID_ENV", "sandbox")
        
        # Map environment to Plaid host
        self.host_map = {
            "sandbox": plaid.Environment.Sandbox,
            "development": plaid.Environment.Development,
            "production": plaid.Environment.Production
        }
        
        self._setup_client()
    
    def _setup_client(self):
        """Setup the Plaid API client"""
        configuration = Configuration(
            host=self.host_map[self.environment],
            api_key={
                "clientId": self.client_id,
                "secret": self.secret
            }
        )
        api_client = ApiClient(configuration)
        self.client = plaid_api.PlaidApi(api_client)
    
    async def get_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """Get accounts for a given access token"""
        try:
            request = AccountsGetRequest(access_token=access_token)
            response = self.client.accounts_get(request)
            return response["accounts"]
        except Exception as e:
            raise Exception(f"Failed to get accounts: {str(e)}")
    
    async def get_transactions(
        self, 
        access_token: str, 
        start_date: date, 
        end_date: date,
        account_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Get transactions for a given access token and date range"""
        try:
            options = TransactionsGetRequestOptions()
            if account_ids:
                options.account_ids = account_ids
            
            request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
                options=options
            )
            response = self.client.transactions_get(request)
            return response["transactions"]
        except Exception as e:
            raise Exception(f"Failed to get transactions: {str(e)}")
    
    async def get_transaction_details(self, access_token: str, transaction_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific transaction"""
        try:
            # Note: This would require a different Plaid endpoint
            # For now, we'll return basic info
            return {"transaction_id": transaction_id, "details": "Not implemented"}
        except Exception as e:
            raise Exception(f"Failed to get transaction details: {str(e)}")
    
    async def create_link_token(self, user_id: str) -> str:
        """Create a link token for Plaid Link"""
        try:
            from plaid.model.link_token_create_request import LinkTokenCreateRequest
            from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
            from plaid.model.country_code import CountryCode
            from plaid.model.products import Products
            
            user = LinkTokenCreateRequestUser(client_user_id=user_id)
            
            request = LinkTokenCreateRequest(
                products=[Products("transactions")],
                client_name="Transaction Categorization App",
                country_codes=[CountryCode("US")],
                language="en",
                user=user
            )
            
            response = self.client.link_token_create(request)
            return response["link_token"]
        except Exception as e:
            raise Exception(f"Failed to create link token: {str(e)}")
    
    async def exchange_public_token(self, public_token: str) -> str:
        """Exchange a public token for an access token"""
        try:
            from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
            
            request = ItemPublicTokenExchangeRequest(public_token=public_token)
            response = self.client.item_public_token_exchange(request)
            return response["access_token"]
        except Exception as e:
            raise Exception(f"Failed to exchange public token: {str(e)}")
    
    async def get_institution_info(self, institution_id: str) -> Dict[str, Any]:
        """Get information about a financial institution"""
        try:
            from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
            from plaid.model.country_code import CountryCode
            
            request = InstitutionsGetByIdRequest(
                institution_id=institution_id,
                country_codes=[CountryCode("US")]
            )
            response = self.client.institutions_get_by_id(request)
            return response["institution"]
        except Exception as e:
            raise Exception(f"Failed to get institution info: {str(e)}")