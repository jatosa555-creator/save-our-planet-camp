# Deploy บน VPS

เอกสารนี้เป็น runbook สำหรับ production เบื้องต้นของเว็บค่าย

## 1. เตรียม VPS

- Ubuntu ที่ติดตั้ง Docker และ Docker Compose plugin
- เปิดเฉพาะ SSH, HTTP (80) และ HTTPS (443)
- ชี้ DNS ของ domain/subdomain มาที่ public IP ของ VPS
- ติดตั้ง Caddy บนเครื่อง host หรือใช้ reverse-proxy container แยก

เว็บ container bind เฉพาะ `127.0.0.1:3000` จึงไม่เปิด Next.js ตรงสู่อินเทอร์เน็ต

## 2. ติดตั้งแอป

```bash
git clone <your-repository-url> camp-web
cd camp-web
cp .env.example .env
```

แก้ `.env` อย่างน้อย:

```env
NEXT_PUBLIC_APP_URL=https://camp.example.com
OPENROUTER_API_KEY=replace_me
IMAGE_MODEL_DEFAULT=openai/gpt-image-2.5-flare
IMAGE_MODEL_PREMIUM=openai/gpt-image-2.5-flare
TEXT_MODEL=openai/gpt-6-astra
TEXT_REASONING_EFFORT=low
APP_ADMIN_PASSWORD=replace_me
```

อย่า commit `.env` และอย่าใส่ API key ใน client-side code

## 3. Caddy

คัดลอก `Caddyfile` ไปยัง config ของ Caddy แล้วเปลี่ยน domain:

```caddyfile
camp.example.com {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
```

Caddy จะขอและต่ออายุ HTTPS certificate ให้เอง เมื่อ DNS ชี้ถูกและพอร์ต 80/443 เข้าถึงได้

## 4. Start / restart / logs

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f camp-web
docker compose restart camp-web
curl https://camp.example.com/api/health
```

## 5. Persistence และ backup

ข้อมูลที่ควร backup อยู่ใน Docker volume `camp-data` ซึ่ง mount ที่ `/data` ใน container

```bash
docker run --rm -v camp-web_camp-data:/data -v "$PWD":/backup alpine tar czf /backup/camp-data.tgz -C /data .
```

ภาพที่สร้างจริงควรอยู่ใน `/data/generated/` และ gallery metadata ใน `/data/gallery/` เมื่อเปิด persistence เต็มรูปแบบ

## 6. Update / rollback

```bash
git pull
docker compose up -d --build
```

ก่อน update ให้ backup `/data` หากต้องการ rollback ให้ checkout commit ก่อนหน้า แล้วรัน `docker compose up -d --build` อีกครั้ง

## 7. Pilot checks

- เปิด URL ด้วย iPhone/Android และ iPad Safari
- สแกน QR จากเครื่องจริง
- ตรวจว่า `OPENROUTER_API_KEY` ไม่ปรากฏใน browser source หรือ network request
- ทดลอง swipe gallery และ Remix mode
- ทดลอง download บน Safari iOS
- ทดลอง restart container แล้วตรวจว่าไฟล์ใน `/data` ยังอยู่
- ตรวจ `/api/health` และ log เมื่อ provider timeout

## 8. Resource guardrails

ตั้งค่าเริ่มต้นใน `.env`:

```env
GENERATED_IMAGE_RETENTION_DAYS=7
MAX_CONCURRENT_GENERATIONS=4
MAX_GENERATIONS_PER_SESSION=5
```

VPS ทำหน้าที่เป็น web/API/storage layer เท่านั้น ส่วน image inference เกิดที่ OpenRouter
