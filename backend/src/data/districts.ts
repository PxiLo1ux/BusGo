// Nepal Districts with coordinates for route map picker

export interface District {
    name: string;
    lat: number;
    lng: number;
    province: string;
}

export const districts: District[] = [
    // Province 1
    { name: 'Bhojpur', lat: 27.1833, lng: 87.0500, province: 'Province 1' },
    { name: 'Dhankuta', lat: 26.9833, lng: 87.3500, province: 'Province 1' },
    { name: 'Ilam', lat: 26.9000, lng: 87.9333, province: 'Province 1' },
    { name: 'Jhapa', lat: 26.5500, lng: 87.8833, province: 'Province 1' },
    { name: 'Khotang', lat: 27.0333, lng: 86.8333, province: 'Province 1' },
    { name: 'Morang', lat: 26.6667, lng: 87.4500, province: 'Province 1' },
    { name: 'Okhaldhunga', lat: 27.3167, lng: 86.5000, province: 'Province 1' },
    { name: 'Panchthar', lat: 27.1333, lng: 87.7667, province: 'Province 1' },
    { name: 'Sankhuwasabha', lat: 27.3667, lng: 87.2000, province: 'Province 1' },
    { name: 'Solukhumbu', lat: 27.7833, lng: 86.6667, province: 'Province 1' },
    { name: 'Sunsari', lat: 26.6333, lng: 87.1667, province: 'Province 1' },
    { name: 'Taplejung', lat: 27.3500, lng: 87.6667, province: 'Province 1' },
    { name: 'Terhathum', lat: 27.1333, lng: 87.5500, province: 'Province 1' },
    { name: 'Udayapur', lat: 26.9333, lng: 86.5000, province: 'Province 1' },

    // Madhesh Province
    { name: 'Bara', lat: 27.0667, lng: 85.0000, province: 'Madhesh' },
    { name: 'Dhanusha', lat: 26.8667, lng: 85.9167, province: 'Madhesh' },
    { name: 'Mahottari', lat: 26.8333, lng: 85.7667, province: 'Madhesh' },
    { name: 'Parsa', lat: 27.1333, lng: 84.8833, province: 'Madhesh' },
    { name: 'Rautahat', lat: 27.0000, lng: 85.2833, province: 'Madhesh' },
    { name: 'Saptari', lat: 26.6333, lng: 86.7333, province: 'Madhesh' },
    { name: 'Sarlahi', lat: 27.0500, lng: 85.6000, province: 'Madhesh' },
    { name: 'Siraha', lat: 26.6500, lng: 86.2000, province: 'Madhesh' },

    // Bagmati Province
    { name: 'Bhaktapur', lat: 27.6710, lng: 85.4298, province: 'Bagmati' },
    { name: 'Chitwan', lat: 27.5291, lng: 84.3542, province: 'Bagmati' },
    { name: 'Dhading', lat: 27.8667, lng: 84.9333, province: 'Bagmati' },
    { name: 'Dolakha', lat: 27.7667, lng: 86.0667, province: 'Bagmati' },
    { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, province: 'Bagmati' },
    { name: 'Kavrepalanchok', lat: 27.5500, lng: 85.5500, province: 'Bagmati' },
    { name: 'Lalitpur', lat: 27.6667, lng: 85.3167, province: 'Bagmati' },
    { name: 'Makwanpur', lat: 27.4167, lng: 85.0500, province: 'Bagmati' },
    { name: 'Nuwakot', lat: 27.9500, lng: 85.1667, province: 'Bagmati' },
    { name: 'Ramechhap', lat: 27.3167, lng: 86.1000, province: 'Bagmati' },
    { name: 'Rasuwa', lat: 28.1167, lng: 85.3833, province: 'Bagmati' },
    { name: 'Sindhuli', lat: 27.2500, lng: 85.9667, province: 'Bagmati' },
    { name: 'Sindhupalchok', lat: 27.9500, lng: 85.7000, province: 'Bagmati' },

    // Gandaki Province
    { name: 'Baglung', lat: 28.2667, lng: 83.5833, province: 'Gandaki' },
    { name: 'Gorkha', lat: 28.0000, lng: 84.6333, province: 'Gandaki' },
    { name: 'Kaski', lat: 28.2096, lng: 83.9856, province: 'Gandaki' },
    { name: 'Lamjung', lat: 28.2833, lng: 84.3500, province: 'Gandaki' },
    { name: 'Manang', lat: 28.6667, lng: 84.0167, province: 'Gandaki' },
    { name: 'Mustang', lat: 29.1833, lng: 83.7667, province: 'Gandaki' },
    { name: 'Myagdi', lat: 28.5000, lng: 83.5000, province: 'Gandaki' },
    { name: 'Nawalpur', lat: 27.6500, lng: 84.1000, province: 'Gandaki' },
    { name: 'Parbat', lat: 28.2167, lng: 83.7000, province: 'Gandaki' },
    { name: 'Syangja', lat: 28.1000, lng: 83.8333, province: 'Gandaki' },
    { name: 'Tanahun', lat: 27.9333, lng: 84.4167, province: 'Gandaki' },
    { name: 'Pokhara', lat: 28.2096, lng: 83.9856, province: 'Gandaki' },

    // Lumbini Province
    { name: 'Arghakhanchi', lat: 27.9500, lng: 83.1333, province: 'Lumbini' },
    { name: 'Banke', lat: 28.0500, lng: 81.6333, province: 'Lumbini' },
    { name: 'Bardiya', lat: 28.4333, lng: 81.3333, province: 'Lumbini' },
    { name: 'Butwal', lat: 27.7000, lng: 83.4500, province: 'Lumbini' },
    { name: 'Dang', lat: 28.1167, lng: 82.3000, province: 'Lumbini' },
    { name: 'Gulmi', lat: 28.0833, lng: 83.2833, province: 'Lumbini' },
    { name: 'Kapilvastu', lat: 27.5667, lng: 83.0500, province: 'Lumbini' },
    { name: 'Nawalparasi', lat: 27.6333, lng: 83.7333, province: 'Lumbini' },
    { name: 'Palpa', lat: 27.8667, lng: 83.5333, province: 'Lumbini' },
    { name: 'Pyuthan', lat: 28.0667, lng: 82.8500, province: 'Lumbini' },
    { name: 'Rolpa', lat: 28.3333, lng: 82.6333, province: 'Lumbini' },
    { name: 'Rupandehi', lat: 27.5000, lng: 83.4167, province: 'Lumbini' },
    { name: 'Lumbini', lat: 27.4833, lng: 83.2833, province: 'Lumbini' },

    // Karnali Province
    { name: 'Dailekh', lat: 28.8500, lng: 81.7000, province: 'Karnali' },
    { name: 'Dolpa', lat: 29.0000, lng: 82.8667, province: 'Karnali' },
    { name: 'Humla', lat: 29.9667, lng: 81.8500, province: 'Karnali' },
    { name: 'Jajarkot', lat: 28.6833, lng: 82.1833, province: 'Karnali' },
    { name: 'Jumla', lat: 29.2833, lng: 82.1833, province: 'Karnali' },
    { name: 'Kalikot', lat: 29.1333, lng: 81.6167, province: 'Karnali' },
    { name: 'Mugu', lat: 29.5000, lng: 82.1000, province: 'Karnali' },
    { name: 'Salyan', lat: 28.3500, lng: 82.1500, province: 'Karnali' },
    { name: 'Surkhet', lat: 28.6000, lng: 81.6167, province: 'Karnali' },
    { name: 'Rukum West', lat: 28.6333, lng: 82.5333, province: 'Karnali' },

    // Sudurpashchim Province
    { name: 'Achham', lat: 29.0500, lng: 81.2500, province: 'Sudurpashchim' },
    { name: 'Baitadi', lat: 29.5500, lng: 80.4500, province: 'Sudurpashchim' },
    { name: 'Bajhang', lat: 29.5333, lng: 81.1833, province: 'Sudurpashchim' },
    { name: 'Bajura', lat: 29.4500, lng: 81.5167, province: 'Sudurpashchim' },
    { name: 'Dadeldhura', lat: 29.3000, lng: 80.5833, province: 'Sudurpashchim' },
    { name: 'Darchula', lat: 29.8500, lng: 80.5500, province: 'Sudurpashchim' },
    { name: 'Doti', lat: 29.2667, lng: 80.9500, province: 'Sudurpashchim' },
    { name: 'Kailali', lat: 28.8333, lng: 80.5833, province: 'Sudurpashchim' },
    { name: 'Kanchanpur', lat: 28.9667, lng: 80.1667, province: 'Sudurpashchim' },

    // Major Cities/Areas (popular routes)
    { name: 'Biratnagar', lat: 26.4525, lng: 87.2718, province: 'Province 1' },
    { name: 'Birgunj', lat: 27.0104, lng: 84.8821, province: 'Madhesh' },
    { name: 'Dharan', lat: 26.8065, lng: 87.2846, province: 'Province 1' },
    { name: 'Bharatpur', lat: 27.6833, lng: 84.4333, province: 'Bagmati' },
    { name: 'Hetauda', lat: 27.4167, lng: 85.0333, province: 'Bagmati' },
    { name: 'Nepalgunj', lat: 28.0500, lng: 81.6167, province: 'Lumbini' },
    { name: 'Dhangadhi', lat: 28.7000, lng: 80.5833, province: 'Sudurpashchim' },
    { name: 'Janakpur', lat: 26.7288, lng: 85.9263, province: 'Madhesh' },
    { name: 'Nagarkot', lat: 27.7167, lng: 85.5167, province: 'Bagmati' },
];

// Find nearest district to given coordinates
export function findNearestDistrict(lat: number, lng: number): District | null {
    if (!lat || !lng) return null;

    let nearest: District | null = null;
    let minDistance = Infinity;

    for (const district of districts) {
        const distance = Math.sqrt(
            Math.pow(district.lat - lat, 2) + Math.pow(district.lng - lng, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearest = district;
        }
    }

    return nearest;
}

// Calculate distance between two points using Haversine formula (returns km)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1.3); // 1.3x for road distance factor
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

// Estimate travel time based on distance (avg 40km/h for bus in Nepal terrain)
export function estimateTravelTime(distanceKm: number): number {
    const avgSpeedKmH = 40;
    return Math.round((distanceKm / avgSpeedKmH) * 60); // returns minutes
}

// Get district by name
export function getDistrictByName(name: string): District | undefined {
    return districts.find(d => d.name.toLowerCase() === name.toLowerCase());
}

// Get all district names
export function getDistrictNames(): string[] {
    return districts.map(d => d.name).sort();
}
