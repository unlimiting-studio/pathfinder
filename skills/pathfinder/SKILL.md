---
name: pathfinder
description: 카카오 모빌리티 길찾기 API CLI. 주소/장소명/좌표로 자동차 길찾기, 다중 경유지 길찾기, 미래 운행정보 길찾기를 지원합니다.
---

Usage: pathfinder [options] [command]

카카오 모빌리티 길찾기 API CLI 도구

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  login [options]           카카오 REST API 키를 등록합니다
  status                    현재 로그인 상태를 확인합니다
  logout                    저장된 API 키를 삭제합니다
  directions|dir [options]  자동차 길찾기 (출발지 → 도착지, 최대 5개 경유지)
  waypoints|wp [options]    다중 경유지 길찾기 (최대 30개 경유지, POST)
  future|ft [options]       미래 운행정보 길찾기 (출발 시간 지정)
  help [command]            display help for command

## 인증

최초 사용 시 `pathfinder login`으로 카카오 REST API 키를 등록해야 합니다.
키는 `~/.pathfinder/config.json`에 저장됩니다.

```
pathfinder login
pathfinder login -k YOUR_API_KEY
```

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
pathfinder wp -o 127.108,37.401 -d 127.108,37.402 -w "역삼역|선릉역"
```

## 미래 운행정보 길찾기

미래 특정 시각의 교통 상황을 기반으로 경로를 탐색합니다.
출발 시간은 YYYYMMDDHHMM 형식 (예: 202603170900 = 2026년 3월 17일 오전 9시).

```
pathfinder ft -o "강남역" -d "인천공항" -t 202603170900
pathfinder ft -o "판교역" -d "서울역" -t 202603180830 --alternatives
```

## 공통 옵션

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

모든 길찾기 명령에 `--json` 플래그를 추가하면 카카오 API 원본 응답을 JSON으로 출력합니다.
파이프라인에 연결하거나 jq로 후처리할 때 유용합니다.

```
pathfinder dir -o "강남역" -d "서울역" --json | jq '.routes[0].summary'
```

## 설치

리포지토리: https://github.com/Variel/pathfinder

```
cd ~/workspace/repos/pathfinder
npm install && npm run build
# 또는 글로벌 링크
npm link
```
