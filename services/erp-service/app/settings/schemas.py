from pydantic import BaseModel, Field
from typing import Optional

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

class ThemeColorSet(BaseModel):
    """A set of brand colors for a single theme (light or dark)."""
    primary: str = "#f2470c"
    accent: str = "#fff0eb"
    surface: str = "#ffffff"
    foreground: str = "#09090b"
    muted: str = "#52525b"
    background: str = "#f4f5f8"
    border: str = "#e2e8f0"

class BrandColors(BaseModel):
    """Separate color sets for light and dark themes."""
    light: ThemeColorSet = Field(default_factory=ThemeColorSet)
    dark: ThemeColorSet = Field(default_factory=lambda: ThemeColorSet(
        primary="#f2470c",
        accent="#741e02",
        surface="#121212",
        foreground="#f0f0f0",
        muted="#969696",
        background="#0a0a0a",
        border="#1f1f1f",
    ))

class EmailTemplateSettings(BaseModel):
    sender_name: str = "DATAVEX ERP"
    sender_email: str = "noreply@datavex.in"
    footer: str = "Powered by DATAVEX Technologies"
    email_logo_file_id: Optional[int] = None

class BrandingSettings(BaseModel):
    logo_file_id: Optional[int] = None
    favicon_file_id: Optional[int] = None
    brand_colors: BrandColors = Field(default_factory=BrandColors)
    email_templates: EmailTemplateSettings = Field(default_factory=EmailTemplateSettings)

class SettingsSchema(BaseModel):
    company: CompanyInfo = Field(default_factory=CompanyInfo)
    financial: FinancialSettings = Field(default_factory=FinancialSettings)
    regional: RegionalSettings = Field(default_factory=RegionalSettings)
    branding: BrandingSettings = Field(default_factory=BrandingSettings)
