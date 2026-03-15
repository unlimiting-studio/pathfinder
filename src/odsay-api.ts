const BASE_URL = "https://api.odsay.com/v1/api";

export interface TransitRequest {
  origin: { x: number; y: number };
  destination: { x: number; y: number };
  searchPathType?: number; // 0=all, 1=subway, 2=bus
  OPT?: number; // 0=recommended, 1=minimum transfers, 2=minimum walking, 3=no transfers
}

// Sub-path lane info
export interface Lane {
  name: string;
  subwayCode?: number;
  busNo?: string;
  type: number; // 1=subway, 2=bus, 3=bus+subway etc
}

export interface SubPath {
  trafficType: number; // 1=subway, 2=bus, 3=walking
  distance: number;
  sectionTime: number;
  stationCount?: number;
  startName?: string;
  startX?: number;
  startY?: number;
  endName?: string;
  endX?: number;
  endY?: number;
  lane?: Lane[];
  passStopList?: {
    stations: {
      stationName: string;
      x: string;
      y: string;
    }[];
  };
}

export interface TransitPath {
  pathType: number; // 1=subway, 2=bus, 3=subway+bus
  info: {
    trafficDistance: number;
    totalWalk: number;
    totalTime: number;
    payment: number;
    busTransitCount: number;
    subwayTransitCount: number;
    firstStartStation: string;
    lastEndStation: string;
    busStationCount: number;
    subwayStationCount: number;
  };
  subPath: SubPath[];
}

export interface TransitResponse {
  result: {
    searchType: number;
    outTrafficCheck: number;
    busCount: number;
    subwayCount: number;
    subwayBusCount: number;
    pointDistance: number;
    startRadius: number;
    endRadius: number;
    path: TransitPath[];
  };
}

export async function searchTransitPath(
  apiKey: string,
  req: TransitRequest
): Promise<TransitResponse> {
  const url = new URL(`${BASE_URL}/searchPubTransPathT`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("SX", String(req.origin.x));
  url.searchParams.set("SY", String(req.origin.y));
  url.searchParams.set("EX", String(req.destination.x));
  url.searchParams.set("EY", String(req.destination.y));
  url.searchParams.set("lang", "0");
  url.searchParams.set("output", "json");

  if (req.OPT !== undefined) {
    url.searchParams.set("OPT", String(req.OPT));
  }
  if (req.searchPathType !== undefined) {
    url.searchParams.set("SearchPathType", String(req.searchPathType));
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ODsay API 요청 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();

  // ODsay returns error in JSON body
  if (data.error) {
    throw new Error(`ODsay API 오류: ${data.error.msg || JSON.stringify(data.error)}`);
  }

  return data as TransitResponse;
}
