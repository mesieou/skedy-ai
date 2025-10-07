import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing latitude or longitude parameters' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude values' },
      { status: 400 }
    );
  }

  // Try multiple geocoding services
  const geocodingServices = [
    // Service 1: BigDataCloud
    async () => {
      console.log('Server: BigDataCloud geocoding for', latitude, longitude);
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TimeClock-Pro-Server'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`BigDataCloud HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.locality && data.principalSubdivision) {
        return `${data.locality}, ${data.principalSubdivision}`;
      } else if (data.city && data.countryName) {
        return `${data.city}, ${data.countryName}`;
      } else if (data.countryName) {
        return data.countryName;
      }

      throw new Error('No usable address data');
    },

    // Service 2: Nominatim
    async () => {
      console.log('Server: Nominatim geocoding for', latitude, longitude);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TimeClock-Pro-Server'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.address) {
        const { suburb, city, town, village, state, country } = data.address;
        const location = suburb || city || town || village;
        const region = state || country;

        if (location && region) {
          return `${location}, ${region}`;
        } else if (location) {
          return location;
        } else if (region) {
          return region;
        }
      }

      throw new Error('No usable address data');
    }
  ];

  // Try each service
  for (let i = 0; i < geocodingServices.length; i++) {
    try {
      const address = await geocodingServices[i]();
      console.log(`Server: Geocoding service ${i + 1} succeeded:`, address);

      return NextResponse.json({
        address,
        coordinates: { latitude, longitude },
        service: i === 0 ? 'BigDataCloud' : 'Nominatim'
      });
    } catch (error) {
      console.warn(`Server: Geocoding service ${i + 1} failed:`, error);
    }
  }

  // All services failed, return coordinates
  const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  return NextResponse.json({
    address: fallbackAddress,
    coordinates: { latitude, longitude },
    service: 'fallback',
    warning: 'All geocoding services failed, using coordinates'
  });
}
