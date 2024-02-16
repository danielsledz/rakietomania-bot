export interface Launch {
  id: string;
  url: string;
  slug: string;
  name: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  };
  last_updated: string;
  net: string;
  window_end: string;
  window_start: string;
  net_precision: string | null;
  probability: string | null;
  weather_concerns: string | null;
  holdreason: string | null;
  failreason: string | null;
  hashtag: string | null;
  launch_service_provider: {
    id: number;
    url: string;
    name: string;
    type: string;
  };
  rocket: {
    id: number;
    configuration: {
      id: number;
      url: string;
      name: string;
      family: string;
      full_name: string;
      variant: string;
    };
  };
  mission: {
    id: number;
    name: string;
    description: string;
    launch_designator: string | null;
    type: string;
    orbit: {
      id: number;
      name: string;
      abbrev: string;
    };
    agencies: any[];
    info_urls: any[];
    vid_urls: any[];
  };
  pad: {
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
    location: {
      id: number;
      url: string;
      name: string;
      country_code: string;
      description: string | null;
      map_image: string;
      timezone_name: string;
      total_launch_count: number;
      total_landing_count: number;
    };
    country_code: string;
    map_image: string;
    total_launch_count: number;
    orbital_launch_attempt_count: number;
  };
  webcast_live: boolean;
  image: string | null;
  infographic: string | null;
  program: any[];
  orbital_launch_attempt_count: number;
  location_launch_attempt_count: number;
  pad_launch_attempt_count: number;
  agency_launch_attempt_count: number;
  orbital_launch_attempt_count_year: number;
  location_launch_attempt_count_year: number;
  pad_launch_attempt_count_year: number;
  agency_launch_attempt_count_year: number;
}
