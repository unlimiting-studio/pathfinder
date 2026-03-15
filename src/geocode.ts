import chalk from "chalk";
import inquirer from "inquirer";
import type { Coordinate } from "./api.js";

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com";

interface AddressDocument {
  address_name: string;
  address_type: string;
  x: string;
  y: string;
  address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  };
  road_address?: {
    address_name: string;
    road_name: string;
    building_name: string;
    zone_no: string;
  };
}

interface KeywordDocument {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  category_name: string;
  phone: string;
}

interface SearchResponse<T> {
  meta: { total_count: number; pageable_count: number; is_end: boolean };
  documents: T[];
}

async function searchAddress(
  apiKey: string,
  query: string
): Promise<AddressDocument[]> {
  const url = new URL("/v2/local/search/address.json", KAKAO_LOCAL_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`주소 검색 실패 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SearchResponse<AddressDocument>;
  return data.documents;
}

async function searchKeyword(
  apiKey: string,
  query: string
): Promise<KeywordDocument[]> {
  const url = new URL("/v2/local/search/keyword.json", KAKAO_LOCAL_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`키워드 검색 실패 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SearchResponse<KeywordDocument>;
  return data.documents;
}

interface ResolvedPlace {
  name: string;
  address: string;
  x: number;
  y: number;
}

function isCoordString(s: string): boolean {
  const parts = s.split(",");
  if (parts.length < 2) return false;
  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  return !isNaN(x) && !isNaN(y) && x > 100 && x < 200 && y > 20 && y < 50;
}

export async function resolveLocation(
  apiKey: string,
  input: string
): Promise<Coordinate> {
  // 이미 좌표 형식이면 바로 파싱
  if (isCoordString(input)) {
    const parts = input.split(",");
    const coord: Coordinate = {
      x: parseFloat(parts[0]),
      y: parseFloat(parts[1]),
    };
    for (let i = 2; i < parts.length; i++) {
      const [k, v] = parts[i].split("=");
      if (k === "name") coord.name = v;
      if (k === "angle") coord.angle = parseInt(v, 10);
    }
    return coord;
  }

  // 주소 검색 → 키워드 검색 순으로 시도
  const candidates: ResolvedPlace[] = [];

  const addressResults = await searchAddress(apiKey, input);
  for (const doc of addressResults) {
    const displayAddr =
      doc.road_address?.address_name || doc.address?.address_name || doc.address_name;
    candidates.push({
      name: displayAddr,
      address: doc.address_name,
      x: parseFloat(doc.x),
      y: parseFloat(doc.y),
    });
  }

  if (candidates.length === 0) {
    const keywordResults = await searchKeyword(apiKey, input);
    for (const doc of keywordResults) {
      candidates.push({
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        x: parseFloat(doc.x),
        y: parseFloat(doc.y),
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error(`"${input}"에 대한 검색 결과가 없습니다.`);
  }

  // 결과가 1개면 자동 선택
  if (candidates.length === 1) {
    const c = candidates[0];
    console.log(
      chalk.dim(`  📍 ${c.name} (${c.address}) → ${c.x}, ${c.y}`)
    );
    return { x: c.x, y: c.y, name: c.name };
  }

  // 여러 개면 사용자에게 선택
  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: `"${input}" 검색 결과를 선택하세요:`,
      choices: candidates.map((c, i) => ({
        name: `${c.name} ${chalk.dim(`(${c.address})`)}`,
        value: i,
      })),
    },
  ]);

  const chosen = candidates[selected as number];
  console.log(chalk.dim(`  📍 ${chosen.x}, ${chosen.y}`));
  return { x: chosen.x, y: chosen.y, name: chosen.name };
}

export async function resolveWaypoints(
  apiKey: string,
  input: string
): Promise<Coordinate[]> {
  const parts = input.split("|");
  const results: Coordinate[] = [];
  for (const part of parts) {
    results.push(await resolveLocation(apiKey, part.trim()));
  }
  return results;
}
