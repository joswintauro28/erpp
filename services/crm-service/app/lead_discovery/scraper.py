import os
import re
import logging
import asyncio
import threading
import json
import time
import math
import requests
from typing import List, Dict, Any, Optional, Callable
from urllib.parse import urlparse, parse_qs, unquote, urljoin
from scrapling import Fetcher
from scrapling.fetchers import DynamicFetcher
import google.generativeai as genai
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AI_Discovery_Scraper")

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"), override=True)

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment!")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Global concurrency guards to prevent resource exhaustion and API rate limiting
DYNAMIC_FETCH_SEMAPHORE = threading.Semaphore(2)  # Max 2 concurrent DynamicFetcher (Playwright) instances
GEMINI_SEMAPHORE = asyncio.Semaphore(3)           # Max 3 concurrent Gemini API calls
DDG_SEARCH_SEMAPHORE = threading.Semaphore(3)     # Max 3 concurrent search queries

# In-memory caches for performance
SEARCH_CACHE = {}
SEARCH_CACHE_LOCK = threading.Lock()

RAW_SEARCH_CACHE = {}
RAW_SEARCH_CACHE_LOCK = threading.Lock()

CRAWL_CACHE = {}
CRAWL_CACHE_LOCK = threading.Lock()

# Thread-safe DynamicFetcher pool
DYNAMIC_FETCHER_POOL = []
DYNAMIC_FETCHER_POOL_LOCK = threading.Lock()

def get_dynamic_fetcher():
    with DYNAMIC_FETCHER_POOL_LOCK:
        if DYNAMIC_FETCHER_POOL:
            return DYNAMIC_FETCHER_POOL.pop()
    logger.info("Initializing new DynamicFetcher instance for the pool...")
    return DynamicFetcher()

def release_dynamic_fetcher(df):
    with DYNAMIC_FETCHER_POOL_LOCK:
        DYNAMIC_FETCHER_POOL.append(df)

# Discovery limits
MAX_PROFILE_LINKS_PER_DIRECTORY = 25  # Increased from 8 to process more candidates from listings

class LLMProvider:
    """Abstract base class for LLM completion providers."""
    async def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError("Subclasses must implement generate_json")

class GroqProvider(LLMProvider):
    """Groq implementation using Llama-3.3-70b-versatile with strict JSON mode."""
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://api.groq.com/openai/v1/chat/completions"
        self.model_name = "llama-3.3-70b-versatile"

    async def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        
        def post():
            response = requests.post(self.url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            return response.json()
            
        res_data = await asyncio.to_thread(post)
        return res_data["choices"][0]["message"]["content"]

class GeminiProvider(LLMProvider):
    """Gemini implementation using gemini-2.5-flash with structured JSON response config."""
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        response = await model.generate_content_async(user_prompt)
        return response.text.strip()

class UnifiedLLMClient:
    """Unified LLM Client coordinating fallback from Groq to Gemini."""
    def __init__(self):
        self.providers = []
        self.daily_quota_exhausted = False
        self._initialized = False
        
    def _initialize_providers(self):
        if self._initialized: return
        
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        if self.groq_api_key:
            logger.info("Initializing primary LLM Provider: Groq (Llama-3.3-70b-versatile)")
            self.providers.append(GroqProvider(self.groq_api_key))
            
        if self.gemini_api_key:
            logger.info("Initializing fallback LLM Provider: Gemini (gemini-2.5-flash)")
            self.providers.append(GeminiProvider(self.gemini_api_key))
            
        self._initialized = True

    async def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        """Tries each provider in the chain, dynamically handling errors and rate limits."""
        self._initialize_providers()
        
        if self.daily_quota_exhausted:
            logger.warning("LLM client daily quota is exhausted. Skipping API calls.")
            raise Exception("Daily quota exhausted")
            
        if not self.providers:
            # Try reloading dotenv just in case
            from dotenv import load_dotenv
            load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"), override=True)
            self._initialized = False
            self._initialize_providers()
            
        if not self.providers:
            raise ValueError("No LLM API keys found in environment! Must set GROQ_API_KEY or GEMINI_API_KEY.")
            
        last_error = None
        for provider in self.providers:
            provider_name = provider.__class__.__name__
            name_clean = provider_name.replace("Provider", "")
            for attempt in range(3):
                try:
                    logger.info(f"Attempting provider: {name_clean}")
                    result = await provider.generate_json(system_prompt, user_prompt)
                    if result:
                        logger.info(f"Provider {name_clean} succeeded")
                        return result
                except Exception as e:
                    err_msg = str(e)
                    logger.warning(f"Provider {name_clean} failed: {e}")
                    last_error = e
                    
                    retry_seconds = 8 * (attempt + 1)
                    match = re.search(r'(?:Please retry in|after|retry_delay).*?([\d\.]+)\s*s', err_msg, re.IGNORECASE)
                    if not match:
                        match = re.search(r'seconds:\s*(\d+)', err_msg)
                        
                    if match:
                        try:
                            retry_seconds = math.ceil(float(match.group(1)))
                            logger.info(f"Parsed recommended retry delay from error: {retry_seconds}s")
                        except Exception:
                            pass
                            
                    # Check if it is a daily project quota block that won't reset in minutes,
                    # or if the recommended retry delay is excessively long (causing frontend timeouts).
                    is_daily_quota = (
                        "generate_content_free_tier_requests" in err_msg or 
                        "GenerateRequestsPerDay" in err_msg or 
                        "Daily project quota" in err_msg
                    )
                    if is_daily_quota or retry_seconds > 20:
                        if is_daily_quota:
                            self.daily_quota_exhausted = True
                            logger.warning(f"Daily quota block detected for {provider_name}. Setting daily_quota_exhausted flag.")
                        logger.warning(f"Hard quota block or excessive delay ({retry_seconds}s) detected for {provider_name}. Skipping retries to avoid timeouts.")
                        break  # Move to next provider or fail immediately to trigger fallback
                        
                    if attempt < 2:
                        logger.info(f"Sleeping for {retry_seconds}s before retrying...")
                        await asyncio.sleep(retry_seconds)
                        
            logger.warning(f"{provider_name} chain link failed. Moving to next provider...")
            
        if last_error:
            raise last_error
        raise RuntimeError("All configured LLM providers failed to generate content.")

LLM_CLIENT = UnifiedLLMClient()

# Directories or non-company domains to skip
SKIPPED_DOMAINS = {
    # Search engines
    "google.com", "google.co.in", "google.co.uk", "google.co.in", "bing.com", "yahoo.com", "duckduckgo.com", "baidu.com", "yandex.com",
    # Social media
    "facebook.com", "linkedin.com", "twitter.com", "x.com", "instagram.com", "youtube.com", "pinterest.com", 
    "pinterest.co.in", "vimeo.com", "reddit.com", "tumblr.com", "medium.com", "github.com",
    # Directories, business listings, and reviews
    "glassdoor.co.in", "glassdoor.com", "yelu.in", "deldure.com", "asklaila.com", "f6s.com", 
    "tripadvisor.in", "tripadvisor.com", "mapquest.com", "justdial.com", "indiamart.com", 
    "wikipedia.org", "wikipedia.com", "sulekha.com", "yelp.com", "yellowpages.com", 
    "crunchbase.com", "zoominfo.com", "dnb.com", "zaubacorp.com", "ambitionbox.com", 
    "mouthshut.com", "dialindia.com", "tradeindia.com", "exportersindia.com", "kompass.com", 
    "indiahart.com", "yellowpages.co.in", "indiamart.co.in", "justdial.co.in", "infoedge.in", 
    "naukri.com", "indeed.com", "monster.com", "placementindia.com", "quickr.com", "olx.in",
    "olx.co.in", "justdial.org", "yellowpages.org", "maps.google.com"
}

def clean_url(url: str) -> Optional[str]:
    """Extracts and decodes the actual target URL from DuckDuckGo or Google query params."""
    if not url:
        return None
    
    # DuckDuckGo links are often of form //duckduckgo.com/l/?uddg=URL
    if "uddg=" in url:
        match = re.search(r'[?&]uddg=([^&]+)', url)
        if match:
            url = unquote(match.group(1))
            
    # Google links are often of form /url?q=URL
    if url.startswith('/url?q='):
        match = re.search(r'/url\?q=([^&]+)', url)
        if match:
            url = unquote(match.group(1))
            
    if url.startswith("//"):
        url = "https:" + url
        
    return url

def get_domain(url: str) -> str:
    """Extracts primary domain name from a URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""

def is_company_website(url: str) -> bool:
    """Checks if a URL belongs to a real company website rather than a directory."""
    url = clean_url(url)
    if not url:
        return False
    
    domain = get_domain(url)
    if not domain:
        return False
        
    # Check if domain or any parent domain matches skipped list
    for skipped in SKIPPED_DOMAINS:
        if domain == skipped or domain.endswith("." + skipped):
            return False
            
    # Additional filters for directories and aggregators:
    # If the URL contains typical listing sub-directories
    parsed = urlparse(url)
    path = parsed.path.lower()
    for bad_keyword in ["/company/", "/dir/", "/profile/", "/listings/", "/members/", "/organization/", "/wiki/"]:
        if bad_keyword in path:
            return False
            
    return True

def clean_company_name(title: str) -> str:
    """Cleans search result titles to get a better candidate company name."""
    # Split by standard separators
    for sep in ["|", "-", "—", ":", "Contact Us", "About Us", "Home"]:
        if sep in title:
            parts = title.split(sep)
            # Find the part that looks most like a company name (not empty, not generic)
            for part in parts:
                cleaned = part.strip()
                if len(cleaned) > 2 and "duckduckgo" not in cleaned.lower() and "google" not in cleaned.lower() and "search" not in cleaned.lower():
                    return cleaned
    return title.strip()

def search_web_raw(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """Performs a search on DuckDuckGo using duckduckgo_search and returns raw results."""
    from ddgs import DDGS
    with RAW_SEARCH_CACHE_LOCK:
        if query in RAW_SEARCH_CACHE:
            logger.info(f"Raw Search cache HIT for query: '{query}'")
            return RAW_SEARCH_CACHE[query]

    logger.info(f"Raw Web Search for query: {query}")
    results = []
    
    with DDG_SEARCH_SEMAPHORE:
        try:
            ddgs = DDGS()
            # fetch twice as many results in case some are filtered out
            ddg_results = list(ddgs.text(query, max_results=max_results * 2))
            time.sleep(0.5)
            
            for res in ddg_results:
                target_url = clean_url(res.get('href', ''))
                if not target_url:
                    continue
                    
                raw_title = res.get('title', '').strip()
                snippet_text = res.get('body', '').strip()
                
                results.append({
                    "name": raw_title,
                    "url": target_url,
                    "domain": get_domain(target_url),
                    "snippet": snippet_text
                })
                if len(results) >= max_results:
                    break
            
            with RAW_SEARCH_CACHE_LOCK:
                RAW_SEARCH_CACHE[query] = results
            return results
        except Exception as e:
            logger.error(f"Error in raw web search: {e}", exc_info=True)
            return []

async def crawl_reliable_source_if_feasible(url: str) -> str:
    """Attempts to fetch a discovered reliable profile page (e.g., ZaubaCorp, Crunchbase, LinkedIn) if feasible.
    Degrades gracefully if blocked or failed.
    """
    if not url:
        return ""
        
    domain = get_domain(url)
    # Don't spend too long or launch heavy dynamic browser for external profiles if we can avoid it.
    logger.info(f"Attempting to crawl reliable source: {url}")
    try:
        res = await asyncio.to_thread(fetch_page_sync, url, 5000, False)
        if res and res.status == 200:
            text = res.get_all_text() or ""
            text_clean = re.sub(r'\s+', ' ', text).strip()
            logger.info(f"Successfully crawled reliable source {url}. Extracted {len(text_clean)} characters.")
            return f"--- CRAWLED PROFILE ({url}) ---\n{text_clean[:6000]}\n"
    except Exception as e:
        logger.warning(f"Failed crawling reliable source {url}: {e}")
        
    return ""

async def enrich_company_data_via_search(company_name: str, domain: str, city: str) -> Dict[str, Any]:
    """Runs a consolidated targeted search to find LinkedIn Company page, employee counts, revenue, and leadership info."""
    # Consolidate into a single search query to minimize DDG request rate and prevent blocks
    query = f'"{company_name}" {city} (linkedin OR zaubacorp OR crunchbase OR revenue OR employees OR turnover)'
    results = await asyncio.to_thread(search_web_raw, query, max_results=6)
    
    linkedin_url = ""
    reliable_urls_to_crawl = []
    snippets = []
    
    for r in results:
        url = r["url"]
        dom = r["domain"]
        
        # Parse LinkedIn URL
        if not linkedin_url and "linkedin.com/company/" in url.lower():
            linkedin_url = url.split('?')[0].rstrip('/')
            reliable_urls_to_crawl.append(linkedin_url)
            
        if any(p in dom for p in ["zaubacorp.com", "crunchbase.com", "ambitionbox.com"]):
            reliable_urls_to_crawl.append(url)
            
        snippets.append(f"[{url}] ({r['name']}): {r['snippet']}")
        
    # Crawl reliable sources concurrently where feasible
    crawl_contents = []
    if reliable_urls_to_crawl:
        # Limit to top 2 reliable sources to avoid overhead
        crawl_tasks = [crawl_reliable_source_if_feasible(url) for url in reliable_urls_to_crawl[:2]]
        crawl_results = await asyncio.gather(*crawl_tasks)
        for c_res in crawl_results:
            if c_res:
                crawl_contents.append(c_res)
                
    snippets_text = "\n".join(snippets)
    crawled_text = "\n\n".join(crawl_contents)
    
    combined_evidence = ""
    if snippets_text:
        combined_evidence += f"\n=== PUBLIC SEARCH RESULTS SNIPPETS ===\n{snippets_text}\n"
    if crawled_text:
        combined_evidence += f"\n=== CRAWLED RELIABLE SOURCES EVIDENCE ===\n{crawled_text}\n"
        
    return {
        "linkedin": linkedin_url,
        "evidence": combined_evidence
    }

def search_google(query: str, max_results: int = 50) -> List[Dict[str, str]]:
    """Performs a search on DuckDuckGo using duckduckgo_search."""
    from ddgs import DDGS
    with SEARCH_CACHE_LOCK:
        if query in SEARCH_CACHE:
            logger.info(f"Search cache HIT for query: '{query}'")
            return SEARCH_CACHE[query]

    logger.info(f"Searching Web for query: {query}")
    
    with DDG_SEARCH_SEMAPHORE:
        try:
            ddgs = DDGS()
            ddg_results = list(ddgs.text(query, max_results=max_results * 3))
            time.sleep(0.5)
            
            results = []
            seen = set()
            
            for res in ddg_results:
                target_url = clean_url(res.get('href', ''))
                if not target_url:
                    continue
                    
                raw_title = res.get('title', '').strip()
                
                # Check domain instead of calling full is_company_website check (do not filter path directories at search time)
                target_domain = get_domain(target_url)
                if target_domain and target_domain not in SKIPPED_DOMAINS:
                    if target_domain not in seen:
                        seen.add(target_domain)
                        company_name = clean_company_name(raw_title)
                        results.append({
                            "name": company_name,
                            "url": target_url,
                            "domain": target_domain
                        })
                        
                        if len(results) >= max_results:
                            break
                            
            with SEARCH_CACHE_LOCK:
                SEARCH_CACHE[query] = results
            return results
        except Exception as e:
            logger.error(f"Error searching Google/DDG: {e}", exc_info=True)
            return []

def fetch_page_sync(url: str, timeout_ms: int, allow_dynamic: bool = True) -> Optional[Any]:
    """Fetches a URL synchronously and returns the Scrapling response object.
    Uses DYNAMIC_FETCH_SEMAPHORE to serialize DynamicFetcher browser instantiations.
    Reuses browser instances from DYNAMIC_FETCHER_POOL.
    """
    fetcher = Fetcher()
    try:
        res = fetcher.get(url, timeout=timeout_ms)
        if res.status == 200:
            return res
    except Exception as e:
        if not allow_dynamic:
            logger.warning(f"Lightweight fetcher failed for subpage {url}: {e}")
            return None
        logger.warning(f"Lightweight fetcher failed for homepage {url}: {e}. Retrying with StealthyFetcher...")
        
    if allow_dynamic:
        try:
            with DYNAMIC_FETCH_SEMAPHORE:
                logger.info(f"Stealthy dynamic fetch for: {url}")
                dynamic_fetcher = get_dynamic_fetcher()
                try:
                    res = dynamic_fetcher.fetch(url, timeout=timeout_ms, disable_resources=True, headless=True)
                    if res.status == 200:
                        return res
                finally:
                    release_dynamic_fetcher(dynamic_fetcher)
        except Exception as se:
            logger.error(f"DynamicFetcher failed for {url}: {se}")
            
    return None

def extract_subpage_links(base_url: str, res) -> List[str]:
    """Finds up to 5 high-value sub-page URLs from the homepage response (About, Contact, Careers, Products/Services, Blog/News)."""
    try:
        links = res.css('a')
    except Exception:
        return []
        
    subpages = []
    seen_urls = set()
    
    about_keywords = {"about", "about-us", "aboutus", "who we are", "who-we-are", "company", "our-story", "story"}
    contact_keywords = {"contact", "contact-us", "contactus", "get in touch", "get-in-touch", "location", "reach-us"}
    team_keywords = {"team", "leadership", "management", "board", "executives", "directors", "people", "our-team"}
    product_keywords = {"product", "service", "what-we-do", "what we do", "solution", "capability"}
    career_keywords = {"career", "job", "join-us", "join us", "opening", "vacancy"}
    news_keywords = {"news", "press", "media", "announcement", "blog", "release"}
    
    about_links = []
    contact_links = []
    team_links = []
    product_links = []
    career_links = []
    news_links = []
    
    for link in links:
        href = link.attrib.get('href', '').strip()
        if not href or href.startswith('#') or href.startswith('javascript:'):
            continue
            
        absolute_url = urljoin(base_url, href)
        
        # Don't scrape external links
        if get_domain(absolute_url) != get_domain(base_url):
            continue
            
        # Normalize to avoid duplicates
        norm_url = absolute_url.split('?')[0].split('#')[0].rstrip('/')
        if norm_url == base_url.split('?')[0].split('#')[0].rstrip('/'):
            continue
            
        link_text = link.get_all_text().lower().strip()
        link_href_lower = href.lower()
        
        is_contact = any(kw in link_text or kw in link_href_lower for kw in contact_keywords)
        is_team = any(kw in link_text or kw in link_href_lower for kw in team_keywords)
        is_about = any(kw in link_text or kw in link_href_lower for kw in about_keywords)
        is_product = any(kw in link_text or kw in link_href_lower for kw in product_keywords)
        is_career = any(kw in link_text or kw in link_href_lower for kw in career_keywords)
        is_news = any(kw in link_text or kw in link_href_lower for kw in news_keywords)
        
        if is_contact:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                contact_links.append(absolute_url)
        elif is_team:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                team_links.append(absolute_url)
        elif is_about:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                about_links.append(absolute_url)
        elif is_product:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                product_links.append(absolute_url)
        elif is_career:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                career_links.append(absolute_url)
        elif is_news:
            if norm_url not in seen_urls:
                seen_urls.add(norm_url)
                news_links.append(absolute_url)

    results = []
    if contact_links:
        results.append(contact_links[0])
    if team_links:
        results.append(team_links[0])
    if about_links:
        results.append(about_links[0])
    if product_links:
        results.append(product_links[0])
    if career_links:
        results.append(career_links[0])
    if news_links:
        results.append(news_links[0])
        
    return results[:5]

def extract_contacts_from_html(html: str, url: str) -> Dict[str, Any]:
    """Extracts email addresses, phone numbers, addresses, and LinkedIn URLs from page HTML.
    Specifically parses mailto/tel anchors, schema.org / JSON-LD metadata, and footers.
    """
    from bs4 import BeautifulSoup
    contacts = {
        "emails": set(),
        "phones": set(),
        "linkedins": set(),
        "addresses": set(),
        "footer_text": ""
    }
    
    if not html:
        return contacts
        
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. Parse anchors for mailto:, tel: and LinkedIn company pages
        for a in soup.find_all('a', href=True):
            href = a['href'].strip()
            href_lower = href.lower()
            if href_lower.startswith('mailto:'):
                email = href[7:].split('?')[0].strip()
                if email and '@' in email:
                    contacts["emails"].add(email)
            elif href_lower.startswith('tel:'):
                phone = href[4:].split('?')[0].strip()
                if phone:
                    contacts["phones"].add(phone)
            elif "linkedin.com/company/" in href_lower:
                li_url = href.split('?')[0].strip()
                if li_url.startswith('//'):
                    li_url = 'https:' + li_url
                contacts["linkedins"].add(li_url)
                
        # 2. Parse JSON-LD metadata (schema.org)
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                if not script.string:
                    continue
                data = json.loads(script.string)
                
                def parse_schema_item(item):
                    if not isinstance(item, dict):
                        return
                    if "email" in item and isinstance(item["email"], str):
                        contacts["emails"].add(item["email"])
                    if "telephone" in item and isinstance(item["telephone"], str):
                        contacts["phones"].add(item["telephone"])
                    if "address" in item:
                        addr = item["address"]
                        if isinstance(addr, str):
                            contacts["addresses"].add(addr)
                        elif isinstance(addr, dict):
                            parts = [
                                addr.get("streetAddress"),
                                addr.get("addressLocality"),
                                addr.get("addressRegion"),
                                addr.get("postalCode"),
                                addr.get("addressCountry")
                            ]
                            full_addr = ", ".join([str(p) for p in parts if p])
                            if full_addr:
                                contacts["addresses"].add(full_addr)
                    if "sameAs" in item:
                        same_as = item["sameAs"]
                        if isinstance(same_as, str):
                            if "linkedin.com/company/" in same_as.lower():
                                contacts["linkedins"].add(same_as)
                        elif isinstance(same_as, list):
                            for s in same_as:
                                if isinstance(s, str) and "linkedin.com/company/" in s.lower():
                                    contacts["linkedins"].add(s)
                                    
                if isinstance(data, list):
                    for item in data:
                        parse_schema_item(item)
                elif isinstance(data, dict):
                    if "@graph" in data and isinstance(data["@graph"], list):
                        for item in data["@graph"]:
                            parse_schema_item(item)
                    else:
                        parse_schema_item(data)
            except Exception:
                continue
                
        # 3. Extract footer text
        footer = soup.find('footer') or soup.find(id=re.compile('footer', re.I)) or soup.find(class_=re.compile('footer', re.I))
        if footer:
            footer_text = footer.get_text(separator=' ').strip()
            footer_text = re.sub(r'\s+', ' ', footer_text)
            contacts["footer_text"] = footer_text[:1000]
            
    except Exception as e:
        logger.warning(f"Error parsing HTML contacts for {url}: {e}")
        
    return {
        "emails": list(contacts["emails"]),
        "phones": list(contacts["phones"]),
        "linkedins": list(contacts["linkedins"]),
        "addresses": list(contacts["addresses"]),
        "footer_text": contacts["footer_text"]
    }

async def fetch_webpage_text(url: str, timeout_ms: int = 8000) -> tuple[str, Dict[str, Any]]:
    """Fetches text content of homepage and key subpages asynchronously.
    Also extracts contact links and metadata programmatically.
    Returns a tuple of (combined_crawled_text, contacts_dictionary).
    """
    with CRAWL_CACHE_LOCK:
        if url in CRAWL_CACHE:
            logger.info(f"Crawl cache HIT for URL: {url}")
            return CRAWL_CACHE[url]

    logger.info(f"Crawling website: {url}")
    empty_contacts = {"email": "", "phone": "", "address": "", "linkedin": ""}
    
    try:
        # 1. Fetch homepage response in thread (allow dynamic retries for homepage)
        home_res = await asyncio.to_thread(fetch_page_sync, url, timeout_ms, True)
        if not home_res:
            return "", empty_contacts
            
        home_text = home_res.get_all_text() or ""
        home_html = str(home_res.html_content) if home_res.html_content else home_res.body.decode('utf-8', errors='ignore')
        
        combined_text = f"--- HOMEPAGE ({url}) ---\n{home_text}\n\n"
        
        # Extract contacts from homepage HTML
        home_contacts = extract_contacts_from_html(home_html, url)
        all_emails = set(home_contacts["emails"])
        all_phones = set(home_contacts["phones"])
        all_linkedins = set(home_contacts["linkedins"])
        all_addresses = set(home_contacts["addresses"])
        footer_texts = [home_contacts["footer_text"]] if home_contacts["footer_text"] else []
        
        # 2. Extract subpage links
        subpages = extract_subpage_links(url, home_res)
        logger.info(f"Found subpages for {url}: {subpages}")
        
        # 3. Fetch subpages concurrently (DISABLE dynamic fallback retry to save resource and timeout)
        async def fetch_subpage(sub_url):
            try:
                # Use allow_dynamic=False for subpages
                sub_res = await asyncio.to_thread(fetch_page_sync, sub_url, 6000, False)
                if sub_res:
                    sub_text = sub_res.get_all_text() or ""
                    sub_html = str(sub_res.html_content) if sub_res.html_content else sub_res.body.decode('utf-8', errors='ignore')
                    
                    sub_contacts = None
                    # If this subpage is contact page, run contact extraction
                    if "contact" in sub_url.lower():
                        sub_contacts = extract_contacts_from_html(sub_html, sub_url)
                        
                    return sub_url, sub_text, sub_contacts
            except Exception as e:
                logger.warning(f"Error fetching subpage {sub_url}: {e}")
            return sub_url, "", None
            
        if subpages:
            subpage_tasks = [fetch_subpage(sub_url) for sub_url in subpages]
            subpage_results = await asyncio.gather(*subpage_tasks)
            
            for sub_url, sub_text, sub_contacts in subpage_results:
                if sub_text.strip():
                    combined_text += f"--- SUBPAGE ({sub_url}) ---\n{sub_text}\n\n"
                if sub_contacts:
                    all_emails.update(sub_contacts["emails"])
                    all_phones.update(sub_contacts["phones"])
                    all_linkedins.update(sub_contacts["linkedins"])
                    all_addresses.update(sub_contacts["addresses"])
                    if sub_contacts["footer_text"]:
                        footer_texts.append(sub_contacts["footer_text"])
                        
        # Formulate Extracted Structured Contact Metadata
        metadata_str = "\n\n--- EXTRACTED STRUCTURED CONTACT METADATA ---\n"
        if all_emails:
            metadata_str += f"Emails: {', '.join(all_emails)}\n"
        if all_phones:
            metadata_str += f"Phones: {', '.join(all_phones)}\n"
        if all_linkedins:
            metadata_str += f"LinkedIn Company pages: {', '.join(all_linkedins)}\n"
        if all_addresses:
            metadata_str += f"Addresses: {'; '.join(all_addresses)}\n"
        if footer_texts:
            metadata_str += f"Footer Section Texts:\n" + "\n".join(footer_texts) + "\n"
        metadata_str += "---------------------------------------------\n\n"
        
        # Prepend extracted metadata to the combined text
        combined_text = metadata_str + combined_text
        
        # 4. Clean text and cap size
        combined_text = re.sub(r'\s+', ' ', combined_text).strip()
        
        contacts_dict = {
            "email": ", ".join(all_emails) if all_emails else "",
            "phone": ", ".join(all_phones) if all_phones else "",
            "address": "; ".join(all_addresses) if all_addresses else "",
            "linkedin": next(iter(all_linkedins)) if all_linkedins else ""
        }
        
        result_val = (combined_text[:15000], contacts_dict)
        with CRAWL_CACHE_LOCK:
            CRAWL_CACHE[url] = result_val
        return result_val
    except Exception as e:
        logger.error(f"Error crawling website {url}: {e}", exc_info=True)
        return "", empty_contacts

def validate_and_clean_extracted_data(data: Dict[str, Any], url: str) -> Dict[str, Any]:
    """Cleans and validates extracted fields to eliminate placeholders and hallucinations."""
    
    # 1. Validate contacts
    contact = data.get("public_contact", {})
    if not isinstance(contact, dict):
        contact = {}
        
    email = str(contact.get("email", "")).strip()
    phone = str(contact.get("phone", "")).strip()
    address = str(contact.get("address", "")).strip()
    linkedin = str(contact.get("linkedin", "")).strip()
    
    # Email Validation: must contain '@' and '.' and not look like generic template placeholders
    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not email or not re.match(email_regex, email) or any(p in email.lower() for p in ["email@domain.com", "example.com", "yourdomain.com", "email@company.com"]):
        email = ""
        
    # Phone Validation: remove placeholder patterns, check length
    phone_clean = re.sub(r'[\s\-\(\)\+]', '', phone)
    if not phone or len(phone_clean) < 7 or any(p in phone for p in ["123-456-7890", "1234567890", "234-567-8900", "XXXX", "000-000-0000"]):
        phone = ""
        
    # Address Validation: must not be just "Full physical address" or placeholder template
    if not address or any(p in address.lower() for p in ["full physical address", "address here", "your address", "street address"]):
        address = ""
        
    # Linkedin Validation: must be a valid linkedin link
    if linkedin and ("linkedin.com" not in linkedin.lower() or any(p in linkedin.lower() for p in ["company-name", "your-company", "linkedin.com/company/linkedin"])):
        linkedin = ""
        
    data["public_contact"] = {
        "email": email,
        "phone": phone,
        "address": address,
        "linkedin": linkedin
    }
    
    # 2. Key Decision Makers Validation: remove generic placeholders or items without names
    decision_makers = data.get("key_decision_makers", [])
    if not isinstance(decision_makers, list):
        decision_makers = []
        
    cleaned_dms = []
    if len(decision_makers) == 1 and decision_makers[0] == "Not Publicly Available":
        cleaned_dms = ["Not Publicly Available"]
    else:
        generic_titles = {
            'managing director', 'chief operations officer', 'chief executive officer',
            'ceo', 'cto', 'cfo', 'coo', 'cmo', 'founder', 'co-founder',
            'director', 'manager', 'owner', 'president', 'partner', 'chairman', 'none', 'unknown'
        }
        
        for dm in decision_makers:
            if not isinstance(dm, str):
                continue
            dm_clean = dm.strip()
            dm_lower = dm_clean.lower()
            
            if dm_clean == "Not Publicly Available":
                cleaned_dms.append(dm_clean)
                continue
                
            if dm_lower in generic_titles:
                continue
                
            if len(dm_clean) < 3 or any(p in dm_lower for p in ["unknown", "not found", "n/a", "none"]):
                continue
                
            if ' ' not in dm_clean:
                continue
                
            cleaned_dms.append(dm_clean)
            
    if not cleaned_dms:
        cleaned_dms = ["Not Publicly Available"]
    data["key_decision_makers"] = cleaned_dms
    
    # Clean estimated fields
    est_emp = str(data.get("estimated_employees", "")).strip()
    if est_emp.lower() in ["unavailable", "unknown", "not found", "n/a", "none"]:
        est_emp = ""
    data["estimated_employees"] = est_emp

    est_rev = str(data.get("estimated_revenue", "")).strip()
    if est_rev.lower() in ["unavailable", "unknown", "not found", "n/a", "none"]:
        est_rev = ""
    data["estimated_revenue"] = est_rev
    
    # 3. Clean technologies, pain points, recommendations
    for field in ["detected_technologies", "business_pain_points", "recommended_ai_solutions"]:
        vals = data.get(field, [])
        if not isinstance(vals, list):
            vals = []
        cleaned_vals = []
        for val in vals:
            if not isinstance(val, str):
                continue
            val_clean = val.strip()
            if val_clean and not any(p in val_clean.lower() for p in ["placeholder", "none identified", "unknown"]):
                cleaned_vals.append(val_clean)
        data[field] = cleaned_vals
        
    return data

async def extract_company_details(text: str, name: str, url: str, industry: str, city: str, supplementary_desc: str = "", verified_linkedin: str = "", public_contact: Dict[str, Any] = None) -> Dict[str, Any]:
    """Uses UnifiedLLMClient to synthesize unstructured company details, merging with pre-extracted contacts.
    Strictly avoids fabricating information if missing from evidence.
    """
    system_prompt = (
        "You are an expert business intelligence analyzer. Analyze the provided website text, "
        "supplementary directory listings, and search results to synthesize unstructured company profile assessments.\n\n"
        "INSTRUCTIONS:\n"
        "1. ESTIMATES: Extract estimated employee count and revenue if present. ONLY extract these values if they are explicitly stated in the provided text from a reliable public source "
        "(e.g. official website, annual reports, LinkedIn Company page, Crunchbase, ZaubaCorp, AmbitionBox, or other reliable public business sources). "
        "Do NOT estimate, guess, or fabricate these values. If unavailable or not verified, return empty string \"\" for estimated_employees/estimated_revenue, 0 for num_employees, and 0.0 for num_revenue.\n"
        "2. DECISION MAKERS: Extract key decision makers (names and titles/roles) if they can be verified from the text (About, Leadership, LinkedIn, etc.). "
        "If no verified decision makers can be found, return a list containing exactly: [\"Not Publicly Available\"]. Do NOT return \"Unavailable\" or fabricate names.\n"
        "3. PAIN POINTS: Extract 3-4 specific operational/business pain points ONLY if they can be inferred from direct evidence in the text. "
        "If no such evidence is found, you MUST return a list containing exactly: "
        "[\"Insufficient public information available to infer pain points.\"]. Do NOT invent generic placeholders.\n"
        "4. AI RECOMMENDATIONS: Generate 3-4 AI opportunities tailored specifically to the company's size, industry, and observed operational niche. "
        "If there is not enough information to generate tailored recommendations, you MUST return a list containing exactly: "
        "[\"Insufficient public information available to generate AI recommendations.\"].\n"
        "5. INDIVIDUAL COMPANY VALIDATION: You must assess if this page/text represents a single individual business entity. "
        "Set \"is_individual_company\" to true only if this is a single company's homepage/profile. "
        "Set to false if it is a directory listing of multiple companies, a blog post listicle, article listing multiple businesses, news round-up, or third-party company aggregator.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        "  \"company_name\": \"Name of the company\",\n"
        "  \"estimated_employees\": \"Employee count (e.g. '100-250' or '')\",\n"
        "  \"estimated_revenue\": \"Revenue estimate (e.g. '₹5Cr' or '')\",\n"
        "  \"company_overview\": \"Brief 1-2 sentence description of the company\",\n"
        "  \"industry_details\": \"A detailed 3-4 sentence summary of what they specifically do, their niche, and their business model\",\n"
        "  \"ai_readiness_score\": 75, // Integer score from 1-100\n"
        "  \"detected_technologies\": [\"Tech1\", \"Tech2\"],\n"
        "  \"business_pain_points\": [\"Pain Point 1\"],\n"
        "  \"recommended_ai_solutions\": [\"Solution 1\"],\n"
        "  \"key_decision_makers\": [\"Name (Title)\"],\n"
        "  \"num_employees\": 250,\n"
        "  \"num_revenue\": 1.5,\n"
        "  \"is_individual_company\": true\n"
        "}"
    )

    prompt = (
        f"Official URL: {url}\n"
        f"Company Name: {name}\n"
        f"Expected Industry: {industry}\n"
        f"Expected City: {city}\n"
        f"Provided Verified LinkedIn URL: {verified_linkedin}\n\n"
        f"CRAWLED EVIDENCE TEXT (OFFICIAL WEBSITE - PREFERRED):\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        f"SUPPLEMENTARY SEARCH EVIDENCE (THIRD-PARTY - SUPPLEMENTARY ONLY):\n"
        f"\"\"\"\n{supplementary_desc}\n\"\"\""
    )

    if LLM_CLIENT.daily_quota_exhausted:
        logger.info(f"Skipping LLM synthesis for {name} (daily quota exhausted).")
        return get_partial_profile(name, url, industry, city, public_contact)

    async with GEMINI_SEMAPHORE:
        try:
            content = await LLM_CLIENT.generate_json(system_prompt, prompt)
            import json
            parsed = json.loads(content)
            
            cleaned_co = validate_and_clean_extracted_data(parsed, url)
            cleaned_co["company_name"] = cleaned_co.get("company_name", name) or name
            cleaned_co["website"] = url
            cleaned_co["industry"] = industry
            cleaned_co["location"] = f"{city}, India"
            cleaned_co["is_individual_company"] = parsed.get("is_individual_company", True)
            cleaned_co["gemini_enriched"] = True
            
            # Map pre-extracted programmatic contact details
            pc = cleaned_co.setdefault("public_contact", {})
            for field in ["email", "phone", "address", "linkedin"]:
                pc[field] = public_contact.get(field, "") if public_contact else ""
                
            if verified_linkedin and not pc["linkedin"]:
                pc["linkedin"] = verified_linkedin
                
            return cleaned_co
        except Exception as e:
            logger.error(f"LLM synthesis failed for {name}: {e}")
            return get_partial_profile(name, url, industry, city, public_contact)

def get_partial_profile(name: str, url: str, industry: str, city: str, public_contact: Dict[str, Any] = None) -> Dict[str, Any]:
    """Returns a partial, un-fabricated company profile using only verified basic info."""
    return {
        "company_name": name,
        "industry": industry,
        "location": f"{city}, India",
        "website": url,
        "estimated_employees": "",
        "estimated_revenue": "",
        "company_overview": f"A company operating in the {industry} sector based in {city}.",
        "industry_details": f"Detailed operations and niche focus could not be verified from public sources.",
        "ai_readiness_score": 0,
        "detected_technologies": [],
        "business_pain_points": ["Insufficient public information available to infer pain points."],
        "recommended_ai_solutions": ["Insufficient public information available to generate AI recommendations."],
        "key_decision_makers": ["Not Publicly Available"],
        "public_contact": public_contact or {
            "email": "",
            "phone": "",
            "address": "",
            "linkedin": ""
        },
        "num_employees": 0,
        "num_revenue": 0.0,
        "is_individual_company": True,
        "gemini_enriched": False
    }

def is_directory_url(url: str, title: str) -> bool:
    """Classifies if a search result page is a directory listing/article/blog listicle rather than a company homepage."""
    url_lower = url.lower()
    title_lower = title.lower()
    
    # Check for listing/ranking/aggregator keywords in URL or title
    keywords = [
        "top-10", "top-20", "top-50", "top-100", "top-5", "top-3", "top-15",
        "top 3", "top 5", "top 10", "top 15", "top 20", "top 30", "top 50", "top 100",
        "best-", "best-companies", "list-of", "directory-of", "companies-in", "ranking",
        "famous", "index", "guide", "yellowpages", "listings", "indiamart", "justdial", "sulekha",
        "manufacturers-in", "directory", "directories", "listicle", "listing", "top-ranking"
    ]
    for kw in keywords:
        cleaned_kw = kw.replace("-", " ")
        if kw in url_lower or cleaned_kw in title_lower:
            return True
            
    domain = get_domain(url)
    # Check for common directory/aggregator/article/blog domains
    if any(d in domain for d in [
        "wikipedia.org", "medium.com", "tripadvisor", "glassdoor", "zaubacorp", "crunchbase", 
        "ambitionbox", "justdial", "indiamart", "sulekha", "quora.com", "blogger.com", 
        "wordpress.com", "yelp.com", "yellowpages"
    ]):
        return True
        
    return False

def parse_links_from_html(html: str, base_url: str) -> List[Dict[str, str]]:
    """Deterministic HTML link parser to extract company names and website URLs from directory/article structure."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    
    candidates = []
    seen_domains = set()
    
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        abs_url = urljoin(base_url, href)
        
        cleaned = clean_url(abs_url)
        if not cleaned:
            continue
            
        domain = get_domain(cleaned)
        if not domain:
            continue
            
        # Ensure it's a valid external company website
        if is_company_website(cleaned) and domain != get_domain(base_url) and domain not in seen_domains:
            text = a.get_text().strip()
            cleaned_name = clean_company_name(text)
            
            # Filter out utility links like "visit website", "read more", "source"
            if len(cleaned_name) > 2 and not any(w in cleaned_name.lower() for w in ["visit", "website", "click here", "link", "source", "read more", "homepage", "contact"]):
                seen_domains.add(domain)
                candidates.append({
                    "name": cleaned_name,
                    "url": cleaned,
                    "domain": domain
                })
                
    return candidates

def get_directory_profile_patterns() -> List[str]:
    """Typical sub-directory URL path structures representing company profiles on listing portals."""
    return [
        "/profile/", "/company/", "/brand/", "/business/", "/org/", "/details/", 
        "/listing/", "/firm/", "/b/v/in/", "/overview/", "/co/"
    ]

def is_directory_profile_url(url: str, base_url: str) -> bool:
    """Checks if a URL is an internal profile link on the directory website."""
    base_domain = get_domain(base_url)
    url_domain = get_domain(url)
    if base_domain != url_domain:
        return False
        
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    # Don't match listing/index pages
    if any(k in path for k in ["/best-", "/top-", "/list-of", "/companies-in", "/directory-of"]):
        return False
        
    for pattern in get_directory_profile_patterns():
        if pattern in path:
            return True
            
    return False

def parse_directory_page(html: str, base_url: str) -> tuple[List[Dict[str, str]], List[str]]:
    """Parses a directory page to extract direct company websites and internal profile URLs."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    
    direct_candidates = []
    profile_links = []
    
    seen_domains = set()
    seen_profile_urls = set()
    
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        abs_url = urljoin(base_url, href)
        cleaned = clean_url(abs_url)
        if not cleaned:
            continue
            
        domain = get_domain(cleaned)
        if not domain:
            continue
            
        # Check for direct external company website
        if is_company_website(cleaned) and domain != get_domain(base_url):
            if domain not in seen_domains:
                text = a.get_text().strip()
                cleaned_name = clean_company_name(text)
                if len(cleaned_name) > 2 and not any(w in cleaned_name.lower() for w in ["visit", "website", "click here", "link", "source", "read more", "homepage", "contact"]):
                    seen_domains.add(domain)
                    direct_candidates.append({
                        "name": cleaned_name,
                        "url": cleaned,
                        "domain": domain,
                        "source": base_url
                    })
        # Check for internal directory profile link
        elif is_directory_profile_url(cleaned, base_url):
            if cleaned not in seen_profile_urls:
                seen_profile_urls.add(cleaned)
                profile_links.append(cleaned)
                
    return direct_candidates, profile_links

async def fetch_raw_page(url: str, timeout_ms: int = 8000) -> Optional[tuple[str, str]]:
    """Fetches a URL and returns a tuple of (plain_text, raw_html)."""
    res = await asyncio.to_thread(fetch_page_sync, url, timeout_ms)
    if res:
        try:
            text = res.get_all_text() or ""
            html = str(res.html_content) if res.html_content else res.body.decode('utf-8', errors='ignore')
            return text, html
        except Exception as e:
            logger.warning(f"Error extracting content from response for {url}: {e}")
    return None

async def extract_details_from_profile_page(profile_url: str) -> Optional[Dict[str, Any]]:
    """Crawls an internal directory profile page to get company name, website, and basic info."""
    raw_res = await fetch_raw_page(profile_url)
    if not raw_res:
        return None
    text, html = raw_res
    
    # 1. Use BeautifulSoup to extract any external links on this profile page
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    
    external_url = None
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        abs_url = urljoin(profile_url, href)
        cleaned = clean_url(abs_url)
        if cleaned:
            domain = get_domain(cleaned)
            if domain and is_company_website(cleaned) and domain != get_domain(profile_url):
                external_url = cleaned
                break
                
    title = soup.title.string if soup.title else ""
    company_name = clean_company_name(title)
    
    if not external_url or not company_name:
        # Fallback to LLM to extract Name and Website from the profile page text
        if GEMINI_API_KEY and len(text) > 200:
            try:
                system_prompt = (
                    "You are a structured business parser. Extract the company's official name "
                    "and their official external website URL from the directory profile page text.\n"
                    "Return JSON with keys 'name' and 'website'. Set website to empty string if not found."
                )
                model = genai.GenerativeModel(
                    'gemini-2.5-flash',
                    system_instruction=system_prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                response = await model.generate_content_async(text[:8000])
                import json
                parsed = json.loads(response.text.strip())
                ext_name = parsed.get("name", "").strip()
                ext_web = parsed.get("website", "").strip()
                if ext_name:
                    company_name = ext_name
                if ext_web and is_company_website(ext_web):
                    external_url = ext_web
            except Exception as e:
                logger.error(f"Error parsing profile page via Gemini: {e}")
                
    if company_name:
        return {
            "name": company_name,
            "url": external_url or "",
            "description": text[:4000]
        }
    return None

async def find_official_website(company_name: str, city: str) -> Optional[str]:
    """Performs a targeted web search to locate the official website for a company in search-provider agnostic manner."""
    query = f"{company_name} {city} official website"
    logger.info(f"Targeted fallback search for official website: {query}")
    results = search_google(query, max_results=5)
    
    for res in results:
        url = res["url"]
        
        # Verify the candidate is a valid company website and not another directory
        if is_company_website(url) and not is_directory_url(url, res["name"]):
            logger.info(f"Located official website for '{company_name}': {url}")
            return url
            
    return None

def calculate_confidence_score(profile: Dict[str, Any], crawled_text_len: int) -> int:
    """Computes a confidence score from 0-5 based on verifiability and data quality."""
    score = 0
    
    # 1. Official website verified and content retrieved
    if profile.get("website") and crawled_text_len > 200:
        score += 1
        
    contact = profile.get("public_contact", {})
    # 2. Contact details found (email or phone)
    if contact.get("email") or contact.get("phone"):
        score += 1
        
    # 3. Address verified
    if contact.get("address"):
        score += 1
        
    # 4. LinkedIn found
    if contact.get("linkedin"):
        score += 1
        
    # 5. Rich content found (actual pain points or tech stack)
    pains = profile.get("business_pain_points", [])
    has_real_pains = len(pains) > 0 and not any("insufficient" in p.lower() for p in pains)
    techs = profile.get("detected_technologies", [])
    has_techs = len(techs) > 0
    if has_real_pains or has_techs:
        score += 1
        
    return score

async def extract_companies_from_directory(directory_url: str, text: str, html_content: str = None) -> List[Dict[str, str]]:
    """Extracts listed company names and websites from directory pages using deterministic parsing and structured extraction.
    Prefer deterministic parsing from HTML anchors when direct links are present, using Gemini only where semantic interpretation is needed.
    """
    # 1. Deterministic extraction from HTML links first (highly reliable for URLs)
    deterministic_list = []
    if html_content:
        try:
            deterministic_list = parse_links_from_html(html_content, directory_url)
        except Exception as e:
            logger.error(f"Error in deterministic link parsing: {e}")
            
    # 2. LLM-assisted extraction for semantic interpretation (only if key is available and html has less structured data)
    if GEMINI_API_KEY and text and not deterministic_list:
        system_prompt = (
            "You are an expert business intelligence parser. Analyze the text of a directory page and "
            "extract all individual companies listed, along with their official websites.\n\n"
            "Return a raw JSON object with a single key \"companies\", containing a list of company objects.\n\n"
            "JSON SCHEMA:\n"
            "{\n"
            "  \"companies\": [\n"
            "    {\n"
            "      \"company_name\": \"Clean Name of Company\",\n"
            "      \"website\": \"Official website URL (if mentioned, otherwise empty string)\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        prompt = f"Source URL: {directory_url}\n\nDIRECTORY TEXT:\n\"\"\"\n{text[:12000]}\n\"\"\""
        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=system_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            response = await model.generate_content_async(prompt)
            import json
            parsed = json.loads(response.text.strip())
            llm_companies = parsed.get("companies", [])
            
            merged = []
            seen_domains = set()
            
            for co in llm_companies:
                name = co.get("company_name", "").strip()
                url = co.get("website", "").strip()
                if not name:
                    continue
                
                cleaned_url = clean_url(url) if url else None
                domain = get_domain(cleaned_url) if cleaned_url else None
                
                if domain and domain in seen_domains:
                    continue
                    
                if domain:
                    seen_domains.add(domain)
                merged.append({
                    "name": name,
                    "url": cleaned_url or "",
                    "domain": domain or ""
                })
                
            return merged
        except Exception as e:
            logger.error(f"Gemini candidate directory extraction failed: {e}")
            
    return deterministic_list

def validate_and_filter_profiles(profiles: List[Dict[str, Any]], expected_city: str, expected_industry: str) -> List[Dict[str, Any]]:
    """Validates company profiles, filters duplicates, and discards low-confidence entries."""
    validated = []
    seen_names = set()
    seen_domains = set()
    
    for co in profiles:
        name = co.get("company_name", "").strip()
        url = co.get("website", "").strip()
        
        if not name or not url:
            continue
            
        name_lower = name.lower()
        domain = get_domain(url)
        
        # 1. Deduplication
        if name_lower in seen_names or (domain and domain in seen_domains):
            continue
            
        # 2. Quality Validation: Ensure the result represents a real company rather than an article/directory page
        if not co.get("is_individual_company", True):
            logger.info(f"Discarding candidate '{name}' because it was classified as a listing, directory or listicle page.")
            continue
            
        if any(p in name_lower for p in ["top 10", "top 20", "best companies", "list of", "20 best", "directory of", "companies in", "ranking", "famous", "guide", "index"]):
            continue
            
        # 3. Discard low-confidence profiles (e.g. if company name is generic or very short)
        if len(name) <= 2 or url.startswith("https://www.example.com") or url.strip() == "":
            continue
            
        seen_names.add(name_lower)
        if domain:
            seen_domains.add(domain)
            
        validated.append(co)
        
    return validated

async def discover_and_qualify_companies(city: str, industry: str, max_companies: int = 50, company_name: str = "", is_cancelled: Optional[Callable[[], Any]] = None) -> List[Dict[str, Any]]:
    """Discovers matching companies for city/industry or specific company name, crawls their sites, and qualifies them."""
    if is_cancelled and await is_cancelled():
        logger.info("Discovery task cancelled by client request at the start.")
        return []

    if company_name:
        logger.info(f"=== TRACING DISCOVERY PIPELINE FOR COMPANY: {company_name} (Location: {city}, Industry: {industry}) ===")
    else:
        logger.info(f"=== TRACING DISCOVERY PIPELINE: {industry} in {city} ===")
    
    # Reset LLM daily quota exhaustion flag at the start of each new search request
    LLM_CLIENT.daily_quota_exhausted = False
    
    # Trackers for diagnostic logging
    raw_search_results_count = 0
    directory_extracted_domains = set()
    
    # 1. Search: Use expanded queries to target direct websites and directories
    if company_name:
        queries = [
            f"{company_name} {city}" if city else company_name,
            company_name
        ]
    else:
        queries = [
            f"{industry} company in {city}",
            f"{industry} manufacturers in {city}",
            f"{industry} services {city}",
            f"best {industry} firms in {city}",
            f"top {industry} companies in {city}"
        ]
    
    logger.info(f"[STAGE 1 - SEARCH] Running {len(queries)} queries...")
    unique_search_results = {}
    
    # Execute search queries concurrently in threads
    search_tasks = [asyncio.to_thread(search_google, query, 30) for query in queries]
    search_results = await asyncio.gather(*search_tasks)
    
    for discovered in search_results:
        raw_search_results_count += len(discovered)
        for comp in discovered:
            domain = comp["domain"]
            if domain and domain not in unique_search_results:
                unique_search_results[domain] = comp
                
    search_candidates = list(unique_search_results.values())
    logger.info(f"[STAGE 1 - SEARCH] Total unique search candidate domains: {len(search_candidates)}")
    if not search_candidates:
        logger.info("No candidates found via search.")
        return []
        
    # 2. Identify Candidates: Parse Direct Sites + Extract from Directory Pages
    if is_cancelled and await is_cancelled():
        logger.info("Discovery task cancelled by client request at Stage 2.")
        return []
    logger.info("[STAGE 2 - IDENTIFICATION] Checking directories vs direct sites...")
    final_candidates = {}
    
    async def process_search_result(cand):
        url = cand["url"]
        title = cand["name"]
        
        if is_directory_url(url, title):
            logger.info(f"Processing directory result: {url}")
            raw_res = await fetch_raw_page(url)
            if not raw_res:
                return
            dir_text, dir_html = raw_res
            
            # Parse links (direct and internal profile links)
            direct_cands, profile_links = parse_directory_page(dir_html, url)
            logger.info(f"  Parsed {len(direct_cands)} direct company links and {len(profile_links)} profile links from directory {url}")
            
            # Add direct candidates
            for dc in direct_cands:
                dom = dc["domain"]
                if dom not in final_candidates:
                    final_candidates[dom] = {
                        "name": dc["name"],
                        "url": dc["url"],
                        "supplementary_desc": ""
                    }
                directory_extracted_domains.add(dom)
                    
            # Follow internal profile links (limit to MAX_PROFILE_LINKS_PER_DIRECTORY to prevent crawling overhead)
            profile_tasks = [extract_details_from_profile_page(pl) for pl in profile_links[:MAX_PROFILE_LINKS_PER_DIRECTORY]]
            profiles = await asyncio.gather(*profile_tasks)
            
            for prof in profiles:
                if not prof:
                    continue
                name = prof["name"]
                web = prof["url"]
                desc = prof["description"]
                
                if web:
                    dom = get_domain(web)
                    if dom and dom not in final_candidates:
                        final_candidates[dom] = {
                            "name": name,
                            "url": web,
                            "supplementary_desc": desc
                        }
                    if dom:
                        directory_extracted_domains.add(dom)
                else:
                    # No website found on the profile page, perform targeted search fallback
                    target_web = await find_official_website(name, city)
                    if target_web:
                        dom = get_domain(target_web)
                        if dom and dom not in final_candidates:
                            final_candidates[dom] = {
                                "name": name,
                                "url": target_web,
                                "supplementary_desc": desc
                            }
                        if dom:
                            directory_extracted_domains.add(dom)
        else:
            # Direct company site candidate
            dom = get_domain(url)
            if dom and dom not in final_candidates:
                final_candidates[dom] = {
                    "name": title,
                    "url": url,
                    "supplementary_desc": ""
                }
                
    # Crawl search results to check directories
    await asyncio.gather(*(process_search_result(c) for c in search_candidates))
    logger.info(f"[STAGE 2 - IDENTIFICATION] Total merged candidates after directory parsing: {len(final_candidates)}")
    
    # Clean list of candidates
    candidates_list = [v for k, v in final_candidates.items() if is_company_website(v["url"])]
    logger.info(f"[STAGE 3 - PRE-CRAWL FILTER] Candidates matching is_company_website: {len(candidates_list)}")
    total_candidates_before_slice = len(candidates_list)
    candidates_list = candidates_list[:max_companies]
    logger.info(f"[STAGE 3 - PRE-CRAWL FILTER] Slicing candidates to max_companies={max_companies}: {len(candidates_list)}")
    if not candidates_list:
        logger.info("No verified company candidates found.")
        return []
        
    # 3. Verify & Collect Evidence
    # Concurrently crawl candidate websites and perform targeted raw searches
    if is_cancelled and await is_cancelled():
        logger.info("Discovery task cancelled by client request at Stage 4.")
        return []
    logger.info(f"[STAGE 4 - CRAWLING & SEARCH] Processing crawling and consolidated searches for {len(candidates_list)} candidates...")
    crawl_tasks = []
    enrichment_search_tasks = []
    
    for cand in candidates_list:
        crawl_tasks.append(fetch_webpage_text(cand["url"]))
        enrichment_search_tasks.append(enrich_company_data_via_search(cand["name"], get_domain(cand["url"]), city))
        
    # Combine both sets of tasks in a single concurrent gather to run both crawling and search enrichment completely in parallel
    combined_results = await asyncio.gather(*crawl_tasks, *enrichment_search_tasks, return_exceptions=True)
    crawled_results = combined_results[:len(crawl_tasks)]
    enrichment_search_results = combined_results[len(crawl_tasks):]
    
    crawled_texts = []
    crawled_contacts = []
    success_crawled_count = 0
    for res in crawled_results:
        if isinstance(res, tuple) and len(res) == 2:
            crawled_texts.append(res[0])
            crawled_contacts.append(res[1])
            if len(res[0]) >= 200:
                success_crawled_count += 1
        else:
            crawled_texts.append("")
            crawled_contacts.append({"email": "", "phone": "", "address": "", "linkedin": ""})
            
    logger.info(f"[STAGE 4 - CRAWLING & SEARCH] Crawling results: successfully crawled {success_crawled_count}/{len(candidates_list)} websites.")
    
    # 4. Synthesize Profile & Assessment via Gemini
    if is_cancelled and await is_cancelled():
        logger.info("Discovery task cancelled by client request at Stage 5.")
        return []
    logger.info(f"[STAGE 5 - GEMINI SYNTHESIS] Spawning {len(candidates_list)} Gemini enrichment tasks...")
    enrichment_tasks = []
    for i, cand in enumerate(candidates_list):
        text = crawled_texts[i]
        search_info = enrichment_search_results[i]
        if isinstance(search_info, Exception) or not search_info:
            search_info = {"linkedin": "", "evidence": ""}
            
        # Combine the crawled website text with supplementary descriptions and targeted search evidence
        supplementary_desc = cand.get("supplementary_desc", "")
        if search_info.get("evidence"):
            supplementary_desc = f"{supplementary_desc}\n\n{search_info['evidence']}"
            
        task = extract_company_details(
            text=text, 
            name=cand["name"], 
            url=cand["url"], 
            industry=industry, 
            city=city, 
            supplementary_desc=supplementary_desc, 
            verified_linkedin=search_info.get("linkedin", ""),
            public_contact=crawled_contacts[i]
        )
        enrichment_tasks.append(task)
        
    profiles = await asyncio.gather(*enrichment_tasks)
    logger.info(f"[STAGE 5 - GEMINI SYNTHESIS] Completed {len(profiles)} profiles.")
    
    # Calculate successful LLM enrichments
    successful_enrichments_count = len([p for p in profiles if p.get("gemini_enriched", True)])
    
    # 5. Quality Validation, Filtering, and Confidence Checks
    validated_profiles = []
    pre_validated = validate_and_filter_profiles(profiles, city, industry)
    logger.info(f"[STAGE 6 - FILTER] Pre-validated profiles count after is_individual_company check: {len(pre_validated)}")
    
    for prof in pre_validated:
        # Retrieve the crawled text length for this profile
        crawled_len = 0
        matching_cand = next((c for c in candidates_list if c["url"] == prof["website"]), None)
        if matching_cand:
            idx = candidates_list.index(matching_cand)
            txt = crawled_texts[idx]
            if isinstance(txt, str):
                crawled_len = len(txt)
                
        # Compute confidence score
        score = calculate_confidence_score(prof, crawled_len)
        logger.info(f"Confidence score for '{prof['company_name']}': {score}/5")
        
        # Resiliency: If Gemini failed (gemini_enriched = False), keep it as a fallback profile so we don't lose verified basic info
        is_gemini_enriched = prof.get("gemini_enriched", True)
        if is_gemini_enriched:
            if score >= 2:
                validated_profiles.append(prof)
            else:
                logger.info(f"Discarding low-confidence profile for '{prof['company_name']}' (score: {score})")
        else:
            logger.info(f"Resilience Keep: Retaining fallback profile (Gemini rate-limited/failed) for '{prof['company_name']}' with verified details.")
            validated_profiles.append(prof)
            
    # Diagnostic Pipeline Stage summary logging
    logger.info(
        f"\n=== DIAGNOSTIC PIPELINE SUMMARY ===\n"
        f"Raw search results: {raw_search_results_count}\n"
        f"Unique domains: {len(search_candidates)}\n"
        f"Companies extracted from directories: {len(directory_extracted_domains)}\n"
        f"Total candidates: {total_candidates_before_slice}\n"
        f"Candidates after limit: {len(candidates_list)}\n"
        f"Crawled successfully: {success_crawled_count}\n"
        f"LLM enrichments succeeded: {successful_enrichments_count}\n"
        f"Qualified companies: {len(validated_profiles)}\n"
        f"====================================\n"
    )
    
    logger.info(f"[STAGE 6 - FILTER] Successfully completed pipeline. Returning {len(validated_profiles)} profiles.")
    return validated_profiles


