# ODsay API 키 발급 가이드

## 1. ODsay Lab 회원가입

1. https://lab.odsay.com/ 에 접속
2. 오른쪽 상단 "회원가입" 클릭
3. 이메일, 비밀번호, 이름 등 입력 후 가입

## 2. 애플리케이션 등록

1. 로그인 후 "Application" → "Application 등록" 으로 이동
2. 다음 항목을 입력:
   - **Application 이름**: 원하는 이름 (최대 20자, 중복 불가)
   - **카테고리**: 서비스에 맞는 항목 선택
   - **서비스 유형**: Free 선택
   - **사용자 유형**: 개인/기업 선택
   - **플랫폼**: **반드시 "Server" 선택**

## 3. 서버 IP 주소 등록

**중요**: Server 플랫폼을 선택하면 허용할 IP 주소를 등록해야 합니다.

1. 현재 공인 IP 확인:
   ```
   curl -s https://api.ipify.org
   ```
2. 확인된 IP 주소를 플랫폼 설정에 입력
3. IP는 최대 5개까지 등록 가능
4. IP가 변경되면 ODsay Lab에서 업데이트 필요

## 4. API 키 확인

1. "My Application" → "Overview" 로 이동
2. Server 플랫폼의 **API 키**를 복사

## 5. pathfinder에 등록

```
pathfinder login odsay -k YOUR_ODSAY_API_KEY
```

또는 대화형으로:
```
pathfinder login odsay
```

## 참고

- 계정당 최대 3개 애플리케이션 등록 가능
- Free 플랜의 일일 호출 제한은 1,000회
- API 키는 플랫폼(Server, Android, iOS 등)별로 다르게 발급됨
- 키는 외부에 노출되지 않도록 주의하세요
