"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { ClientLayout } from '@/features/shared/components/layout/client-layout';
import { FooterSection } from '@/features/shared/components/sections/footer-section';
import {
  Play,
  Pause,
  RotateCcw,
  MapPin,
  DollarSign,
  Truck,
  Wrench,
  CheckCircle,
  Zap
} from 'lucide-react';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  totalTime: number; // in seconds
  isPaused: boolean;
  pausedTime: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

interface JobSegment {
  id: string;
  type: 'travel' | 'labour';
  startLocation: LocationData;
  endLocation?: LocationData;
  startAddress: string;
  endAddress?: string;
  startTime: number;
  endTime?: number;
  duration: number; // in seconds
  isActive: boolean;
}



export default function TimeclockPage() {
  // Load initial state from localStorage or use defaults
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-hourlyRate');
      return saved ? parseFloat(saved) : 75;
    }
    return 75;
  });

  const [travelTimer, setTravelTimer] = useState<TimerState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-travelTimer');
      return saved ? JSON.parse(saved) : {
        isRunning: false,
        startTime: null,
        totalTime: 0,
        isPaused: false,
        pausedTime: 0
      };
    }
    return {
      isRunning: false,
      startTime: null,
      totalTime: 0,
      isPaused: false,
      pausedTime: 0
    };
  });

  const [labourTimer, setLabourTimer] = useState<TimerState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-labourTimer');
      return saved ? JSON.parse(saved) : {
        isRunning: false,
        startTime: null,
        totalTime: 0,
        isPaused: false,
        pausedTime: 0
      };
    }
    return {
      isRunning: false,
      startTime: null,
      totalTime: 0,
      isPaused: false,
      pausedTime: 0
    };
  });

  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [jobSegments, setJobSegments] = useState<JobSegment[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-jobSegments');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [jobStarted, setJobStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-jobStarted');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [jobCompleted, setJobCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-jobCompleted');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Cache for geocoded addresses to avoid repeated API calls
  const [addressCache, setAddressCache] = useState<Map<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeclock-addressCache');
      return saved ? new Map(JSON.parse(saved)) : new Map();
    }
    return new Map();
  });

  // GPS tracking
  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      setCurrentLocation(locationData);
      setIsTrackingLocation(true);
      return true;
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enable location services.');
      return false;
    }
  }, []);

  // Function to get address from coordinates with multiple fallbacks
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    // Create cache key from coordinates (rounded to avoid too many cache entries)
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

    // Check cache first
    if (addressCache.has(cacheKey)) {
      console.log('Using cached address for:', cacheKey);
      return addressCache.get(cacheKey)!;
    }

    // Try multiple geocoding services for better reliability
    const geocodingServices = [
      // Service 1: BigDataCloud (free, no API key required)
      async () => {
        console.log('BigDataCloud: Attempting geocoding for', lat, lng);
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        console.log('BigDataCloud: Response status:', response.status);

        if (!response.ok) {
          throw new Error(`BigDataCloud HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('BigDataCloud: Response data:', data);

        if (data.locality && data.principalSubdivision) {
          return `${data.locality}, ${data.principalSubdivision}`;
        } else if (data.city && data.countryName) {
          return `${data.city}, ${data.countryName}`;
        } else if (data.countryName) {
          return `${data.countryName}`;
        }

        throw new Error('BigDataCloud: No usable address data in response');
      },

      // Service 2: Nominatim (OpenStreetMap - free, no API key)
      async () => {
        console.log('Nominatim: Attempting geocoding for', lat, lng);
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TimeClock-Pro-App'
          }
        });

        console.log('Nominatim: Response status:', response.status);

        if (!response.ok) {
          throw new Error(`Nominatim HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Nominatim: Response data:', data);

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

        throw new Error('Nominatim: No usable address data in response');
      }
    ];

    // Try each service in order
    for (let i = 0; i < geocodingServices.length; i++) {
      try {
        console.log(`Trying geocoding service ${i + 1}...`);
        const address = await geocodingServices[i]();
        console.log(`Geocoding service ${i + 1} succeeded:`, address);

        // Cache the successful result
        const newCache = new Map(addressCache);
        newCache.set(cacheKey, address);
        setAddressCache(newCache);

        // Save to localStorage
        localStorage.setItem('timeclock-addressCache', JSON.stringify(Array.from(newCache.entries())));

        return address;
      } catch (error) {
        console.warn(`Geocoding service ${i + 1} failed:`, error);

        // If this is the last service, fall back to coordinates
        if (i === geocodingServices.length - 1) {
          console.error('All geocoding services failed, using coordinates');
          const fallbackAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

          // Cache the fallback too (but don't persist it as long)
          const newCache = new Map(addressCache);
          newCache.set(cacheKey, fallbackAddress);
          setAddressCache(newCache);

          return fallbackAddress;
        }
      }
    }

    // Fallback (should never reach here, but just in case)
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('timeclock-hourlyRate', hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('timeclock-travelTimer', JSON.stringify(travelTimer));
  }, [travelTimer]);

  useEffect(() => {
    localStorage.setItem('timeclock-labourTimer', JSON.stringify(labourTimer));
  }, [labourTimer]);

  useEffect(() => {
    localStorage.setItem('timeclock-jobStarted', JSON.stringify(jobStarted));
  }, [jobStarted]);

  useEffect(() => {
    localStorage.setItem('timeclock-jobCompleted', JSON.stringify(jobCompleted));
  }, [jobCompleted]);

  useEffect(() => {
    localStorage.setItem('timeclock-jobSegments', JSON.stringify(jobSegments));
  }, [jobSegments]);

  // Update location periodically when tracking
  useEffect(() => {
    let locationInterval: NodeJS.Timeout;

    if (isTrackingLocation && (travelTimer.isRunning || labourTimer.isRunning)) {
      locationInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            };
            setCurrentLocation(locationData);
          },
          (error) => console.error('Location update error:', error),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
        );
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [isTrackingLocation, travelTimer.isRunning, labourTimer.isRunning]);

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (travelTimer.isRunning && travelTimer.startTime && !travelTimer.isPaused) {
        setTravelTimer(prev => ({
          ...prev,
          totalTime: prev.pausedTime + Math.floor((now - prev.startTime!) / 1000)
        }));
      }

      if (labourTimer.isRunning && labourTimer.startTime && !labourTimer.isPaused) {
        setLabourTimer(prev => ({
          ...prev,
          totalTime: prev.pausedTime + Math.floor((now - prev.startTime!) / 1000)
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [travelTimer.isRunning, travelTimer.startTime, travelTimer.isPaused,
      labourTimer.isRunning, labourTimer.startTime, labourTimer.isPaused]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCost = (): number => {
    const totalHours = (travelTimer.totalTime + labourTimer.totalTime) / 3600;
    return totalHours * hourlyRate;
  };

  const startTimer = async (type: 'travel' | 'labour') => {
    if (!isTrackingLocation) {
      const locationGranted = await requestLocationPermission();
      if (!locationGranted) return;
    }

    if (!jobStarted) {
      setJobStarted(true);
    }

    const now = Date.now();

    // Stop other timer if running (only one can be active)
    if (type === 'travel' && labourTimer.isRunning) {
      setLabourTimer(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        pausedTime: prev.totalTime
      }));
    } else if (type === 'labour' && travelTimer.isRunning) {
      setTravelTimer(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        pausedTime: prev.totalTime
      }));
    }

    if (type === 'travel') {
      setTravelTimer(prev => ({
        ...prev,
        isRunning: true,
        startTime: now,
        isPaused: false
      }));
    } else {
      setLabourTimer(prev => ({
        ...prev,
        isRunning: true,
        startTime: now,
        isPaused: false
      }));
    }
  };

  const pauseTimer = async (type: 'travel' | 'labour') => {
    const now = Date.now();
    let startTime = 0;
    let segmentDuration = 0;

    // Get the start time and calculate duration
    if (type === 'travel' && travelTimer.startTime) {
      startTime = travelTimer.startTime;
      segmentDuration = Math.floor((now - travelTimer.startTime) / 1000);
    } else if (type === 'labour' && labourTimer.startTime) {
      startTime = labourTimer.startTime;
      segmentDuration = Math.floor((now - labourTimer.startTime) / 1000);
    }

    // Create a complete segment when stopping/pausing
    if (currentLocation && startTime > 0) {
      const startAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);
      const endAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);

      const completedSegment: JobSegment = {
        id: `${type}_${startTime}`,
        type,
        startLocation: currentLocation,
        endLocation: currentLocation,
        startAddress,
        endAddress,
        startTime,
        endTime: now,
        duration: segmentDuration,
        isActive: false
      };

      setJobSegments(prev => [...prev, completedSegment]);
    }

    if (type === 'travel') {
      setTravelTimer(prev => ({
        ...prev,
        isRunning: false,
        isPaused: true,
        pausedTime: prev.totalTime
      }));
    } else {
      setLabourTimer(prev => ({
        ...prev,
        isRunning: false,
        isPaused: true,
        pausedTime: prev.totalTime
      }));
    }
  };

  const resetTimer = (type: 'travel' | 'labour') => {
    if (type === 'travel') {
      setTravelTimer({
        isRunning: false,
        startTime: null,
        totalTime: 0,
        isPaused: false,
        pausedTime: 0
      });
    } else {
      setLabourTimer({
        isRunning: false,
        startTime: null,
        totalTime: 0,
        isPaused: false,
        pausedTime: 0
      });
    }
  };

  const finishJob = async () => {
    const now = Date.now();

    // Create segments for any running timers
    if (currentLocation) {
      // Create travel segment if travel timer is running
      if (travelTimer.isRunning && travelTimer.startTime) {
        const startAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);
        const endAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);

        const travelSegment: JobSegment = {
          id: `travel_${travelTimer.startTime}`,
          type: 'travel',
          startLocation: currentLocation,
          endLocation: currentLocation,
          startAddress,
          endAddress,
          startTime: travelTimer.startTime,
          endTime: now,
          duration: Math.floor((now - travelTimer.startTime) / 1000),
          isActive: false
        };

        setJobSegments(prev => [...prev, travelSegment]);
      }

      // Create labour segment if labour timer is running
      if (labourTimer.isRunning && labourTimer.startTime) {
        const startAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);
        const endAddress = await getAddressFromCoordinates(currentLocation.latitude, currentLocation.longitude);

        const labourSegment: JobSegment = {
          id: `labour_${labourTimer.startTime}`,
          type: 'labour',
          startLocation: currentLocation,
          endLocation: currentLocation,
          startAddress,
          endAddress,
          startTime: labourTimer.startTime,
          endTime: now,
          duration: Math.floor((now - labourTimer.startTime) / 1000),
          isActive: false
        };

        setJobSegments(prev => [...prev, labourSegment]);
      }
    }

    // Stop all timers
    setTravelTimer(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      pausedTime: prev.totalTime
    }));
    setLabourTimer(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      pausedTime: prev.totalTime
    }));

    setJobCompleted(true);
    setIsTrackingLocation(false);
  };

  const resetJob = () => {
    setTravelTimer({
      isRunning: false,
      startTime: null,
      totalTime: 0,
      isPaused: false,
      pausedTime: 0
    });
    setLabourTimer({
      isRunning: false,
      startTime: null,
      totalTime: 0,
      isPaused: false,
      pausedTime: 0
    });
    setJobStarted(false);
    setJobCompleted(false);
    setCurrentLocation(null);
    setIsTrackingLocation(false);

    // Clear localStorage
    localStorage.removeItem('timeclock-travelTimer');
    localStorage.removeItem('timeclock-labourTimer');
    localStorage.removeItem('timeclock-jobStarted');
    localStorage.removeItem('timeclock-jobCompleted');
    localStorage.removeItem('timeclock-jobSegments');

    // Reset job segments
    setJobSegments([]);
  };

  const totalCost = calculateCost();
  const isAnyTimerRunning = travelTimer.isRunning || labourTimer.isRunning;

  return (
    <ClientLayout>
      <div className="min-h-screen p-4 space-y-6">
        <div className="max-w-4xl mx-auto">
         {/* Header with integrated controls */}
         <div className="text-center mb-16 md:mb-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 rounded-3xl blur-3xl"></div>
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-4 sm:mb-6 md:mb-8 leading-tight max-w-6xl mx-auto px-4 glow-text">
              <Zap className="inline-block w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-primary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">TimeClock</span> Pro
            </h1>
            <p className="text-lg md:text-xl hero-subtitle mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto px-4 leading-relaxed font-normal">
              Professional time tracking with GPS and real-time pricing
            </p>

            {/* Integrated Hourly Rate - No Container */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <DollarSign className="w-6 h-6 text-accent" />
              <span className="text-lg font-medium text-foreground">Rate:</span>
              <div className="relative">
                <Input
                  id="hourlyRate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                  className="w-24 h-12 text-xl font-bold text-center bg-transparent border-2 border-primary/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 text-primary"
                  min="0"
                  step="0.01"
                  disabled={jobStarted && !jobCompleted}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">/hr</span>
              </div>
            </div>

            {/* Futuristic GPS Map Visualization */}
            <div className="relative w-full max-w-md mx-auto h-32 mb-8">
              {/* Animated Grid Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="grid grid-cols-8 grid-rows-4 h-full w-full">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-primary/20 animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>

              {/* Central GPS Indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`relative ${isTrackingLocation ? 'animate-ping' : ''}`}>
                  <div className={`w-8 h-8 rounded-full ${isTrackingLocation ? 'bg-accent' : 'bg-muted'} shadow-lg`}>
                    <MapPin className="w-4 h-4 text-background absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  {isTrackingLocation && (
                    <>
                      <div className="absolute inset-0 w-8 h-8 rounded-full bg-accent/30 animate-ping"></div>
                      <div className="absolute inset-0 w-12 h-12 -top-2 -left-2 rounded-full bg-accent/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    </>
                  )}
                </div>
              </div>

              {/* Scanning Lines */}
              {isTrackingLocation && (
                <>
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-secondary to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-transparent via-accent to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                </>
              )}

              {/* Status Text */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isTrackingLocation ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                  <span className="text-sm font-medium">
                    {isTrackingLocation ? 'GPS ACTIVE' : 'GPS INACTIVE'}
                  </span>
                  {currentLocation && (
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

         {/* Main Timer Display - More Impactful */}
         <div className="grid md:grid-cols-2 gap-8 mb-16 md:mb-20">
          {/* Travel Timer */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-secondary/30 rounded-2xl p-8 hover:border-secondary/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Truck className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Travel Time</h3>
              </div>

              <div className="text-center mb-8">
                <div className="text-5xl font-mono font-black stat-secondary mb-2">
                  {formatTime(travelTimer.totalTime)}
                </div>
                <div className="text-lg font-medium">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    travelTimer.isRunning ? 'bg-secondary/20 text-secondary' :
                    travelTimer.isPaused ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-muted/20 text-muted-foreground'
                  }`}>
                    {travelTimer.isRunning ? '● RUNNING' : travelTimer.isPaused ? '⏸ PAUSED' : '⏹ STOPPED'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                {!travelTimer.isRunning ? (
                  <Button
                    onClick={() => startTimer('travel')}
                    className="btn-futuristic flex-1 h-12 text-lg"
                    disabled={jobCompleted}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {travelTimer.isPaused ? 'Continue' : 'Start'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => pauseTimer('travel')}
                    className="btn-futuristic flex-1 h-12 text-lg"
                    variant="secondary"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </Button>
                )}

                <Button
                  onClick={() => resetTimer('travel')}
                  className="btn-futuristic-outline px-6 h-12"
                  variant="outline"
                  disabled={travelTimer.isRunning || jobCompleted}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Labour Timer */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-primary/30 rounded-2xl p-8 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Wrench className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Labour Time</h3>
              </div>

              <div className="text-center mb-8">
                <div className="text-5xl font-mono font-black stat-primary mb-2">
                  {formatTime(labourTimer.totalTime)}
                </div>
                <div className="text-lg font-medium">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    labourTimer.isRunning ? 'bg-primary/20 text-primary' :
                    labourTimer.isPaused ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-muted/20 text-muted-foreground'
                  }`}>
                    {labourTimer.isRunning ? '● RUNNING' : labourTimer.isPaused ? '⏸ PAUSED' : '⏹ STOPPED'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                {!labourTimer.isRunning ? (
                  <Button
                    onClick={() => startTimer('labour')}
                    className="btn-futuristic flex-1 h-12 text-lg"
                    disabled={jobCompleted}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {labourTimer.isPaused ? 'Continue' : 'Start'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => pauseTimer('labour')}
                    className="btn-futuristic flex-1 h-12 text-lg"
                    variant="secondary"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </Button>
                )}

                <Button
                  onClick={() => resetTimer('labour')}
                  className="btn-futuristic-outline px-6 h-12"
                  variant="outline"
                  disabled={labourTimer.isRunning || jobCompleted}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

         {/* Real-time Pricing Dashboard - No Container */}
         <div className="relative mb-16 md:mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-primary/5 to-destructive/10 rounded-3xl blur-2xl"></div>
          <div className="relative">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-2">
                Live Pricing Dashboard
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center group">
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Travel Hours</div>
                <div className="text-3xl font-black stat-secondary group-hover:scale-110 transition-transform duration-300">
                  {(travelTimer.totalTime / 3600).toFixed(2)}h
                </div>
              </div>
              <div className="text-center group">
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Labour Hours</div>
                <div className="text-3xl font-black stat-primary group-hover:scale-110 transition-transform duration-300">
                  {(labourTimer.totalTime / 3600).toFixed(2)}h
                </div>
              </div>
              <div className="text-center group">
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Total Hours</div>
                <div className="text-3xl font-black stat-accent group-hover:scale-110 transition-transform duration-300">
                  {((travelTimer.totalTime + labourTimer.totalTime) / 3600).toFixed(2)}h
                </div>
              </div>
              <div className="text-center group">
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Total Cost</div>
                <div className="text-4xl font-black stat-destructive group-hover:scale-110 transition-transform duration-300">
                  ${totalCost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job Control - More Impactful */}
        <div className="text-center">
          {!jobCompleted ? (
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-primary/30 rounded-2xl blur-xl animate-pulse"></div>
              <Button
                onClick={finishJob}
                className="relative btn text-xl px-12 py-4 h-16 bg-gradient-to-r from-accent to-primary hover:from-accent/80 hover:to-primary/80 border-0 shadow-2xl"
                disabled={!jobStarted}
              >
                <CheckCircle className="w-6 h-6 mr-3" />
                Finish Job
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/10 to-destructive/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-accent/30 rounded-3xl p-12">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="p-4 bg-accent/20 rounded-full animate-pulse">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    Job Completed!
                  </span>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="text-5xl font-black stat-destructive">
                    ${totalCost.toFixed(2)}
                  </div>
                  <div className="text-lg text-muted-foreground">
                    <span className="stat-secondary font-bold">Travel: {formatTime(travelTimer.totalTime)}</span>
                    <span className="mx-4">•</span>
                    <span className="stat-primary font-bold">Labour: {formatTime(labourTimer.totalTime)}</span>
                  </div>

                  {/* Visual Job Timeline Map */}
                  {jobSegments.length > 0 && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-accent/20 to-primary/20 rounded-xl border border-accent/30">
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <MapPin className="w-5 h-5 text-accent" />
                        <span className="text-lg font-bold text-accent">Job Journey Map</span>
                      </div>

                      {/* Visual Timeline */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent via-primary to-secondary"></div>

                        <div className="space-y-6">
                          {jobSegments
                            .sort((a, b) => a.startTime - b.startTime)
                            .map((segment, index) => (
                            <div key={segment.id} className="relative flex items-start gap-4">
                              {/* Timeline Dot */}
                              <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center ${
                                segment.type === 'travel'
                                  ? 'bg-gradient-to-br from-secondary to-secondary/70 border-2 border-secondary/50'
                                  : 'bg-gradient-to-br from-primary to-primary/70 border-2 border-primary/50'
                              } shadow-lg`}>
                                {segment.type === 'travel' ? (
                                  <Truck className="w-6 h-6 text-white" />
                                ) : (
                                  <Wrench className="w-6 h-6 text-white" />
                                )}
                              </div>

                              {/* Segment Info */}
                              <div className="flex-1 min-w-0 bg-card/40 rounded-lg p-4 border border-accent/20">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-lg font-bold text-foreground capitalize">
                                    {segment.type} #{index + 1}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm bg-accent/20 text-accent px-3 py-1 rounded-full font-bold">
                                      {formatTime(segment.duration)}
                                    </span>
                                    <span className="text-sm bg-destructive/20 text-destructive px-3 py-1 rounded-full font-bold">
                                      ${((segment.duration / 3600) * hourlyRate).toFixed(2)}
                                    </span>
                                    {segment.isActive && (
                                      <div className="flex items-center gap-1 text-yellow-400">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                        <span className="text-xs font-medium">ACTIVE</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                      <span className="font-bold text-green-400">START</span>
                                    </div>
                                    <div className="text-accent font-medium">📍 {segment.startAddress}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(segment.startTime).toLocaleTimeString()}
                                    </div>
                                  </div>

                                  {segment.endAddress && segment.endTime && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                        <span className="font-bold text-red-400">END</span>
                                      </div>
                                      <div className="text-accent font-medium">📍 {segment.endAddress}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(segment.endTime).toLocaleTimeString()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 text-xs text-center text-muted-foreground">
                        <strong>Professional Journey Documentation</strong> • Complete route tracking • Time & location verification
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={resetJob}
                  className="btn-futuristic-outline text-lg px-8 py-3 h-12"
                  variant="outline"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Start New Job
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {isAnyTimerRunning && (
          <div className="fixed bottom-4 right-4">
            <div className="futuristic-card p-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent rounded-full animate-ping" />
                <span className="text-sm font-medium">
                  {travelTimer.isRunning ? 'Travel' : 'Labour'} Active
                </span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Spacer between tool and content */}
      <div className="h-24"></div>

      {/* Section Separator */}
      <div className="section-separator mb-16"></div>

      {/* SEO-Optimized Content Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* How to Use Section */}
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="floating-data-display border-primary/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-primary font-mono text-sm font-bold tracking-wider">HOW TO USE</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
              How to Use <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">TimeClock Pro</span>
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Simple 3-step process to start tracking your professional time
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="futuristic-card p-8 group hover:scale-105 transition-all duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent/30 to-accent/10 rounded-full flex items-center justify-center shadow-xl">
                  <DollarSign className="w-8 h-8 text-accent group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="absolute top-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">1</div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-accent transition-colors">Set Your Rate</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your hourly rate for accurate real-time pricing calculations and professional billing
              </p>
            </div>

            <div className="futuristic-card p-8 group hover:scale-105 transition-all duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center shadow-xl">
                  <Play className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="absolute top-0 right-0 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-white">2</div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-primary transition-colors">Track Time</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use Travel for driving between jobs, Labour for actual work time with GPS location tracking
              </p>
            </div>

            <div className="futuristic-card p-8 group hover:scale-105 transition-all duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-destructive/30 to-destructive/10 rounded-full flex items-center justify-center shadow-xl">
                  <CheckCircle className="w-8 h-8 text-destructive group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="absolute top-0 right-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs font-bold text-white">3</div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-destructive transition-colors">Get Paid</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional invoice with GPS verification and detailed breakdown for transparent customer billing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Separator */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>

      {/* Benefits Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="floating-data-display border-accent/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-accent font-mono text-sm font-bold tracking-wider">PERFECT FOR</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
              Perfect for <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Australian Tradies</span> & Service Professionals
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Designed specifically for mobile service professionals across Australia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-primary/30 transition-all duration-500">
                <Truck className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-primary transition-colors">Removalists</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track packing time, travel between locations, and delivery time with GPS verification for professional moving services
              </p>
            </div>

            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-secondary/30 transition-all duration-500">
                <Wrench className="w-10 h-10 text-secondary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-secondary transition-colors">Plumbers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Document travel to job sites and actual repair work with location proof for transparent customer billing
              </p>
            </div>

            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-accent/30 to-accent/10 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-accent/30 transition-all duration-500">
                <Zap className="w-10 h-10 text-accent group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-accent transition-colors">Electricians</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track installation time, travel costs, and provide transparent billing for electrical services and repairs
              </p>
            </div>

            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-destructive/30 to-destructive/10 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-destructive/30 transition-all duration-500">
                <CheckCircle className="w-10 h-10 text-destructive group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-destructive transition-colors">All Tradies</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional time tracking for builders, landscapers, cleaners, HVAC technicians, and all service professionals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Separator */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>

      {/* Features Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="floating-data-display border-secondary/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                  <span className="text-secondary font-mono text-sm font-bold tracking-wider">FEATURES</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
              Professional <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Time Tracking</span> Features
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Advanced features designed specifically for Australian tradies and service professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="futuristic-card p-8 group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-accent/30 to-accent/10 rounded-2xl shadow-xl">
                  <MapPin className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-accent transition-colors">GPS Location Tracking</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  Real-time location verification for service proof
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  Automatic address conversion from GPS coordinates
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  Complete route documentation for insurance claims
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  Travel time verification between job sites
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  Professional service location records
                </li>
              </ul>
            </div>

            <div className="futuristic-card p-8 group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-destructive/30 to-destructive/10 rounded-2xl shadow-xl">
                  <DollarSign className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-destructive transition-colors">Real-Time Pricing</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Live cost calculation as you work
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Separate travel and labour time tracking
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Transparent pricing for customer trust
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Professional invoice generation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Accurate billing with GPS proof
                </li>
              </ul>
            </div>

            <div className="futuristic-card p-8 group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl shadow-xl">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-primary transition-colors">Business Protection</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Dispute resolution with timestamped location data
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Insurance claim support with GPS verification
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Professional service documentation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Legal protection for service providers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Workplace safety incident reporting
                </li>
              </ul>
            </div>

            <div className="futuristic-card p-8 group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-2xl shadow-xl">
                  <Zap className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text group-hover:text-secondary transition-colors">Business Intelligence</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Job profitability analysis by location
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Travel time optimization insights
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Customer service area mapping
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Tax deduction mileage tracking
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Efficiency improvement recommendations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section Separator */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>

      {/* SEO Content Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="floating-data-display border-primary/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-primary font-mono text-sm font-bold tracking-wider">FREE TOOL</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
              <span className="bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">Free Time Tracking Tool</span> for Australian Tradies
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              TimeClock Pro is a <strong>free professional time tracking application</strong> designed specifically for
              <strong> Australian tradies, removalists, plumbers, electricians, builders, and service professionals</strong>.
              Track your <strong>travel time and labour time</strong> with <strong>GPS location verification</strong>
              for transparent, professional billing.
            </p>

            <p className="leading-relaxed">
              Whether you&apos;re a <strong>removalist tracking packing and delivery time</strong>, a
              <strong>plumber documenting service calls</strong>, or an <strong>electrician managing installation jobs</strong>,
              our <strong>GPS-enabled time tracker</strong> provides the professional documentation you need.
              Generate accurate invoices with <strong>real-time pricing calculations</strong> and
              <strong>location-verified service records</strong>.
            </p>

            <p className="leading-relaxed">
              Perfect for <strong>mobile service businesses</strong>, <strong>field service management</strong>,
              <strong>contractor time tracking</strong>, and <strong>professional service documentation</strong>.
              Includes features for <strong>travel time billing</strong>, <strong>on-site labour tracking</strong>,
              <strong>GPS route verification</strong>, and <strong>transparent customer billing</strong>.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-8 text-sm">
              <div className="futuristic-card p-4">
                <h4 className="font-bold text-accent mb-2">Service Areas</h4>
                <p>Melbourne, Sydney, Brisbane, Perth, Adelaide, Gold Coast, Newcastle, Wollongong</p>
              </div>
              <div className="futuristic-card p-4">
                <h4 className="font-bold text-primary mb-2">Industries</h4>
                <p>Removalists, Plumbers, Electricians, Builders, Landscapers, Cleaners, HVAC, Painters</p>
              </div>
              <div className="futuristic-card p-4">
                <h4 className="font-bold text-secondary mb-2">Features</h4>
                <p>GPS tracking, Real-time pricing, Professional invoicing, Route documentation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Separator */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>

      {/* Call to Action */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <div className="inline-block mb-4">
              <div className="floating-data-display border-accent/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-accent font-mono text-sm font-bold tracking-wider">GET STARTED</span>
                </div>
              </div>
            </div>

            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 glow-text">
              Start Tracking Your Time <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Professionally</span> Today
            </h3>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Free to use • No registration required • Works on all devices • GPS enabled
            </p>

            <div className="flex justify-center">
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn text-lg px-8 py-3"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Time Tracking
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </ClientLayout>
  );
}
