---
name: pathfinder
description: 한국 내 길찾기가 필요할 때 사용합니다. 자동차(카카오 모빌리티)와 대중교통(ODsay) 길찾기를 지원하며, 실시간/미래 교통 상황 기반의 경로 탐색, 소요 시간, 거리, 요금 정보를 제공합니다. 주소, 장소명, 좌표 모두 지원합니다.
---

Usage: pathfinder [options] [command]

한국 길찾기 CLI (자동차 + 대중교통)

Options:
  -V, --version             버전 출력
  -h, --help                도움말 표시

Commands:
  login [service]           API 키를 등록합니다 (kakao 또는 odsay)
  status                    현재 로그인 상태를 확인합니다
  logout [service]          저장된 API 키를 삭제합니다
  directions|dir [options]  자동차 길찾기 (출발지 → 도착지, 최대 5개 경유지)
  waypoints|wp [options]    다중 경유지 길찾기 (최대 30개 경유지, POST)
  future|ft [options]       미래 운행정보 길찾기 (출발 시간 지정)
  transit|pt [options]      대중교통 길찾기 (출발지 → 도착지)
  help [command]            명령어별 도움말 표시

## 인증

두 개의 API 키가 필요합니다:
- **카카오 REST API 키**: 자동차 길찾기 + 주소/장소 검색에 사용 (모든 명령에 필요)
- **ODsay API 키**: 대중교통 길찾기에 사용 (`transit` 명령에만 필요)

API 키 발급 방법은 별도 가이드를 참고하세요:
- 카카오: `skills/pathfinder/guides/kakao-api-setup.md`
- ODsay: `skills/pathfinder/guides/odsay-api-setup.md`

**키 등록:**
```
pathfinder login kakao
pathfinder login odsay
pathfinder login kakao -k YOUR_KAKAO_REST_API_KEY
pathfinder login odsay -k YOUR_ODSAY_API_KEY
```

키는 `~/.pathfinder/config.json`에 저장됩니다.

## 위치 지정 방식

모든 출발지/도착지/경유지는 3가지 방식으로 지정할 수 있습니다:

1. **주소** (지번/도로명): `"서울특별시 강남구 역삼동 858"`, `"테헤란로 152"`
2. **장소명**: `"강남역"`, `"서울역"`, `"카카오 판교오피스"`
3. **좌표** (경도,위도): `127.1086228,37.4012191`

주소/장소명 입력 시 카카오맵 API로 자동 검색 → 검색 결과가 여러 개면 선택 프롬프트 표시 → 좌표 변환 → 길찾기로 연결됩니다.

## 자동차 길찾기

출발지에서 도착지까지의 경로를 탐색합니다. 경유지 최대 5개.

```
pathfinder dir -o "강남역" -d "서울역"
pathfinder dir -o "판교역" -d "삼성동 코엑스" --alternatives
pathfinder dir -o 127.1086228,37.4012191 -d 127.10820,37.40262 -w "홍대입구역|신촌역" -p TIME
```

## 다중 경유지 길찾기

최대 30개의 경유지를 지정하여 경로를 탐색합니다 (POST 방식).

```
pathfinder wp -o "강남역" -d "인천공항" -w "홍대입구역|여의도역|영등포역"
```

## 미래 운행정보 길찾기

미래 특정 시각의 교통 상황을 기반으로 경로를 탐색합니다.
출발 시간은 YYYYMMDDHHMM 형식 (예: 202603170900 = 2026년 3월 17일 오전 9시).

```
pathfinder ft -o "강남역" -d "인천공항" -t 202603170900
```

## 대중교통 길찾기

ODsay API를 사용한 대중교통 (버스+지하철) 경로 탐색입니다.

```
pathfinder transit -o "다산순환로 171" -d "강남대로 465"
pathfinder pt -o "강남역" -d "서울역" -m subway
pathfinder pt -o "판교역" -d "홍대입구역" --opt 1
```

**transit 전용 옵션:**
- `-m, --mode <mode>`: 교통수단 필터 (`all`, `subway`, `bus`) (기본: all)
- `--opt <opt>`: 정렬 기준 (0=추천, 1=최소환승, 2=최소도보, 3=무환승) (기본: 0)

## 자동차 길찾기 공통 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| -p, --priority | 경로 우선순위: RECOMMEND, TIME, DISTANCE | RECOMMEND |
| --avoid | 회피: ferries, toll, motorway, schoolzone, uturn (파이프로 구분) | - |
| --alternatives | 대안 경로 포함 | false |
| --road-details | 상세 도로 정보 포함 | false |
| --car-type | 차량 종류 | 1 |
| --car-fuel | 연료 종류: GASOLINE, DIESEL, LPG | GASOLINE |
| --car-hipass | 하이패스 장착 여부 | false |
| --summary | 요약만 반환 | false |
| --json | JSON 원본 출력 | false |

## JSON 출력

모든 길찾기 명령에 `--json` 플래그를 추가하면 API 원본 응답을 JSON으로 출력합니다.

```
pathfinder dir -o "강남역" -d "서울역" --json | jq '.routes[0].summary'
pathfinder pt -o "강남역" -d "서울역" --json | jq '.result.path[0].info'
```

## 설치

```
npm install -g @unlimiting/pathfinder
```

리포지토리: https://github.com/unlimiting-studio/pathfinder
