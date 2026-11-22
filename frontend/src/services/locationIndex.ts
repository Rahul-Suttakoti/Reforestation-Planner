export interface LocationSuggestion {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  aliases?: string[];
}

export const POPULAR_LOCATIONS: LocationSuggestion[] = [
  // Ban...
  { name: 'Bangalore (Bengaluru)', region: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946, aliases: ['bangalore', 'bengaluru', 'blr'] },
  { name: 'Bangkok', region: 'Central Thailand', country: 'Thailand', lat: 13.7563, lon: 100.5018, aliases: ['bangkok', 'krung thep'] },
  { name: 'Bandipur Tiger Reserve', region: 'Karnataka', country: 'India', lat: 11.6664, lon: 76.6291, aliases: ['bandipur', 'chamarajanagar'] },
  { name: 'Bandhavgarh National Park', region: 'Madhya Pradesh', country: 'India', lat: 23.7226, lon: 81.0244, aliases: ['bandhavgarh', 'umaria'] },
  { name: 'Banswara', region: 'Rajasthan', country: 'India', lat: 23.5461, lon: 74.4349, aliases: ['banswara'] },
  { name: 'Banda', region: 'Uttar Pradesh', country: 'India', lat: 25.4754, lon: 80.3347, aliases: ['banda'] },
  { name: 'Banff National Park', region: 'Alberta', country: 'Canada', lat: 51.4968, lon: -115.9281, aliases: ['banff', 'rockies'] },
  { name: 'Bandung', region: 'West Java', country: 'Indonesia', lat: -6.9175, lon: 107.6191, aliases: ['bandung'] },
  { name: 'Banjarmasin', region: 'South Kalimantan', country: 'Indonesia', lat: -3.3167, lon: 114.5901, aliases: ['banjarmasin', 'borneo'] },
  { name: 'Banten', region: 'Java', country: 'Indonesia', lat: -6.4058, lon: 106.0640, aliases: ['banten'] },

  // Karnataka & South India
  { name: 'Mysore (Mysuru)', region: 'Karnataka', country: 'India', lat: 12.2958, lon: 76.6394, aliases: ['mysore', 'mysuru'] },
  { name: 'Coorg (Kodagu)', region: 'Karnataka', country: 'India', lat: 12.3375, lon: 75.8069, aliases: ['coorg', 'madikeri', 'kodagu'] },
  { name: 'Wayanad', region: 'Kerala', country: 'India', lat: 11.6854, lon: 76.1320, aliases: ['wayanad', 'kalpetta'] },
  { name: 'Munnar', region: 'Kerala', country: 'India', lat: 10.0889, lon: 77.0595, aliases: ['munnar', 'idukki'] },
  { name: 'Ooty (Udhagamandalam)', region: 'Tamil Nadu', country: 'India', lat: 11.4102, lon: 76.6950, aliases: ['ooty', 'nilgiris'] },
  { name: 'Nilgiris Foothills', region: 'Tamil Nadu', country: 'India', lat: 11.3912, lon: 76.8123, aliases: ['nilgiris', 'coonoor'] },
  { name: 'Harihar', region: 'Karnataka', country: 'India', lat: 14.4319, lon: 75.4389, aliases: ['harihar', 'davangere'] },
  { name: 'Mangalore (Mangaluru)', region: 'Karnataka', country: 'India', lat: 12.9141, lon: 74.8560, aliases: ['mangalore', 'mangaluru'] },
  { name: 'Hubli-Dharwad', region: 'Karnataka', country: 'India', lat: 15.3647, lon: 75.1240, aliases: ['hubli', 'dharwad'] },
  { name: 'Belgaum (Belagavi)', region: 'Karnataka', country: 'India', lat: 15.8497, lon: 74.4977, aliases: ['belgaum', 'belagavi'] },
  { name: 'Hampi', region: 'Karnataka', country: 'India', lat: 15.3350, lon: 76.4600, aliases: ['hampi', 'bellary'] },
  { name: 'Kochi (Cochin)', region: 'Kerala', country: 'India', lat: 9.9312, lon: 76.2673, aliases: ['kochi', 'cochin', 'ernakulam'] },
  { name: 'Thiruvananthapuram', region: 'Kerala', country: 'India', lat: 8.5241, lon: 76.9366, aliases: ['trivandrum', 'thiruvananthapuram'] },
  { name: 'Silent Valley National Park', region: 'Kerala', country: 'India', lat: 11.1333, lon: 76.4333, aliases: ['silent valley', 'palakkad'] },
  { name: 'Periyar Tiger Reserve', region: 'Kerala', country: 'India', lat: 9.4667, lon: 77.2333, aliases: ['periyar', 'thekkady'] },
  { name: 'Chennai', region: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707, aliases: ['chennai', 'madras'] },
  { name: 'Coimbatore', region: 'Tamil Nadu', country: 'India', lat: 11.0168, lon: 76.9558, aliases: ['coimbatore', 'kovai'] },
  { name: 'Madurai', region: 'Tamil Nadu', country: 'India', lat: 9.9252, lon: 78.1198, aliases: ['madurai'] },
  { name: 'Hyderabad', region: 'Telangana', country: 'India', lat: 17.3850, lon: 78.4867, aliases: ['hyderabad', 'secunderabad'] },
  { name: 'Warangal', region: 'Telangana', country: 'India', lat: 17.9689, lon: 79.5941, aliases: ['warangal'] },
  { name: 'Visakhapatnam', region: 'Andhra Pradesh', country: 'India', lat: 17.6868, lon: 83.2185, aliases: ['vizag', 'visakhapatnam'] },
  { name: 'Tirupati', region: 'Andhra Pradesh', country: 'India', lat: 13.6288, lon: 79.4192, aliases: ['tirupati', 'seshachalam'] },

  // Western & Central India
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777, aliases: ['mumbai', 'bombay'] },
  { name: 'Pune', region: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567, aliases: ['pune', 'poona'] },
  { name: 'Nagpur', region: 'Maharashtra', country: 'India', lat: 21.1458, lon: 79.0882, aliases: ['nagpur'] },
  { name: 'Nashik', region: 'Maharashtra', country: 'India', lat: 19.9975, lon: 73.7898, aliases: ['nashik'] },
  { name: 'Mahabaleshwar', region: 'Maharashtra', country: 'India', lat: 17.9237, lon: 73.6586, aliases: ['mahabaleshwar', 'satara'] },
  { name: 'Goa (Panaji)', region: 'Goa', country: 'India', lat: 15.4909, lon: 73.8278, aliases: ['goa', 'panaji', 'panjim'] },
  { name: 'Bhopal', region: 'Madhya Pradesh', country: 'India', lat: 23.2599, lon: 77.4126, aliases: ['bhopal'] },
  { name: 'Indore', region: 'Madhya Pradesh', country: 'India', lat: 22.7196, lon: 75.8577, aliases: ['indore'] },
  { name: 'Kanha National Park', region: 'Madhya Pradesh', country: 'India', lat: 22.3345, lon: 80.6115, aliases: ['kanha', 'mandla'] },
  { name: 'Pench National Park', region: 'Madhya Pradesh', country: 'India', lat: 21.7583, lon: 79.3134, aliases: ['pench', 'seoni'] },
  { name: 'Ahmedabad', region: 'Gujarat', country: 'India', lat: 23.0225, lon: 72.5714, aliases: ['ahmedabad', 'amdavad'] },
  { name: 'Gir National Park', region: 'Gujarat', country: 'India', lat: 21.1243, lon: 70.8242, aliases: ['gir', 'junagadh', 'sasan gir'] },
  { name: 'Rann of Kutch', region: 'Gujarat', country: 'India', lat: 23.8346, lon: 69.8396, aliases: ['kutch', 'bhuj', 'rann'] },

  // Northern & Himalayan India
  { name: 'Delhi (NCR)', region: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090, aliases: ['delhi', 'new delhi', 'ncr'] },
  { name: 'Jaipur', region: 'Rajasthan', country: 'India', lat: 26.9124, lon: 75.7873, aliases: ['jaipur', 'pink city'] },
  { name: 'Jodhpur', region: 'Rajasthan', country: 'India', lat: 26.2389, lon: 73.0243, aliases: ['jodhpur', 'blue city'] },
  { name: 'Udaipur', region: 'Rajasthan', country: 'India', lat: 24.5854, lon: 73.7125, aliases: ['udaipur', 'mewar'] },
  { name: 'Jaisalmer', region: 'Rajasthan', country: 'India', lat: 26.9157, lon: 70.9083, aliases: ['jaisalmer', 'thar desert'] },
  { name: 'Ranthambore National Park', region: 'Rajasthan', country: 'India', lat: 26.0173, lon: 76.5026, aliases: ['ranthambore', 'sawai madhopur'] },
  { name: 'Dehradun', region: 'Uttarakhand', country: 'India', lat: 30.3165, lon: 78.0322, aliases: ['dehradun', 'doon valley'] },
  { name: 'Rishikesh', region: 'Uttarakhand', country: 'India', lat: 30.0869, lon: 78.2676, aliases: ['rishikesh'] },
  { name: 'Nainital', region: 'Uttarakhand', country: 'India', lat: 29.3919, lon: 79.4542, aliases: ['nainital', 'kumaon'] },
  { name: 'Jim Corbett National Park', region: 'Uttarakhand', country: 'India', lat: 29.5300, lon: 78.7747, aliases: ['corbett', 'ramnagar'] },
  { name: 'Shimla', region: 'Himachal Pradesh', country: 'India', lat: 31.1048, lon: 77.1734, aliases: ['shimla', 'simla'] },
  { name: 'Manali', region: 'Himachal Pradesh', country: 'India', lat: 32.2432, lon: 77.1892, aliases: ['manali', 'kullu'] },
  { name: 'Dharamshala', region: 'Himachal Pradesh', country: 'India', lat: 32.2190, lon: 76.3234, aliases: ['dharamshala', 'mcleodganj'] },
  { name: 'Chandigarh', region: 'Punjab / Haryana', country: 'India', lat: 30.7333, lon: 76.7794, aliases: ['chandigarh'] },
  { name: 'Srinagar', region: 'Jammu & Kashmir', country: 'India', lat: 34.0837, lon: 74.7973, aliases: ['srinagar', 'kashmir'] },
  { name: 'Leh', region: 'Ladakh', country: 'India', lat: 34.1526, lon: 77.5771, aliases: ['leh', 'ladakh'] },
  { name: 'Lucknow', region: 'Uttar Pradesh', country: 'India', lat: 26.8467, lon: 80.9462, aliases: ['lucknow'] },
  { name: 'Varanasi', region: 'Uttar Pradesh', country: 'India', lat: 25.3176, lon: 82.9739, aliases: ['varanasi', 'banaras', 'kashi'] },
  { name: 'Agra', region: 'Uttar Pradesh', country: 'India', lat: 27.1767, lon: 78.0081, aliases: ['agra'] },

  // Eastern & Northeastern India
  { name: 'Kolkata', region: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639, aliases: ['kolkata', 'calcutta'] },
  { name: 'Sundarbans National Park', region: 'West Bengal', country: 'India', lat: 21.9497, lon: 89.1833, aliases: ['sundarbans', 'mangrove'] },
  { name: 'Darjeeling', region: 'West Bengal', country: 'India', lat: 27.0410, lon: 88.2663, aliases: ['darjeeling'] },
  { name: 'Bhubaneswar', region: 'Odisha', country: 'India', lat: 20.2961, lon: 85.8245, aliases: ['bhubaneswar'] },
  { name: 'Simlipal National Park', region: 'Odisha', country: 'India', lat: 21.8667, lon: 86.4167, aliases: ['simlipal', 'mayurbhanj'] },
  { name: 'Ranchi', region: 'Jharkhand', country: 'India', lat: 23.3441, lon: 85.3096, aliases: ['ranchi', 'chota nagpur'] },
  { name: 'Patna', region: 'Bihar', country: 'India', lat: 25.5941, lon: 85.1376, aliases: ['patna'] },
  { name: 'Guwahati', region: 'Assam', country: 'India', lat: 26.1445, lon: 91.7362, aliases: ['guwahati'] },
  { name: 'Kaziranga National Park', region: 'Assam', country: 'India', lat: 26.5775, lon: 93.1711, aliases: ['kaziranga', 'golaghat'] },
  { name: 'Shillong', region: 'Meghalaya', country: 'India', lat: 25.5788, lon: 91.8933, aliases: ['shillong', 'khasi hills'] },
  { name: 'Gangtok', region: 'Sikkim', country: 'India', lat: 27.3389, lon: 88.6065, aliases: ['gangtok', 'sikkim'] },
  { name: 'Namdapha National Park', region: 'Arunachal Pradesh', country: 'India', lat: 27.4833, lon: 96.3833, aliases: ['namdapha', 'changlang'] },

  // Global Ecological & Forest Hubs
  { name: 'Amazon Rainforest (Manaus)', region: 'Amazonas', country: 'Brazil', lat: -3.1190, lon: -60.0217, aliases: ['amazon', 'manaus'] },
  { name: 'Congo Basin (Kisangani)', region: 'Tshopo', country: 'DR Congo', lat: 0.5153, lon: 25.1909, aliases: ['congo', 'kisangani'] },
  { name: 'Borneo Rainforest (Sabah)', region: 'Sabah', country: 'Malaysia', lat: 5.4204, lon: 116.7968, aliases: ['borneo', 'sabah'] },
  { name: 'Black Forest (Schwarzwald)', region: 'Baden-Württemberg', country: 'Germany', lat: 48.3000, lon: 8.2000, aliases: ['black forest', 'schwarzwald'] },
  { name: 'Tokyo', region: 'Kanto', country: 'Japan', lat: 35.6762, lon: 139.6503, aliases: ['tokyo'] },
  { name: 'London', region: 'Greater London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, aliases: ['london'] },
  { name: 'San Francisco', region: 'California', country: 'United States', lat: 37.7749, lon: -122.4194, aliases: ['san francisco', 'sf', 'bay area'] },
  { name: 'Sydney', region: 'New South Wales', country: 'Australia', lat: -33.8688, lon: 151.2093, aliases: ['sydney'] },
  { name: 'Nairobi', region: 'Nairobi County', country: 'Kenya', lat: -1.2921, lon: 36.8219, aliases: ['nairobi'] },
  { name: 'Singapore', region: 'Central Region', country: 'Singapore', lat: 1.3521, lon: 103.8198, aliases: ['singapore'] },
];

export function getLocalRecommendations(prefix: string, maxResults = 6): LocationSuggestion[] {
  const q = prefix.trim().toLowerCase();
  if (!q) return [];

  const matches: { item: LocationSuggestion; score: number }[] = [];

  for (const loc of POPULAR_LOCATIONS) {
    const nameLower = loc.name.toLowerCase();
    const regionLower = loc.region.toLowerCase();
    const countryLower = loc.country.toLowerCase();

    // Exact prefix match on name (e.g. "ban" -> "Bangalore", "Bangkok")
    if (nameLower.startsWith(q)) {
      matches.push({ item: loc, score: 100 - nameLower.indexOf(q) });
    } else if (loc.aliases && loc.aliases.some((a) => a.startsWith(q))) {
      matches.push({ item: loc, score: 90 });
    } else if (nameLower.includes(q)) {
      matches.push({ item: loc, score: 70 });
    } else if (regionLower.startsWith(q)) {
      matches.push({ item: loc, score: 60 });
    } else if (countryLower.startsWith(q)) {
      matches.push({ item: loc, score: 50 });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxResults).map((m) => m.item);
}
