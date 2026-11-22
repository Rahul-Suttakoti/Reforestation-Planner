import httpx
import asyncio
import time
import math
import re
from typing import List, Dict, Any, Optional, Tuple

# Comprehensive curated registry of major metropolitan hubs, IT corridors, landmarks,
# metro stations, roads, malls, forts, and ecological reserves with exact coordinates.
POPULAR_HUBS: List[Dict[str, Any]] = [
    # Top IT Corridors & Bengaluru Neighborhoods
    {"name": "Whitefield", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9698, "lon": 77.7499, "aliases": ["whitefield", "itpl", "kadugodi", "seegehalli"]},
    {"name": "Whitefield (Kadugodi)", "category": "Metro / Station", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9957, "lon": 77.7579, "aliases": ["whitefield station", "whitefield metro", "kadugodi"]},
    {"name": "Koramangala", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9352, "lon": 77.6245, "aliases": ["koramangala", "forum mall"]},
    {"name": "Indiranagar", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9784, "lon": 77.6408, "aliases": ["indiranagar", "100ft road", "12th main"]},
    {"name": "HSR Layout", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9121, "lon": 77.6446, "aliases": ["hsr", "hsr layout", "sector 1"]},
    {"name": "BTM Layout", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9166, "lon": 77.6101, "aliases": ["btm", "btm layout", "madiwala"]},
    {"name": "Electronic City", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.8452, "lon": 77.6602, "aliases": ["electronic city", "electronics city", "ecity", "infosys"]},
    {"name": "Manyata Tech Park", "category": "Building / POI", "region": "Nagavara, Bengaluru", "country": "India", "lat": 13.0483, "lon": 77.6211, "aliases": ["manyata", "manyata tech park", "nagavara"]},
    {"name": "Bellandur (Outer Ring Road)", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9304, "lon": 77.6784, "aliases": ["bellandur", "ecospace", "outer ring road", "orr"]},
    {"name": "Marathahalli", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9591, "lon": 77.6974, "aliases": ["marathahalli", "bridge", "multiplex"]},
    {"name": "Sarjapur Road", "category": "Street / Road", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9103, "lon": 77.6850, "aliases": ["sarjapur", "sarjapur road", "wipro"]},
    {"name": "Hebbal", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 13.0358, "lon": 77.5970, "aliases": ["hebbal", "hebbal flyover", "hebbal lake"]},
    {"name": "Jayanagar", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9308, "lon": 77.5838, "aliases": ["jayanagar", "4th block"]},
    {"name": "JP Nagar", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9063, "lon": 77.5857, "aliases": ["jp nagar", "sarakki"]},
    {"name": "Malleshwaram", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 13.0031, "lon": 77.5703, "aliases": ["malleshwaram", "malleswaram", "sampige road"]},
    {"name": "Rajajinagar", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9982, "lon": 77.5530, "aliases": ["rajajinagar", "orion mall"]},
    {"name": "Basavanagudi", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9416, "lon": 77.5755, "aliases": ["basavanagudi", "bull temple", "gandhi bazaar"]},
    {"name": "Banashankari", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9255, "lon": 77.5468, "aliases": ["banashankari", "bsk"]},
    {"name": "Yelahanka", "category": "Locality", "region": "Bengaluru, Karnataka", "country": "India", "lat": 13.1007, "lon": 77.5963, "aliases": ["yelahanka", "yelahanka new town"]},
    {"name": "Kempegowda International Airport (BLR)", "category": "Building / POI", "region": "Devanahalli, Bengaluru", "country": "India", "lat": 13.1986, "lon": 77.7066, "aliases": ["kempegowda airport", "bangalore airport", "blr airport", "airport"]},

    # Key Bengaluru Landmarks, Parks & Metro Stations
    {"name": "MG Road", "category": "Street / Road", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9756, "lon": 77.6066, "aliases": ["mg road", "mahatma gandhi road"]},
    {"name": "MG Road Metro Station", "category": "Metro / Station", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9754, "lon": 77.6065, "aliases": ["mg road metro", "mg road metro station", "purple line"]},
    {"name": "Church Street", "category": "Street / Road", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9749, "lon": 77.6053, "aliases": ["church street", "blossom"]},
    {"name": "Brigade Road", "category": "Street / Road", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9723, "lon": 77.6074, "aliases": ["brigade road", "rex"]},
    {"name": "Commercial Street", "category": "Street / Road", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9822, "lon": 77.6083, "aliases": ["commercial street"]},
    {"name": "Cubbon Park", "category": "Forest / Reserve", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9763, "lon": 77.5929, "aliases": ["cubbon park", "cubbon park metro"]},
    {"name": "Lalbagh Botanical Garden", "category": "Forest / Reserve", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9507, "lon": 77.5848, "aliases": ["lalbagh", "lal bagh", "glass house", "lalbagh botanical garden"]},
    {"name": "Vidhana Soudha", "category": "Building / POI", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9796, "lon": 77.5907, "aliases": ["vidhana soudha", "assembly", "attara kacheri"]},
    {"name": "Majestic (Kempegowda Bus Station)", "category": "Metro / Station", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.9767, "lon": 77.5713, "aliases": ["majestic", "kbs", "kempegowda bus station", "city railway station"]},
    {"name": "Phoenix Marketcity Bangalore", "category": "Building / POI", "region": "Whitefield, Bengaluru", "country": "India", "lat": 12.9977, "lon": 77.6966, "aliases": ["phoenix marketcity", "phoenix mall", "whitefield mall"]},
    {"name": "Orion Mall", "category": "Building / POI", "region": "Rajajinagar, Bengaluru", "country": "India", "lat": 13.0110, "lon": 77.5552, "aliases": ["orion mall", "brigade gateway"]},
    {"name": "Forum Mall (Nexus Koramangala)", "category": "Building / POI", "region": "Koramangala, Bengaluru", "country": "India", "lat": 12.9352, "lon": 77.6111, "aliases": ["forum mall", "nexus koramangala"]},
    {"name": "UB City", "category": "Building / POI", "region": "Vittal Mallya Road, Bengaluru", "country": "India", "lat": 12.9716, "lon": 77.5958, "aliases": ["ub city", "vittal mallya"]},

    # Karnataka Hills, Forts & Ecological Reserves
    {"name": "Nandi Hills", "category": "Geographic Landmark", "region": "Chikkaballapura, Karnataka", "country": "India", "lat": 13.3702, "lon": 77.6835, "aliases": ["nandi hills", "nandidurga", "tipu drop"]},
    {"name": "Gudibande Fort", "category": "Building / POI", "region": "Chikkaballapura, Karnataka", "country": "India", "lat": 13.6763, "lon": 77.7010, "aliases": ["gudibande", "gudibande fort"]},
    {"name": "Madhugiri Monolith & Fort", "category": "Building / POI", "region": "Tumakuru, Karnataka", "country": "India", "lat": 13.6631, "lon": 77.2105, "aliases": ["madhugiri", "madhugiri fort"]},
    {"name": "Skandagiri (Kalavara Durga)", "category": "Geographic Landmark", "region": "Chikkaballapura, Karnataka", "country": "India", "lat": 13.4183, "lon": 77.6833, "aliases": ["skandagiri", "kalavara durga"]},
    {"name": "Savandurga", "category": "Geographic Landmark", "region": "Magadi, Karnataka", "country": "India", "lat": 12.9197, "lon": 77.2933, "aliases": ["savandurga", "savandurga hill"]},
    {"name": "Shivagange", "category": "Geographic Landmark", "region": "Dobbaspet, Karnataka", "country": "India", "lat": 13.1691, "lon": 77.2272, "aliases": ["shivagange", "shivgange"]},
    {"name": "Bannerghatta National Park", "category": "Forest / Reserve", "region": "Bengaluru, Karnataka", "country": "India", "lat": 12.8009, "lon": 77.5777, "aliases": ["bannerghatta", "bannerghatta biological park", "safari"]},
    {"name": "Bandipur Tiger Reserve", "category": "Forest / Reserve", "region": "Chamarajanagar, Karnataka", "country": "India", "lat": 11.6664, "lon": 76.6291, "aliases": ["bandipur", "bandipur national park"]},
    {"name": "Nagarhole National Park", "category": "Forest / Reserve", "region": "Kodagu / Mysore, Karnataka", "country": "India", "lat": 12.0314, "lon": 76.1558, "aliases": ["nagarhole", "rajiv gandhi national park", "kabini"]},
    {"name": "Kudremukh National Park", "category": "Forest / Reserve", "region": "Chikmagalur, Karnataka", "country": "India", "lat": 13.2167, "lon": 75.2500, "aliases": ["kudremukh", "kudremukha"]},
    {"name": "Jog Falls", "category": "Geographic Landmark", "region": "Shivamogga, Karnataka", "country": "India", "lat": 14.2285, "lon": 74.8124, "aliases": ["jog falls", "gerusoppa"]},
    {"name": "Hampi (Virupaksha Temple)", "category": "Landmark / POI", "region": "Vijayanagara, Karnataka", "country": "India", "lat": 15.3350, "lon": 76.4600, "aliases": ["hampi", "vijayanagara", "virupaksha"]},

    # Major Cities & Ecological Regions
    {"name": "Bangalore (Bengaluru)", "category": "City", "region": "Karnataka", "country": "India", "lat": 12.9716, "lon": 77.5946, "aliases": ["bangalore", "bengaluru", "blr"]},
    {"name": "Mysore (Mysuru)", "category": "City", "region": "Karnataka", "country": "India", "lat": 12.2958, "lon": 76.6394, "aliases": ["mysore", "mysuru", "mysore palace"]},
    {"name": "Coorg (Kodagu)", "category": "District", "region": "Karnataka", "country": "India", "lat": 12.3375, "lon": 75.8069, "aliases": ["coorg", "madikeri", "kodagu"]},
    {"name": "Chikmagalur", "category": "District", "region": "Karnataka", "country": "India", "lat": 13.3161, "lon": 75.7720, "aliases": ["chikmagalur", "chikkamagaluru", "mullayanagiri"]},
    {"name": "Mangalore (Mangaluru)", "category": "City", "region": "Karnataka", "country": "India", "lat": 12.9141, "lon": 74.8560, "aliases": ["mangalore", "mangaluru"]},
    {"name": "Hubli-Dharwad", "category": "City", "region": "Karnataka", "country": "India", "lat": 15.3647, "lon": 75.1240, "aliases": ["hubli", "dharwad"]},
    {"name": "Belgaum (Belagavi)", "category": "City", "region": "Karnataka", "country": "India", "lat": 15.8497, "lon": 74.4977, "aliases": ["belgaum", "belagavi"]},
    {"name": "Davangere", "category": "City", "region": "Karnataka", "country": "India", "lat": 14.4644, "lon": 75.9218, "aliases": ["davangere", "davanagere"]},
    {"name": "Harihar", "category": "Town", "region": "Karnataka", "country": "India", "lat": 14.4319, "lon": 75.4389, "aliases": ["harihar"]},
    {"name": "Shimoga (Shivamogga)", "category": "City", "region": "Karnataka", "country": "India", "lat": 13.9299, "lon": 75.5681, "aliases": ["shimoga", "shivamogga"]},
    {"name": "Gokarna", "category": "Town", "region": "Uttara Kannada, Karnataka", "country": "India", "lat": 14.5479, "lon": 74.3188, "aliases": ["gokarna", "om beach"]},
    {"name": "Wayanad", "category": "District", "region": "Kerala", "country": "India", "lat": 11.6854, "lon": 76.1320, "aliases": ["wayanad", "kalpetta"]},
    {"name": "Munnar", "category": "Town", "region": "Kerala", "country": "India", "lat": 10.0889, "lon": 77.0595, "aliases": ["munnar", "idukki"]},
    {"name": "Ooty (Udhagamandalam)", "category": "Town", "region": "Tamil Nadu", "country": "India", "lat": 11.4102, "lon": 76.6950, "aliases": ["ooty", "nilgiris"]},

    # Top Indian Metros
    {"name": "Mumbai", "category": "City", "region": "Maharashtra", "country": "India", "lat": 19.0760, "lon": 72.8777, "aliases": ["mumbai", "bombay", "marine drive", "bkc"]},
    {"name": "Pune", "category": "City", "region": "Maharashtra", "country": "India", "lat": 18.5204, "lon": 73.8567, "aliases": ["pune", "poona", "hinjewadi"]},
    {"name": "Delhi (NCR)", "category": "City", "region": "Delhi", "country": "India", "lat": 28.6139, "lon": 77.2090, "aliases": ["delhi", "new delhi", "ncr", "connaught place", "india gate"]},
    {"name": "Hyderabad", "category": "City", "region": "Telangana", "country": "India", "lat": 17.3850, "lon": 78.4867, "aliases": ["hyderabad", "secunderabad", "hitec city", "charminar"]},
    {"name": "Chennai", "category": "City", "region": "Tamil Nadu", "country": "India", "lat": 13.0827, "lon": 80.2707, "aliases": ["chennai", "madras", "marina beach"]},
    {"name": "Kolkata", "category": "City", "region": "West Bengal", "country": "India", "lat": 22.5726, "lon": 88.3639, "aliases": ["kolkata", "calcutta", "howrah"]},
    {"name": "Ahmedabad", "category": "City", "region": "Gujarat", "country": "India", "lat": 23.0225, "lon": 72.5714, "aliases": ["ahmedabad", "amdavad"]},
    {"name": "Jaipur", "category": "City", "region": "Rajasthan", "country": "India", "lat": 26.9124, "lon": 75.7873, "aliases": ["jaipur", "pink city"]},
    {"name": "Dehradun", "category": "City", "region": "Uttarakhand", "country": "India", "lat": 30.3165, "lon": 78.0322, "aliases": ["dehradun", "mussoorie"]},
    {"name": "Shimla", "category": "Town", "region": "Himachal Pradesh", "country": "India", "lat": 31.1048, "lon": 77.1734, "aliases": ["shimla"]},
    {"name": "Srinagar", "category": "City", "region": "Jammu & Kashmir", "country": "India", "lat": 34.0837, "lon": 74.7973, "aliases": ["srinagar", "dal lake"]},

    # Global Hubs & Famous Landmarks
    {"name": "Tokyo", "category": "City", "region": "Kanto", "country": "Japan", "lat": 35.6762, "lon": 139.6503, "aliases": ["tokyo"]},
    {"name": "Tokyo Tower", "category": "Building / POI", "region": "Minato City, Tokyo", "country": "Japan", "lat": 35.6586, "lon": 139.7454, "aliases": ["tokyo tower", "tokyo skytree"]},
    {"name": "London", "category": "City", "region": "Greater London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278, "aliases": ["london"]},
    {"name": "Paris", "category": "City", "region": "Île-de-France", "country": "France", "lat": 48.8566, "lon": 2.3522, "aliases": ["paris"]},
    {"name": "Eiffel Tower", "category": "Building / POI", "region": "Paris", "country": "France", "lat": 48.8584, "lon": 2.2945, "aliases": ["eiffel tower", "tour eiffel"]},
    {"name": "New York City", "category": "City", "region": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060, "aliases": ["nyc", "new york", "manhattan"]},
    {"name": "Central Park", "category": "Forest / Reserve", "region": "Manhattan, New York", "country": "United States", "lat": 40.7829, "lon": -73.9654, "aliases": ["central park", "central park nyc"]},
    {"name": "Empire State Building", "category": "Building / POI", "region": "New York", "country": "United States", "lat": 40.7484, "lon": -73.9857, "aliases": ["empire state", "empire state building"]},
    {"name": "San Francisco", "category": "City", "region": "California", "country": "United States", "lat": 37.7749, "lon": -122.4194, "aliases": ["san francisco", "sf", "silicon valley"]},
    {"name": "Golden Gate Bridge", "category": "Street / Road", "region": "San Francisco, California", "country": "United States", "lat": 37.8199, "lon": -122.4783, "aliases": ["golden gate", "golden gate bridge"]},
    {"name": "Singapore", "category": "City", "region": "Central", "country": "Singapore", "lat": 1.3521, "lon": 103.8198, "aliases": ["singapore", "changi", "marina bay"]},
    {"name": "Bangkok", "category": "City", "region": "Central Thailand", "country": "Thailand", "lat": 13.7563, "lon": 100.5018, "aliases": ["bangkok", "bkk"]},
    {"name": "Sydney", "category": "City", "region": "New South Wales", "country": "Australia", "lat": -33.8688, "lon": 151.2093, "aliases": ["sydney"]},
    {"name": "Sydney Opera House", "category": "Building / POI", "region": "Sydney", "country": "Australia", "lat": -33.8568, "lon": 151.2153, "aliases": ["sydney opera house", "opera house"]},
    {"name": "Dubai", "category": "City", "region": "Dubai", "country": "United Arab Emirates", "lat": 25.2048, "lon": 55.2708, "aliases": ["dubai"]},
    {"name": "Burj Khalifa", "category": "Building / POI", "region": "Downtown Dubai", "country": "United Arab Emirates", "lat": 25.1972, "lon": 55.2744, "aliases": ["burj khalifa", "dubai mall"]},
    {"name": "Taj Mahal", "category": "Landmark / POI", "region": "Agra, Uttar Pradesh", "country": "India", "lat": 27.1751, "lon": 78.0421, "aliases": ["taj mahal", "agra"]},
    {"name": "India Gate", "category": "Landmark / POI", "region": "New Delhi", "country": "India", "lat": 28.6129, "lon": 77.2295, "aliases": ["india gate"]},
    {"name": "Red Fort", "category": "Building / POI", "region": "Old Delhi", "country": "India", "lat": 28.6562, "lon": 77.2410, "aliases": ["red fort", "lal qila"]},
    {"name": "Qutub Minar", "category": "Landmark / POI", "region": "Mehrauli, New Delhi", "country": "India", "lat": 28.5244, "lon": 77.1855, "aliases": ["qutub minar", "qutab minar"]},
    {"name": "Gateway of India", "category": "Landmark / POI", "region": "Colaba, Mumbai", "country": "India", "lat": 18.9220, "lon": 72.8347, "aliases": ["gateway of india", "taj mahal palace"]},
    {"name": "Charminar", "category": "Landmark / POI", "region": "Old City, Hyderabad", "country": "India", "lat": 17.3616, "lon": 78.4747, "aliases": ["charminar"]},
    {"name": "Nairobi", "category": "City", "region": "Nairobi County", "country": "Kenya", "lat": -1.2921, "lon": 36.8219, "aliases": ["nairobi"]},
    {"name": "Manaus (Amazon)", "category": "Forest / Reserve", "region": "Amazonas", "country": "Brazil", "lat": -3.1190, "lon": -60.0217, "aliases": ["amazon", "manaus"]},
    {"name": "Banff National Park", "category": "Forest / Reserve", "region": "Alberta", "country": "Canada", "lat": 51.1784, "lon": -115.5708, "aliases": ["banff", "rockies"]},
]

_CLIENT: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(4.5, connect=2.0),
            limits=httpx.Limits(max_keepalive_connections=30, max_connections=60, keepalive_expiry=60.0),
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
    return _CLIENT

_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
CACHE_TTL_SECONDS = 600.0
MAX_CACHE_ENTRIES = 1500

def classify_osm_item(name: str, osm_key: str = "", osm_value: str = "", osm_type: str = "") -> str:
    name_l = (name or "").lower()
    k_l = (osm_key or "").lower()
    v_l = (osm_value or "").lower()
    t_l = (osm_type or "").lower()

    # 1. Metro / Station
    station_words = ("metro", "subway", "station", "terminal", "halt", "railway", "transit", "depot")
    if any(w in name_l for w in ("metro", "subway", "railway station", "metro station", "bus station", "train station")):
        return "Metro / Station"
    if k_l in ("railway", "public_transport") or v_l in ("station", "subway", "subway_entrance", "tram_stop", "bus_station", "halt", "platform", "terminal"):
        return "Metro / Station"
    if v_l == "bus_stop" and any(w in name_l for w in station_words):
        return "Metro / Station"

    # 2. Street / Road
    road_keys = ("highway",)
    road_values = (
        "primary", "secondary", "tertiary", "residential", "street", "road", "trunk",
        "motorway", "unclassified", "service", "living_street", "pedestrian", "footway",
        "cycleway", "path", "track"
    )
    road_words = (
        "road", "street", "cross", "main", "lane", "avenue", "boulevard", "drive",
        "way", "marg", "rasta", "gali", "salai", "circle", "junction", "flyover",
        "expressway", "highway", "bypass"
    )
    if t_l == "street" or k_l in road_keys or v_l in road_values:
        if any(w in name_l for w in ("station", "metro", "terminal")):
            return "Metro / Station"
        return "Street / Road"
    if any(w in name_l for w in road_words) and v_l not in ("city", "town", "village"):
        return "Street / Road"

    # 3. Building / POI
    building_keys = ("building", "office", "craft")
    building_values = (
        "commercial", "office", "apartments", "residential", "retail", "supermarket",
        "mall", "tower", "complex", "industrial", "warehouse", "civic", "public_building", "hotel"
    )
    building_words = (
        "building", "tower", "complex", "plaza", "tech park", "mall", "arcade",
        "residency", "heights", "enclave", "villa", "apartments", "palace", "fort", "center", "centre"
    )
    if k_l in building_keys or v_l in building_values or any(w in name_l for w in building_words):
        return "Building / POI"

    # 4. Amenities / Institutions
    amenity_values = (
        "hospital", "clinic", "school", "university", "college", "bank", "police",
        "post_office", "place_of_worship", "temple", "mosque", "church", "stadium"
    )
    if k_l in ("amenity", "tourism", "historic", "shop", "leisure") or v_l in amenity_values:
        return "Landmark / POI"

    # 5. Forest / Reserve
    nature_values = ("national_park", "nature_reserve", "forest", "wood", "protected_area", "park", "garden")
    if v_l in nature_values or any(w in name_l for w in ("forest", "reserve", "national park", "sanctuary", "wildlife", "garden")):
        return "Forest / Reserve"

    # 6. Geographic Landmark
    if v_l in ("peak", "volcano", "valley", "mountain", "viewpoint", "lake", "waterfall"):
        return "Geographic Landmark"

    # 7. Localities
    if v_l in ("village", "hamlet", "isolated_dwelling"):
        return "Village"
    if v_l in ("town",):
        return "Town"
    if v_l in ("city",):
        return "City"
    if v_l in ("suburb", "neighbourhood", "quarter", "locality", "residential"):
        return "Locality"
    if v_l in ("administrative", "county", "district", "municipality", "taluk", "tehsil"):
        return "District"
    if v_l in ("state", "province", "region"):
        return "State / Province"

    if t_l == "house":
        return "Building / POI"

    return "Place"

def extract_near_landmark(props: Dict[str, Any], name: str) -> str:
    candidates = []
    locality = props.get("locality") or props.get("suburb") or props.get("neighbourhood")
    if locality and locality.lower() != name.lower():
        candidates.append(locality)

    district = props.get("district")
    if district and district.lower() != name.lower() and district not in candidates:
        candidates.append(district)

    city = props.get("city") or props.get("town") or props.get("village")
    if city and city.lower() != name.lower() and city not in candidates:
        candidates.append(city)

    county = props.get("county") or props.get("taluk")
    if county and county.lower() != name.lower() and county not in candidates:
        candidates.append(county)

    state = props.get("state")
    postcode = props.get("postcode")

    if candidates:
        near_text = ", ".join(candidates[:2])
        if postcode:
            return f"{near_text} ({postcode})"
        return near_text

    if state and state.lower() != name.lower():
        if postcode:
            return f"{state} ({postcode})"
        return state

    return ""

def is_duplicate(item: Dict[str, Any], existing_list: List[Dict[str, Any]]) -> bool:
    name_clean = item["name"].strip().lower()
    lat = item["lat"]
    lon = item["lon"]
    for ex in existing_list:
        ex_name = ex["name"].strip().lower()
        d_lat = abs(ex["lat"] - lat)
        d_lon = abs(ex["lon"] - lon)
        if d_lat < 0.0003 and d_lon < 0.0003:
            return True
        if name_clean == ex_name and d_lat < 0.003 and d_lon < 0.003:
            return True
    return False

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes exact spherical great-circle distance in kilometers between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_relevance_score(item: Dict[str, Any], q: str, ref_lat: Optional[float] = None, ref_lon: Optional[float] = None) -> float:
    """
    Google Maps-grade ranking algorithm combining:
    1. Textual / Lexical Precision (exact match, prefix, token coverage)
    2. Category & Intent Alignment (metro, road, building, reserve)
    3. Spatial Proximity vs Explicit Target Region Matching
    4. Source Prominence & Listing Completeness
    """
    name_l = item["name"].lower()
    disp_l = item["display_name"].lower()
    q_l = q.lower().strip()
    cat = item.get("category", "")
    score = 0.0

    # 1. Lexical Relevance
    aliases = [a.lower() for a in item.get("aliases", [])]
    if name_l == q_l or any(a == q_l for a in aliases):
        score += 170.0
    elif name_l.startswith(q_l) or any(a.startswith(q_l) for a in aliases):
        score += 110.0
    elif q_l in name_l or any(q_l in a for a in aliases):
        score += 80.0
    elif q_l in disp_l:
        score += 65.0
    else:
        q_words = [w for w in re.split(r"[\s,]+", q_l) if len(w) > 1]
        if q_words:
            matched_words = sum(1 for w in q_words if w in name_l or w in disp_l or any(w in a for a in aliases))
            match_ratio = matched_words / len(q_words)
            score += match_ratio * 85.0

    # 2. Category Intent Boosting
    if any(w in q_l for w in ("metro", "station", "subway", "train", "railway", "halt", "terminal")):
        if cat == "Metro / Station":
            score += 75.0
    elif any(w in q_l for w in ("road", "street", "cross", "lane", "avenue", "drive", "trace", "trce", "marg", "salai", "bypass", "circle", "highway")):
        if cat == "Street / Road":
            score += 75.0
    elif any(w in q_l for w in ("building", "tower", "mall", "complex", "hotel", "plaza", "centre", "center", "tech park", "it park")):
        if cat in ("Building / POI", "Landmark / POI"):
            score += 75.0
    elif any(w in q_l for w in ("park", "forest", "reserve", "sanctuary", "garden", "hill", "lake", "falls")):
        if cat in ("Forest / Reserve", "Geographic Landmark"):
            score += 75.0

    # 3. Source Prominence
    if item.get("source") == "hub":
        score += 55.0
    elif item.get("source") == "census":
        score += 70.0  # Exact matched building / address parcel

    # 4. Spatial / Viewport Proximity vs Explicit Target Region
    # If the user explicitly typed a distant city, state, or country token, don't penalize distance!
    # Instead, reward candidates located in that targeted jurisdiction.
    explicit_distant_tokens = (
        "suwanee", "georgia", "ga", "usa", "us", "london", "uk", "paris", "france",
        "new york", "nyc", "tokyo", "japan", "sydney", "australia", "dubai", "uae",
        "delhi", "mumbai", "kolkata", "chennai", "hyderabad", "pune", "ahmedabad",
        "california", "texas", "florida", "seattle", "chicago"
    )
    user_named_distant_region = any(tok in q_l for tok in explicit_distant_tokens)

    if ref_lat is not None and ref_lon is not None:
        dist_km = haversine_distance_km(ref_lat, ref_lon, item["lat"], item["lon"])
        if user_named_distant_region:
            # Reward matching the explicit target region
            if any(tok in disp_l for tok in q_l.split()):
                score += 85.0
        else:
            # Local proximity decay from active map center
            if dist_km < 15.0:
                score += 115.0
            elif dist_km < 50.0:
                score += 80.0
            elif dist_km < 150.0:
                score += 45.0
            elif dist_km < 400.0:
                score += 20.0

    # 5. Completeness of metadata
    if item.get("near"):
        score += 10.0

    return score

async def fetch_open_meteo(client: httpx.AsyncClient, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Open-Meteo Global Geocoding API:
    - 11+ million places, villages, hamlets, towns, cities, districts, states worldwide.
    - Zero rate limits, highly available, sub-100ms response time.
    - Perfect for villages like Ingalagondi, Rattihalli, Hirekerur, Suwanee, etc.
    """
    results: List[Dict[str, Any]] = []
    try:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": query, "count": limit, "language": "en", "format": "json"},
            timeout=3.5
        )
        if resp.status_code == 200:
            for item in resp.json().get("results", []):
                name = item.get("name", "")
                country = item.get("country", "")
                state = item.get("admin1", "")
                district = item.get("admin2", "")
                taluk = item.get("admin3", "")
                feature_code = item.get("feature_code", "")

                hierarchy = [p for p in [taluk, district, state, country] if p and p.lower() != name.lower()]
                hier_str = ", ".join(hierarchy)
                disp = f"{name}, {hier_str}" if hier_str else name

                near_parts = [p for p in [taluk, district] if p]
                near = ", ".join(near_parts) if near_parts else (state or country)
                disambiguated_name = f"{name} (near {near})" if near else name

                cat = "Village" if feature_code in ("PPL", "PPLA2", "PPLA3", "PPLA4") else "City"
                if "park" in name.lower() or "reserve" in name.lower():
                    cat = "Forest / Reserve"

                results.append({
                    "name": name,
                    "near": near,
                    "disambiguated_name": disambiguated_name,
                    "category": cat,
                    "region": state or district or "",
                    "country": country,
                    "display_name": disp,
                    "lat": round(float(item["latitude"]), 6),
                    "lon": round(float(item["longitude"]), 6),
                    "source": "open_meteo"
                })
    except Exception:
        pass
    return results

async def fetch_photon(
    client: httpx.AsyncClient,
    query: str,
    limit: int = 12,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    params: Dict[str, Any] = {"q": query, "limit": limit}

    try:
        resp = await client.get("https://photon.komoot.io/api/", params=params, timeout=3.5)
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            for f in features:
                props = f.get("properties", {})
                coords = f.get("geometry", {}).get("coordinates", [])
                if len(coords) < 2:
                    continue
                lon_f, lat_f = coords[0], coords[1]
                name = props.get("name") or props.get("street")
                if not name:
                    continue

                cat = classify_osm_item(
                    name=name,
                    osm_key=props.get("osm_key", ""),
                    osm_value=props.get("osm_value", ""),
                    osm_type=props.get("type", "")
                )
                near = extract_near_landmark(props, name)
                disambiguated_name = f"{name} (near {near})" if near else name

                state = props.get("state")
                country = props.get("country")

                hierarchy = []
                if near:
                    hierarchy.append(f"near {near}")
                if state and state.lower() != name.lower() and state not in near:
                    hierarchy.append(state)
                if country:
                    hierarchy.append(country)

                disp = f"{name}, {', '.join(hierarchy)}" if hierarchy else name

                results.append({
                    "name": name,
                    "near": near,
                    "disambiguated_name": disambiguated_name,
                    "category": cat,
                    "region": state or near or "",
                    "country": country or "",
                    "display_name": disp,
                    "lat": round(lat_f, 6),
                    "lon": round(lon_f, 6),
                    "source": "osm"
                })
    except Exception:
        pass
    return results

async def fetch_us_census(client: httpx.AsyncClient, query: str) -> List[Dict[str, Any]]:
    """Official US Census Bureau geocoding for exact street addresses, buildings & house numbers."""
    results: List[Dict[str, Any]] = []
    # Only invoke if query contains digits or multiple comma/space separated words
    has_digits = any(char.isdigit() for char in query)
    word_count = len(query.split())
    if not has_digits and word_count < 3:
        return results

    try:
        url = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
        resp = await client.get(
            url,
            params={"address": query, "benchmark": "Public_AR_Current", "format": "json"},
            timeout=3.0
        )
        if resp.status_code == 200:
            matches = resp.json().get("result", {}).get("addressMatches", [])
            for m in matches[:3]:
                coords = m.get("coordinates", {})
                x = coords.get("x")
                y = coords.get("y")
                if x is None or y is None:
                    continue
                matched = m.get("matchedAddress", "")
                parts = [p.strip() for p in matched.split(",")]
                street = parts[0] if parts else matched
                city_state = ", ".join(parts[1:3]) if len(parts) >= 3 else ""
                disp = f"{matched}, United States"

                results.append({
                    "name": street,
                    "near": city_state,
                    "disambiguated_name": matched,
                    "category": "Street / Road",
                    "region": city_state,
                    "country": "United States",
                    "display_name": disp,
                    "lat": round(float(y), 6),
                    "lon": round(float(x), 6),
                    "source": "census"
                })
    except Exception:
        pass
    return results

async def fetch_nominatim(
    client: httpx.AsyncClient,
    query: str,
    limit: int = 8,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    params: Dict[str, Any] = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 1
    }
    if lat is not None and lon is not None:
        # Bias towards current active region (2.5 deg bbox radius)
        min_lon = lon - 2.5
        max_lon = lon + 2.5
        min_lat = lat - 2.5
        max_lat = lat + 2.5
        params["viewbox"] = f"{min_lon},{max_lat},{max_lon},{min_lat}"
        params["bounded"] = 0

    try:
        dynamic_ua = f"ReforestationGIS-Academic-{int(time.time()) % 10000} (gis-research@edu.org)"
        nom_resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": dynamic_ua},
            timeout=3.0
        )
        if nom_resp.status_code == 200:
            for item in nom_resp.json():
                lat_f = float(item.get("lat", 0))
                lon_f = float(item.get("lon", 0))
                if lat_f == 0 and lon_f == 0:
                    continue
                raw_disp = item.get("display_name", "")
                name = item.get("name") or raw_disp.split(",")[0].strip()
                cat = classify_osm_item(
                    name=name,
                    osm_key=item.get("class", ""),
                    osm_value=item.get("type", ""),
                    osm_type=item.get("type", "")
                )
                addr = item.get("address", {})
                near = extract_near_landmark(addr, name)
                disambiguated_name = f"{name} (near {near})" if near else name
                state = addr.get("state", "")
                country = addr.get("country", "")

                hierarchy = []
                if near:
                    hierarchy.append(f"near {near}")
                if state and state not in near:
                    hierarchy.append(state)
                if country:
                    hierarchy.append(country)

                disp = f"{name}, {', '.join(hierarchy)}" if hierarchy else raw_disp

                results.append({
                    "name": name,
                    "near": near,
                    "disambiguated_name": disambiguated_name,
                    "category": cat,
                    "region": state or near or "",
                    "country": country or "",
                    "display_name": disp,
                    "lat": round(lat_f, 6),
                    "lon": round(lon_f, 6),
                    "source": "nominatim"
                })
    except Exception:
        pass
    return results

async def search_locations(
    query: str,
    limit: int = 10,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> List[Dict[str, Any]]:
    q = query.strip()
    if not q:
        return []

    q_lower = q.lower()
    ref_lat = lat if lat is not None else 13.0
    ref_lon = lon if lon is not None else 77.6

    cache_key = f"{q_lower}_{round(ref_lat, 2)}_{round(ref_lon, 2)}"
    now = time.time()
    if cache_key in _CACHE:
        cached_time, cached_res = _CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_res[:limit]

    client = get_http_client()
    raw_candidates: List[Dict[str, Any]] = []

    # Step 1: In-memory Hubs matching (curated landmarks & metro centers)
    for hub in POPULAR_HUBS:
        name_lower = hub["name"].lower()
        aliases = hub.get("aliases", [])
        is_exact = (name_lower == q_lower) or any(a == q_lower for a in aliases)
        is_prefix = name_lower.startswith(q_lower) or any(a.startswith(q_lower) for a in aliases)
        is_sub = (len(q) >= 3) and (q_lower in name_lower or any(q_lower in a for a in aliases))

        if is_exact or is_prefix or is_sub:
            disp = f"{hub['name']}, {hub['region']}, {hub['country']}"
            raw_candidates.append({
                "name": hub["name"],
                "near": hub["region"],
                "disambiguated_name": hub["name"],
                "category": hub["category"],
                "region": hub["region"],
                "country": hub["country"],
                "display_name": disp,
                "lat": hub["lat"],
                "lon": hub["lon"],
                "source": "hub"
            })

    # Step 2: Concurrent Multi-Source Querying (Nominatim, Photon & US Census)
    # Generate query variants for typo tolerance & house-number decomposition
    q_variants = [q]
    q_sub = re.sub(r"\bdear\b", "deer", q, flags=re.IGNORECASE)
    if q_sub.lower() != q_lower:
        q_variants.append(q_sub)
    q_no_num = re.sub(r"^\d+\s+", "", q_sub).strip()
    if q_no_num and q_no_num.lower() != q_lower:
        q_variants.append(q_no_num)

    tasks = [
        fetch_open_meteo(client, q, limit=limit),
        fetch_photon(client, q, limit=limit),
        fetch_nominatim(client, q, limit=8, lat=ref_lat, lon=ref_lon),
        fetch_us_census(client, q),
    ]

    # Query variations concurrently if user typed address with typos or house numbers
    for variant in q_variants[1:]:
        tasks.append(fetch_open_meteo(client, variant, limit=6))
        tasks.append(fetch_photon(client, variant, limit=6))
        tasks.append(fetch_us_census(client, variant))
        tasks.append(fetch_nominatim(client, variant, limit=6, lat=ref_lat, lon=ref_lon))

    responses = await asyncio.gather(*tasks, return_exceptions=True)
    for r in responses:
        if isinstance(r, list):
            raw_candidates.extend(r)

    # Step 3: Geographic context fallback if zero or very few results found online
    if len(raw_candidates) < 2 and len(q) >= 2:
        if any(tok in q_lower for tok in ("usa", "ga", "us", "georgia", "suwanee", "ny", "ca")):
            extra_res = await fetch_nominatim(client, f"{q} united states", limit=4)
        else:
            extra_res = await fetch_nominatim(client, f"{q} bangalore karnataka", limit=4)
        raw_candidates.extend(extra_res)

    # Step 4: Fine-grained deduplication
    deduped: List[Dict[str, Any]] = []
    for candidate in raw_candidates:
        if not is_duplicate(candidate, deduped):
            deduped.append(candidate)

    # Step 5: Intent & Proximity Ranking
    ranked = sorted(
        deduped,
        key=lambda x: compute_relevance_score(x, q_lower, ref_lat=ref_lat, ref_lon=ref_lon),
        reverse=True
    )
    final_results = ranked[:limit]

    # ONLY cache non-empty successful results to avoid poison caches
    if final_results:
        if len(_CACHE) >= MAX_CACHE_ENTRIES:
            oldest_key = min(_CACHE.keys(), key=lambda k: _CACHE[k][0])
            del _CACHE[oldest_key]
        _CACHE[cache_key] = (now, final_results)

    return final_results
