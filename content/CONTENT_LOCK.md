# Content lock · Save Our Planet Camp

สถานะ: ล็อกชุดภาพและข้อความสำหรับ MVP รอบ Preview เมื่อ 14 กันยายน 2026

## แหล่งภาพที่ล็อกแล้ว

| ชุด | ไฟล์ต้นฉบับ | จำนวน | ไฟล์ในเว็บ |
| --- | --- | ---: | --- |
| งานวัด | `C:\Users\chanon\Desktop\นำเสนอcamp\01.งานวัด.pptx` | 8 | `public/content/fair/` |
| ภาพดัง | `C:\Users\chanon\Desktop\นำเสนอcamp\02.ภาพดัง.pptx` | 7 | `public/content/famous/` |
| ผลงานนักเรียน | `C:\Users\chanon\Desktop\นำเสนอcamp\03.ผลงานนักเรียน.pptx` | 10 | `public/content/student-work/` |
| มุมมอง | `C:\Users\chanon\Desktop\นำเสนอcamp\04.มุมมอง.pptx` | 11 | `public/content/perspectives/` |

รวมภาพในนิทรรศการ 36 ภาพ ไม่มี ID ซ้ำ และไม่มีไฟล์ภาพหาย

ภาพเด่นที่แสดงก่อนในหน้า Preview ถูกกำหนดไว้ใน `featuredImageIds` ของแต่ละหมวด หมวดละ 4 ภาพ เพื่อให้การคัดเลือกเป็นข้อมูลที่ตรวจสอบได้

- งานวัด: `fair-01`, `fair-02`, `fair-03`, `fair-04`
- ภาพดัง: `famous-01`, `famous-02`, `famous-03`, `famous-04`
- ผลงานนักเรียน: `student-01`, `student-02`, `student-03`, `student-04`
- มุมมอง: `perspective-01`, `perspective-02`, `perspective-03`, `perspective-04`

## ลำดับรูปปกที่ล็อกแล้ว

ไฟล์ต้นฉบับ: `D:\Shiseido Camp 2026\ปก 6 รูป.pptx`

1. `fair-07` · เมื่อพลาสติกขึ้นเวที
2. `famous-01` · ภาพคุ้นตา มุมมองใหม่
3. `famous-05` · ทะเลที่เราสร้างขึ้น
4. `famous-06` · อนุสาวรีย์ของการเลือก
5. `perspective-03` · ภาพที่โลกจะจำเรา
6. `fair-08` · วงจรที่เกือบปิด

ลำดับนี้ตรงกับ `content/hero.json` และใช้เป็นภาพ Carousel หน้าแรก

## กติกาเนื้อหา

- ชื่อหมวดในเว็บต้องตรงกับชื่อชุดต้นฉบับ 4 ชุด
- ป้าย Theme ใช้ 4 ค่าเท่านั้น: `Waste & Materials`, `Water`, `Energy & Heat`, `Green Space & Living Things`
- ป้าย Creative Lens ใช้เฉพาะ 12 เลนส์จากแผ่น Creative Lenses ใน `public/content/references/creative-lenses.png`
- ชื่อภาพ คำบรรยาย คำถามชวนคิด และ Starter Prompt ใน `categories.json` เป็นข้อความบรรณาธิการของ MVP รอบนี้
- หากมีการเปลี่ยนภาพหรือข้อความภายหลัง ให้แก้ `categories.json`, `hero.json` และไฟล์ล็อกนี้พร้อมกัน
