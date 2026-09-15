# Save Our Planet Camp

เว็บนิทรรศการภาพสำหรับค่ายนักเรียน ใช้แนวคิด **Same place, new perspective** และให้เด็กเลือก Creative Lens ก่อน Remix หรือสร้างภาพ

## สิ่งที่มีใน MVP นี้

- Responsive long-scroll สำหรับมือถือ, iPad และ desktop
- Hero carousel จากภาพปก 6 ภาพ
- 4 collection จากชุด PowerPoint: งานวัด, ภาพดัง, ผลงานนักเรียน, มุมมอง
- Gallery เต็มหน้าจอ, swipe ภายใน collection, counter และ thumbnail strip
- Remix panel พร้อม starter prompt, quick edits และ source image
- Creative Lenses 3 กลุ่มจาก reference card
- Chat Mode และ Template Mode
- ผลงานของฉันเก็บใน localStorage ของเครื่องผู้ใช้
- API routes ฝั่ง server พร้อม mock preview สำหรับทดสอบ flow โดยไม่ใช้เครดิต

## รันในเครื่อง

```bash
npm install
cp .env.example .env
npm run dev
```

เปิด `http://localhost:3000`

## เปลี่ยนเนื้อหาแบบ Template

เว็บแยกข้อมูลออกจาก component ไว้แล้ว เวลาจะเปลี่ยนหัวข้อนิทรรศการให้แก้เฉพาะไฟล์เหล่านี้:

- ภาพจริงของเว็บ: วางใน `public/content/<collection>/`
- ชื่อภาพ, คำบรรยาย, คำถามชวนคิด, Theme และ Starter Prompt: แก้ใน `content/categories.json`
- ภาพปกหน้าแรกและลำดับ Carousel: แก้ใน `content/hero.json`
- รายการ Creative Lenses: แก้ใน `content/creative-lenses.json`
- หัวข้อประเด็นหลัก: แก้ใน `content/themes.json`

หลังเปลี่ยนภาพหรือข้อความ ให้ตรวจจำนวนไฟล์และแก้ `content/CONTENT_LOCK.md` ให้ตรงกับชุดใหม่ด้วย ไม่ต้องแก้ `app/page.tsx` เว้นแต่ต้องการเปลี่ยนเส้นทางการใช้งาน

ข้อมูล Creative Lenses อยู่ที่ `content/creative-lenses.json` และภาพ reference อยู่ที่ `public/content/references/creative-lenses.png`

## สำรองขึ้น GitHub

ไฟล์สำคัญที่ควรสำรองคือ `app/`, `lib/`, `content/`, `public/content/`, `package.json`, `package-lock.json`, `Dockerfile`, `docker-compose.yml`, `Caddyfile` และเอกสาร README ต่าง ๆ

ไฟล์ที่ไม่ควรขึ้น GitHub ได้แก่ `.env`, `.env.local`, `data/`, `output/`, `tmp/`, `.next/` และ `node_modules/` เพราะอาจมีคีย์, ไฟล์ชั่วคราว หรือไฟล์ภาพสร้างซ้ำอยู่ในนั้น

## หมายเหตุเรื่อง AI

ถ้ายังไม่ตั้งค่า key/model API จะใช้ preview mode เพื่อทดสอบการเรียนรู้และ UX โดยไม่เสียเครดิต เมื่อกรอก model ID และ API key ใน `.env` แล้ว server จะเรียก OpenRouter ตาม provider contract เดิม

ดูขั้นตอน deploy จริงที่ [README_DEPLOY.md](README_DEPLOY.md)

ดูสถานะและ checkpoint ของงานที่ [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
