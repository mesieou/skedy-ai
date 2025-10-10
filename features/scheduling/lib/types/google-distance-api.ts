// API Status enums for better type safety
export enum DistanceApiStatus {
  OK = 'OK',
  NOT_FOUND = 'NOT_FOUND',
  ZERO_RESULTS = 'ZERO_RESULTS',
  MAX_ROUTE_LENGTH_EXCEEDED = 'MAX_ROUTE_LENGTH_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  OVER_DAILY_LIMIT = 'OVER_DAILY_LIMIT',
  OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
  REQUEST_DENIED = 'REQUEST_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum TransportMode {
  DRIVING = 'driving'
}

export enum DistanceUnits {
  METRIC = 'metric',
  IMPERIAL = 'imperial'
}

export enum AvoidanceOptions {
  TOLLS = 'tolls',
  HIGHWAYS = 'highways',
  FERRIES = 'ferries',
  INDOOR = 'indoor'
}

export enum TrafficModel {
  BEST_GUESS = 'best_guess',
  PESSIMISTIC = 'pessimistic',
  OPTIMISTIC = 'optimistic'
}

// Main interfaces
export interface DistanceApiRequest {
  readonly origin: string;
  readonly destination: string;
  readonly units?: DistanceUnits;
  readonly avoidTolls?: boolean;
  readonly traffic_model?: TrafficModel;
  readonly departure_time?: string; // UTC ISO string
}

export interface DistanceApiResponse {
  readonly distance_km: number;
  readonly duration_mins: number;
  readonly status: DistanceApiStatus;
  readonly error_message?: string;
}

// Google API raw response types (internal)
export interface GoogleApiElement {
  readonly status: string;
  readonly distance?: { readonly value: number };
  readonly duration?: { readonly value: number };
}

export interface GoogleApiRow {
  readonly elements?: readonly GoogleApiElement[];
}

export interface GoogleApiResponse {
  readonly status: string;
  readonly error_message?: string;
  readonly rows?: readonly GoogleApiRow[];
  readonly origin_addresses?: readonly string[];
  readonly destination_addresses?: readonly string[];
}

// Matrix request for batching
export interface MatrixRequest {
  readonly origins: readonly string[];
  readonly destinations: readonly string[];
  readonly units?: DistanceUnits;
  readonly avoidTolls?: boolean;
  readonly traffic_model?: TrafficModel;
  readonly departure_time?: string;
}

// Individual request mapping for matrix results
export interface RequestMapping {
  readonly originIndex: number;
  readonly destinationIndex: number;
  readonly originalRequest: DistanceApiRequest;
}

// Configuration types
export interface ApiConfiguration {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly useMockData: boolean;
}

// Service interface for dependency injection
export interface IDistanceApiService {
  getDistanceAndDuration(request: DistanceApiRequest): Promise<DistanceApiResponse>;
  getBatchDistances(requests: readonly DistanceApiRequest[]): Promise<readonly DistanceApiResponse[]>;
}

// Constants
export const DEFAULT_DRIVING_SPEED_KMH = 40;
export const API_BASE_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Type guards
export const isSuccessfulResponse = (response: DistanceApiResponse): boolean =>
  response.status === DistanceApiStatus.OK && response.distance_km > 0;
