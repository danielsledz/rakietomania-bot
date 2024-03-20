export interface LaunchCollection {
  count: number;
  next: string | null;
  previous: string | null;
  results: Launch[];
}

interface Launch {
  id: string;
  url: string;
  slug: string;
  name: string;
  status: LaunchStatus;
  last_updated: string;
  net: string;
  window_end: string;
  window_start: string;
  net_precision: string | null;
  probability: number | null;
  weather_concerns: any | null; // Could be more specific if we had more info on the structure
  holdreason: string;
  failreason: string | null;
  hashtag: string | null;
  launch_service_provider: LaunchServiceProvider;
  rocket: Rocket;
  mission: Mission;
  pad: LaunchPad;
  webcast_live: boolean;
  image: string | null;
  infographic: string | null;
  program: any[]; // Could be more specific if we had more info on the structure
  orbital_launch_attempt_count: number;
  location_launch_attempt_count: number;
  pad_launch_attempt_count: number;
  agency_launch_attempt_count: number;
  orbital_launch_attempt_count_year: number;
  location_launch_attempt_count_year: number;
  pad_launch_attempt_count_year: number;
  agency_launch_attempt_count_year: number;
  type: string;
}

interface LaunchStatus {
  id: number;
  name: string;
  abbrev: string;
  description: string;
}

interface LaunchServiceProvider {
  id: number;
  url: string;
  name: string;
  type: string;
}

interface Rocket {
  id: number;
  configuration: RocketConfiguration;
}

interface RocketConfiguration {
  id: number;
  url: string;
  name: string;
  family: string;
  full_name: string;
  variant: string;
}

interface Mission {
  id: number;
  name: string;
  description: string;
  launch_designator: string | null;
  type: string;
  orbit: Orbit;
  agencies: any[]; // Could be more specific if we had more info on the structure
  info_urls: string[];
  vid_urls: string[];
}

interface Orbit {
  id: number;
  name: string;
  abbrev: string;
}

interface LaunchPad {
  id: number;
  url: string;
  agency_id: number | null;
  name: string;
  description: string | null;
  info_url: string | null;
  wiki_url: string;
  map_url: string;
  latitude: string;
  longitude: string;
  location: LaunchLocation;
  country_code: string;
  map_image: string;
  total_launch_count: number;
  orbital_launch_attempt_count: number;
}

interface LaunchLocation {
  id: number;
  url: string;
  name: string;
  country_code: string;
  description: string | null;
  map_image: string;
  timezone_name: string;
  total_launch_count: number;
  total_landing_count: number;
}
