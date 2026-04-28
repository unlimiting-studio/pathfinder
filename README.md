# pathfinder

한국 길찾기 CLI 입니다. 카카오 모빌리티(자동차)와 ODsay(대중교통) API를 사용하며, 주소·장소명·좌표 모두 지원합니다.

## 설치

```bash
# 글로벌 설치
npm install -g @unlimiting/pathfinder
pnpm add -g @unlimiting/pathfinder
yarn global add @unlimiting/pathfinder

# 설치 없이 실행
npx @unlimiting/pathfinder <command>
pnpm dlx @unlimiting/pathfinder <command>

# 또는 소스에서 빌드
git clone https://github.com/unlimiting-studio/pathfinder.git
cd pathfinder
npm install
npm run build
```

## 시작하기

두 종류의 API 키가 필요합니다:
- **카카오 REST API 키**: 자동차 길찾기 + 주소/장소 검색에 사용 (모든 명령에 필요)
- **ODsay API 키**: 대중교통 길찾기(`transit`)에만 필요

```bash
# API 키 등록
pathfinder login kakao
pathfinder login odsay

# 상태 확인
pathfinder status

# 키 삭제
pathfinder logout [kakao|odsay]
```

키는 `~/.pathfinder/config.json`에 저장됩니다.

## 사용법

### 자동차 길찾기 (`car`)

출발지 → 도착지, 최대 5개 경유지.

```bash
pathfinder car -o "강남역" -d "서울역"
pathfinder car -o "판교역" -d "삼성동 코엑스" --alternatives
pathfinder car -o 127.0281573,37.4979462 -d 126.9726378,37.5546788 -p TIME
```

### 다중 경유지 길찾기 (`waypoint`, 별칭 `wp`)

최대 30개 경유지.

```bash
pathfinder waypoint -o "강남역" -d "인천공항" -w "홍대입구역|여의도역|영등포역"
pathfinder wp -o "강남역" -d "서울역" -w "홍대입구역"
```

### 미래 운행정보 길찾기 (`future`, 별칭 `ft`)

출발 시간은 `YYYYMMDDHHMM` 형식.

```bash
pathfinder future -o "강남역" -d "인천공항" -t 202603170900
pathfinder ft -o "강남역" -d "서울역" -t 202603170900
```

### 대중교통 길찾기 (`transit`, 별칭 `ts`)

ODsay API 기반 (버스 + 지하철).

```bash
pathfinder transit -o "강남역" -d "서울역"
pathfinder ts -o "강남역" -d "서울역" -m subway
pathfinder ts -o "판교역" -d "홍대입구역" --opt 1
```

`transit` 전용 옵션:

| 옵션 | 설명 |
|------|------|
| `-m, --mode` | 교통수단 필터: `all`, `subway`, `bus` (기본 `all`) |
| `--opt` | 정렬 기준: `0`=추천, `1`=최소환승, `2`=최소도보, `3`=무환승 (기본 `0`) |

### 자동차 명령 공통 옵션

`car`, `waypoint`, `future` 에서 사용할 수 있는 옵션입니다.

| 옵션 | 설명 |
|------|------|
| `-p, --priority` | 경로 우선순위: `RECOMMEND`, `TIME`, `DISTANCE` |
| `--avoid` | 회피: `ferries\|toll\|motorway\|schoolzone\|uturn` |
| `--alternatives` | 대안 경로 포함 |
| `--road-details` | 상세 도로 정보 포함 |
| `--car-type` | 차량 종류 (기본 `1`) |
| `--car-fuel` | 연료: `GASOLINE`, `DIESEL`, `LPG` |
| `--car-hipass` | 하이패스 장착 |
| `--summary` | 요약만 반환 |
| `--json` | JSON 원본 출력 |

## 위치 지정 방식

출발지/도착지/경유지는 세 가지 방식으로 지정할 수 있습니다.

1. **주소** (지번/도로명): `"서울특별시 강남구 역삼동 858"`, `"테헤란로 152"`
2. **장소명**: `"강남역"`, `"서울역"`, `"카카오 판교오피스"`
3. **좌표** (`경도,위도[,name=이름][,angle=각도]`):
   - 경도(x): `127.1086228`
   - 위도(y): `37.4012191`
   - 이름(선택): `name=서울역`
   - 각도(선택, 출발지만): `angle=90`

주소/장소명 입력 시 카카오맵 API로 자동 검색하며, 결과가 여러 개면 선택 프롬프트가 표시됩니다.

## API 키 발급

- 카카오: [카카오 디벨로퍼스](https://developers.kakao.com/)에서 앱을 생성하고 REST API 키를 발급받으세요.
- ODsay: [ODsay LAB](https://lab.odsay.com/)에서 API 키를 발급받으세요.
