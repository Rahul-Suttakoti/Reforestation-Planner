import math
from typing import Tuple, List
from backend.app.schemas import GeoBoundingBox, SitePreset, EnvironmentConditions

METERS_PER_DEGREE_LAT = 111132.95

def bbox_to_dimensions_m(bbox: GeoBoundingBox) -> Tuple[float, float]:
    """
    Computes (width_m, height_m) from a bounding box.
    height corresponds to latitude delta, width corresponds to longitude delta.
    """
    lat_mid = (bbox.lat_min + bbox.lat_max) / 2.0
    lat_rad = math.radians(lat_mid)

    height_m = abs(bbox.lat_max - bbox.lat_min) * METERS_PER_DEGREE_LAT
    meters_per_degree_lon = METERS_PER_DEGREE_LAT * math.cos(lat_rad)
    width_m = abs(bbox.lon_max - bbox.lon_min) * meters_per_degree_lon

    return round(max(20.0, width_m), 1), round(max(20.0, height_m), 1)

def center_and_dimensions_to_bbox(
    center_lat: float,
    center_lon: float,
    width_m: float = 100.0,
    height_m: float = 100.0
) -> GeoBoundingBox:
    """Converts a center (lat, lon) and metric plot dimensions into a GeoBoundingBox."""
    lat_rad = math.radians(center_lat)
    delta_lat = (height_m / 2.0) / METERS_PER_DEGREE_LAT
    meters_per_degree_lon = max(1.0, METERS_PER_DEGREE_LAT * math.cos(lat_rad))
    delta_lon = (width_m / 2.0) / meters_per_degree_lon

    return GeoBoundingBox(
        lat_min=round(center_lat - delta_lat, 6),
        lon_min=round(center_lon - delta_lon, 6),
        lat_max=round(center_lat + delta_lat, 6),
        lon_max=round(center_lon + delta_lon, 6),
    )

def metric_to_latlon(
    x_m: float,
    y_m: float,
    bbox: GeoBoundingBox,
    total_width_m: float,
    total_height_m: float
) -> Tuple[float, float]:
    """
    Converts a metric offset (x, y) within a plot to geographic (lat, lon).
    Origin (0, 0) is at (bbox.lat_min, bbox.lon_min).
    """
    if total_height_m <= 0 or total_width_m <= 0:
        return bbox.lat_min, bbox.lon_min

    lat = bbox.lat_min + (y_m / total_height_m) * (bbox.lat_max - bbox.lat_min)
    lon = bbox.lon_min + (x_m / total_width_m) * (bbox.lon_max - bbox.lon_min)
    return round(lat, 6), round(lon, 6)

def get_site_presets() -> List[SitePreset]:
    """Returns curated presets for testing across various soil and climate regions."""
    return [
        SitePreset(
            id="harihar-karnataka",
            name="Harihar Degraded Farmland",
            region="Karnataka (Deccan Plateau)",
            description="Semi-arid Deccan farmland with neutral clay-loam soil. Suited for drought-hardy legumes, Neem, and Shisham.",
            bounding_box=GeoBoundingBox(
                lat_min=14.428519,
                lon_min=75.434234,
                lat_max=14.435408,
                lon_max=75.443679,
            ),
            center=[14.43196, 75.43896],
            environment=EnvironmentConditions(
                soil_ph=7.1,
                annual_rainfall_mm=1365.0,
                sunlight_hours=6.2,
                avg_temperature_c=24.9,
                elevation_m=586.0,
                soil_organic_carbon_dg_kg=205.0
            ),
            recommended_species=["Azadirachta indica", "Pongamia pinnata", "Dalbergia sissoo"]
        ),
        SitePreset(
            id="nilgiris-foothills",
            name="Nilgiris Foothills Buffer",
            region="Tamil Nadu (Western Ghats)",
            description="High-precipitation Western Ghats transitional zone with organic-rich acidic soil and dense polyculture potential.",
            bounding_box=GeoBoundingBox(
                lat_min=11.3912,
                lon_min=76.8123,
                lat_max=11.3985,
                lon_max=76.8210,
            ),
            center=[11.39485, 76.81665],
            environment=EnvironmentConditions(
                soil_ph=6.2,
                annual_rainfall_mm=1950.0,
                sunlight_hours=5.5,
                avg_temperature_c=22.4,
                elevation_m=840.0,
                soil_organic_carbon_dg_kg=310.0
            ),
            recommended_species=["Ficus benghalensis", "Syzygium cumini", "Artocarpus heterophyllus"]
        ),
        SitePreset(
            id="aravalli-rajasthan",
            name="Aravalli Semi-Arid Restoration",
            region="Rajasthan (Thar Fringe)",
            description="Rocky, alkaline arid terrain with intense solar irradiance. Heavily prioritizes drought-hardy Khejri, Palash, and Neem.",
            bounding_box=GeoBoundingBox(
                lat_min=27.1850,
                lon_min=75.8200,
                lat_max=27.1925,
                lon_max=75.8290,
            ),
            center=[27.18875, 75.8245],
            environment=EnvironmentConditions(
                soil_ph=8.2,
                annual_rainfall_mm=520.0,
                sunlight_hours=7.5,
                avg_temperature_c=27.8,
                elevation_m=420.0,
                soil_organic_carbon_dg_kg=95.0
            ),
            recommended_species=["Prosopis cineraria", "Azadirachta indica", "Butea monosperma"]
        ),
        SitePreset(
            id="dehradun-terai",
            name="Dehradun Terai Foothills",
            region="Uttarakhand (Sub-Himalayan)",
            description="Sub-Himalayan alluvial valley with high annual precipitation, fertile deep soil, and excellent conditions for Sal and Teak.",
            bounding_box=GeoBoundingBox(
                lat_min=30.3165,
                lon_min=78.0322,
                lat_max=30.3240,
                lon_max=78.0415,
            ),
            center=[30.32025, 78.03685],
            environment=EnvironmentConditions(
                soil_ph=6.6,
                annual_rainfall_mm=2150.0,
                sunlight_hours=6.0,
                avg_temperature_c=20.5,
                elevation_m=640.0,
                soil_organic_carbon_dg_kg=260.0
            ),
            recommended_species=["Shorea robusta", "Tectona grandis", "Terminalia arjuna"]
        ),
        SitePreset(
            id="sundarbans-fringe",
            name="Sundarbans Saline Coastal Buffer",
            region="West Bengal (Delta)",
            description="Coastal estuarine alluvial delta prone to saline intrusion and storm surges. Needs salt-tolerant Casuarina and Arjuna.",
            bounding_box=GeoBoundingBox(
                lat_min=22.1820,
                lon_min=88.7510,
                lat_max=22.1895,
                lon_max=88.7600,
            ),
            center=[22.18575, 88.7555],
            environment=EnvironmentConditions(
                soil_ph=7.6,
                annual_rainfall_mm=1820.0,
                sunlight_hours=5.8,
                avg_temperature_c=26.2,
                elevation_m=12.0,
                soil_organic_carbon_dg_kg=185.0
            ),
            recommended_species=["Casuarina equisetifolia", "Terminalia arjuna", "Pongamia pinnata"]
        ),
        SitePreset(
            id="chota-nagpur",
            name="Chota Nagpur Plateau Deciduous",
            region="Jharkhand (Central Highland)",
            description="Weathered red laterite soil over crystalline bedrock. Ideal for indigenous Mahua, Sal, and Amla restoration.",
            bounding_box=GeoBoundingBox(
                lat_min=23.3440,
                lon_min=85.3090,
                lat_max=23.3515,
                lon_max=85.3180,
            ),
            center=[23.34775, 85.3135],
            environment=EnvironmentConditions(
                soil_ph=5.8,
                annual_rainfall_mm=1380.0,
                sunlight_hours=6.4,
                avg_temperature_c=24.1,
                elevation_m=650.0,
                soil_organic_carbon_dg_kg=170.0
            ),
            recommended_species=["Madhuca longifolia", "Shorea robusta", "Phyllanthus emblica"]
        ),
        SitePreset(
            id="wayanad-evergreen",
            name="Wayanad Agroforestry Buffer",
            region="Kerala (Western Ghats Wet)",
            description="Lush tropical moist evergreen valley with high annual rainfall, deep loamy soils, and multi-tier canopy potential.",
            bounding_box=GeoBoundingBox(
                lat_min=11.6850,
                lon_min=76.1320,
                lat_max=11.6925,
                lon_max=76.1410,
            ),
            center=[11.68875, 76.1365],
            environment=EnvironmentConditions(
                soil_ph=5.6,
                annual_rainfall_mm=2600.0,
                sunlight_hours=5.2,
                avg_temperature_c=22.8,
                elevation_m=780.0,
                soil_organic_carbon_dg_kg=340.0
            ),
            recommended_species=["Artocarpus heterophyllus", "Syzygium cumini", "Bambusa bambos"]
        ),
        SitePreset(
            id="kaziranga-floodplain",
            name="Brahmaputra Floodplain Fringe",
            region="Assam (Northeast Alluvium)",
            description="Deep rich alluvium with torrential monsoon precipitation and high humidity. Excellent for fast-growing Bamboo and Siris.",
            bounding_box=GeoBoundingBox(
                lat_min=26.5770,
                lon_min=93.1710,
                lat_max=26.5845,
                lon_max=93.1800,
            ),
            center=[26.58075, 93.1755],
            environment=EnvironmentConditions(
                soil_ph=6.1,
                annual_rainfall_mm=2250.0,
                sunlight_hours=5.0,
                avg_temperature_c=23.5,
                elevation_m=75.0,
                soil_organic_carbon_dg_kg=290.0
            ),
            recommended_species=["Bambusa bambos", "Albizia lebbeck", "Syzygium cumini"]
        )
    ]
