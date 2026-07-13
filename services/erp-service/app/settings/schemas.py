from pydantic import BaseModel, Field

class CompanyInfo(BaseModel):
    company_name: str = "DATAVEX Technologies Pvt Ltd"
    legal_name: str = "DATAVEX Solutions India Private Limited"
    gst_number: str = "27AABCU1234D1Z1"
    pan: str = "AABCU1234D"
    address: str = "Bandra Kurla Complex, Mumbai - 400051, Maharashtra"
    email: str = "hello@datavex.in"
    phone: str = "+91 1800 123 4567"
    website: str = "https://datavex.in"
    business_type: str = "Private Limited (Pvt Ltd)"

class FinancialSettings(BaseModel):
    fiscal_year_start: str = "April 1"
    base_currency: str = "INR (₹)"
    books_closure_date: str = "March 31"
    invoice_prefix: str = "INV"
    invoice_number_format: str = "INV-{YYYY}-{000}"

class RegionalSettings(BaseModel):
    timezone: str = "Asia/Kolkata (IST, UTC+5:30)"
    date_format: str = "DD-MM-YYYY"
    number_format: str = "1,23,456.78 (Indian)"

class SettingsSchema(BaseModel):
    company: CompanyInfo = Field(default_factory=CompanyInfo)
    financial: FinancialSettings = Field(default_factory=FinancialSettings)
    regional: RegionalSettings = Field(default_factory=RegionalSettings)
