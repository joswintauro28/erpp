"""DATAVEX Shared Seed Library — Organization and Master Data Fixtures."""

ORGS = [
    {"id": 1, "name": "DATAVEX Industries Pvt Ltd", "parent_id": None},
    {"id": 2, "name": "Eternal", "parent_id": None},
    {"id": 3, "name": "Zomato", "parent_id": 2},
    {"id": 4, "name": "Blinkit", "parent_id": 2},
    {"id": 5, "name": "District", "parent_id": 2},
]

USERS = [
    {"id": 1, "email": "admin@datavex.com", "name": "Alex Chen", "role": "Organization Owner"},
    {"id": 2, "email": "sales@datavex.com", "name": "Maya Patel", "role": "Sales Executive"},
    {"id": 3, "email": "accounts@datavex.com", "name": "Jordan Kim", "role": "Accountant"},
    {"id": 4, "email": "inventory@datavex.com", "name": "Sam Rivera", "role": "Inventory Manager"},
    {"id": 5, "email": "auditor@datavex.com", "name": "Priya Sharma", "role": "Auditor"},
]

# Canonical 20 customers aligned 1:1 with Billing CUSTOMER_IDS (1..20)
CUSTOMERS = [
    {"id": 1, "id_str": "CUST-0001", "name": "Meridian Foods", "industry": "Food Processing", "tier": "Enterprise", "arr": 240000, "credit_limit": 500000, "status": "Active", "owner": "Maya Patel"},
    {"id": 2, "id_str": "CUST-0002", "name": "Cirrus Aviation", "industry": "Aerospace", "tier": "Enterprise", "arr": 520000, "credit_limit": 900000, "status": "Active", "owner": "Maya Patel"},
    {"id": 3, "id_str": "CUST-0003", "name": "Halcyon Media", "industry": "Media & Entertainment", "tier": "Mid-Market", "arr": 85000, "credit_limit": 150000, "status": "Active", "owner": "Maya Patel"},
    {"id": 4, "id_str": "CUST-0004", "name": "Orbit Health", "industry": "Healthcare", "tier": "Enterprise", "arr": 180000, "credit_limit": 400000, "status": "Active", "owner": "Alex Chen"},
    {"id": 5, "id_str": "CUST-0005", "name": "Bristow Textiles", "industry": "Textiles", "tier": "Mid-Market", "arr": 62000, "credit_limit": 250000, "status": "Prospect", "owner": "Maya Patel"},
    {"id": 6, "id_str": "CUST-0006", "name": "Apex Logistics Group", "industry": "Logistics", "tier": "Enterprise", "arr": 310000, "credit_limit": 600000, "status": "Active", "owner": "Maya Patel"},
    {"id": 7, "id_str": "CUST-0007", "name": "Vortex Energy Solutions", "industry": "Energy", "tier": "Enterprise", "arr": 420000, "credit_limit": 800000, "status": "Active", "owner": "Alex Chen"},
    {"id": 8, "id_str": "CUST-0008", "name": "Nimbus Technologies", "industry": "Technology", "tier": "Enterprise", "arr": 350000, "credit_limit": 600000, "status": "Active", "owner": "Maya Patel"},
    {"id": 9, "id_str": "CUST-0009", "name": "Solara Renewable Energy", "industry": "Renewable Energy", "tier": "Enterprise", "arr": 410000, "credit_limit": 900000, "status": "Active", "owner": "Alex Chen"},
    {"id": 10, "id_str": "CUST-0010", "name": "Cascade Water Solutions", "industry": "Utilities", "tier": "Mid-Market", "arr": 95000, "credit_limit": 300000, "status": "Active", "owner": "Maya Patel"},
    {"id": 11, "id_str": "CUST-0011", "name": "Pinnacle Realty Group", "industry": "Real Estate", "tier": "Gold", "arr": 95000, "credit_limit": 250000, "status": "Active", "owner": "Maya Patel"},
    {"id": 12, "id_str": "CUST-0012", "name": "Neuron AI Research", "industry": "Technology", "tier": "Enterprise", "arr": 550000, "credit_limit": 1000000, "status": "Active", "owner": "Alex Chen"},
    {"id": 13, "id_str": "CUST-0013", "name": "Gardenia Organic Farms", "industry": "Agriculture", "tier": "Mid-Market", "arr": 72000, "credit_limit": 200000, "status": "Active", "owner": "Maya Patel"},
    {"id": 14, "id_str": "CUST-0014", "name": "Titan Defence Systems", "industry": "Defence", "tier": "Enterprise", "arr": 680000, "credit_limit": 1500000, "status": "Active", "owner": "Alex Chen"},
    {"id": 15, "id_str": "CUST-0015", "name": "Velora Hospitality", "industry": "Hospitality", "tier": "Mid-Market", "arr": 110000, "credit_limit": 350000, "status": "Active", "owner": "Maya Patel"},
    {"id": 16, "id_str": "CUST-0016", "name": "Oceanic Pharmaceuticals", "industry": "Pharmaceuticals", "tier": "Enterprise", "arr": 480000, "credit_limit": 950000, "status": "Active", "owner": "Alex Chen"},
    {"id": 17, "id_str": "CUST-0017", "name": "Bright Future Education", "industry": "Education", "tier": "Mid-Market", "arr": 65000, "credit_limit": 200000, "status": "Prospect", "owner": "Maya Patel"},
    {"id": 18, "id_str": "CUST-0018", "name": "Everest Logistics", "industry": "Logistics", "tier": "Enterprise", "arr": 290000, "credit_limit": 550000, "status": "Active", "owner": "Maya Patel"},
    {"id": 19, "id_str": "CUST-0019", "name": "Starlight Entertainment", "industry": "Media & Entertainment", "tier": "Gold", "arr": 140000, "credit_limit": 400000, "status": "Active", "owner": "Alex Chen"},
    {"id": 20, "id_str": "CUST-0020", "name": "Delta Automotive", "industry": "Automotive", "tier": "Mid-Market", "arr": 78000, "credit_limit": 400000, "status": "Dormant", "owner": "Maya Patel"},
]

SUPPLIERS = [
    {"id": 1, "name": "Siemens India Limited", "contact_name": "Deepak Verma", "email": "deepak.verma@siemens.com", "phone": "+91-22-3966-3000", "city": "Mumbai", "state": "Maharashtra", "gst_number": "27AAACS1234F1Z1", "payment_terms": "Net 30"},
    {"id": 2, "name": "Schneider Electric India", "contact_name": "Ritu Sharma", "email": "ritu.sharma@se.com", "phone": "+91-124-456-7890", "city": "Gurgaon", "state": "Haryana", "gst_number": "06AAACS5678G1Z2", "payment_terms": "Net 45"},
    {"id": 3, "name": "Philips India Ltd", "contact_name": "Amit Banerjee", "email": "amit.banerjee@philips.com", "phone": "+91-33-2287-4567", "city": "Kolkata", "state": "West Bengal", "gst_number": "19AAACP9012H1Z3", "payment_terms": "Net 30"},
    {"id": 4, "name": "Omron Automation Pvt Ltd", "contact_name": "Vikash Jain", "email": "vikash.jain@omron.com", "phone": "+91-80-6712-8900", "city": "Bangalore", "state": "Karnataka", "gst_number": "29AAAC03456I1Z4", "payment_terms": "Net 15"},
    {"id": 5, "name": "Honeywell Automation India", "contact_name": "Pooja Hegde", "email": "pooja.hegde@honeywell.com", "phone": "+91-20-6603-9400", "city": "Pune", "state": "Maharashtra", "gst_number": "27AAACH7890J1Z5", "payment_terms": "Net 60"},
    {"id": 6, "name": "Legrand India Pvt Ltd", "contact_name": "Naveen Pillai", "email": "naveen.pillai@legrand.co.in", "phone": "+91-22-3041-6200", "city": "Mumbai", "state": "Maharashtra", "gst_number": "27AAACL1234K1Z6", "payment_terms": "Net 30"},
    {"id": 7, "name": "Bosch Power Tools India", "contact_name": "Karthik Subramanian", "email": "karthik.s@in.bosch.com", "phone": "+91-80-2299-2111", "city": "Bangalore", "state": "Karnataka", "gst_number": "29AAACB5678L1Z7", "payment_terms": "Net 45"},
    {"id": 8, "name": "Havells India Limited", "contact_name": "Sunil Mittal", "email": "sunil.mittal@havells.com", "phone": "+91-120-477-1000", "city": "Noida", "state": "Uttar Pradesh", "gst_number": "09AAACH9012M1Z8", "payment_terms": "Net 30"},
]
