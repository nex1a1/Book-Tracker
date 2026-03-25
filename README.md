# 📚 本棚 (Hondana) - Manga Tracker

โปรเจกต์นี้คือเว็บแอปพลิเคชันสำหรับจัดการและติดตามการอ่าน/สะสมมังงะและไลท์โนเวลส่วนตัว ถูกออกแบบมาเพื่อแก้ปัญหา "คำสาปนักสะสม" (Collector's Curse) เช่น การซื้อหนังสือซ้ำ, การลืมว่าอ่านถึงเล่มไหน, หรือการจำไม่ได้ว่าขาดเล่มไหนไปบ้างบนชั้นหนังสือ

> **Note:** โปรเจกต์นี้มาจากการพัฒนาและเขียนโค้ดร่วมกัน (Vide Code) โดยเน้นสถาปัตยกรรมที่ยืดหยุ่นและตอบโจทย์พฤติกรรมการสะสมหนังสือแบบแยกเวอร์ชัน (Edition-Based)

---

## ✨ Features (ฟีเจอร์เด่น)

- **Edition-Based Tracking:** แยกระบบ "การอ่าน (อิงตามต้นฉบับ JP)" และ "การสะสม (อิงตามเล่มพิมพ์ไทย)" ออกจากกันอย่างเด็ดขาด เพื่อรองรับการเก็บมังงะแบบ Big Book, เล่มพิเศษ, หรือภาคแยก
- **Segmented Gap Visualization:** ระบบ Progress Bar แบบแบ่งช่องอัจฉริยะ ช่วยให้มองเห็น "ช่องโหว่" หรือเล่มที่แหว่งไปจากการสะสมด้วยตาเปล่าทันที
- **Advanced Filtering:** ระบบคัดกรองขั้นสูงที่สามารถหาหนังสือได้จากสถานะความคืบหน้า (เช่น สายดอง, สะสมครบ, ทันปัจจุบัน, ขาดเล่ม)
- **View Toggle (Grid / List):** สลับมุมมองการแสดงผลได้ตามความถนัด
  - *Grid View:* แสดงผลแบบการ์ดสวยงาม เหมาะสำหรับดูภาพรวม
  - *List View:* แสดงผลแบบรายการกระชับ เน้นกวาดสายตาหา "เล่มที่ขาด" อย่างรวดเร็ว
- **Muted Pastel Dark Theme:** ธีมสีมืดแบบพาสเทลตุ่นๆ ถนอมสายตา และช่วยให้ป้ายกำกับ (Badges) ต่างๆ โดดเด่นขึ้นมาโดยไม่แสบตา

---

## 🛠️ Tech Stack (เทคโนโลยีที่ใช้)

**Frontend:**
- [React](https://reactjs.org/) (ผ่าน [Vite](https://vitejs.dev/))
- [Zustand](https://github.com/pmndrs/zustand) (State Management)
- Custom CSS (No UI Framework)
- React-Hot-Toast (Notifications)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (Database)
- *Architecture Note:* ใช้โครงสร้าง Hybrid (SQL + JSON) ใน SQLite เพื่อความยืดหยุ่นในการเก็บข้อมูล Log การอ่านแบบ Array โดยไม่ต้องทำ Relational Database ให้ซับซ้อน

**Infrastructure:**
- Docker & Docker Compose

---

## 🚀 Getting Started (วิธีติดตั้งและรันโปรเจกต์)

เนื่องจากโปรเจกต์นี้ถูกตั้งค่าผ่าน Docker Compose ไว้เรียบร้อยแล้ว การรันระบบจึงทำได้ง่ายมาก

### 1. โคลนโปรเจกต์
```bash
git clone <your-gitlab-repo-url>
cd manga-tracker
```
### 2. ตั้งค่า Environment Variables
ตรวจสอบไฟล์ .env ที่ root directory (ถ้าไม่มีให้สร้างขึ้นมา):

```bash
# Backend Config
PORT=3001
```
### 3. รันโปรเจกต์ด้วย Docker
รันคำสั่งด้านล่างเพื่อ Build และ Start คอนเทนเนอร์ทั้ง Frontend และ Backend:

```Bash
docker compose up -d --build
```
4. การเข้าใช้งาน

- Frontend (หน้าเว็บ): http://localhost:5173
- Backend (API): http://localhost:3001

    **ข้อควรระวังเกี่ยวกับการแก้ไข Database:** หากมีการปรับโครงสร้างตาราง (Schema) ใหม่ อย่าลืมปิดคอนเทนเนอร์ (docker compose down) และลบไฟล์ backend/data/manga.db เดิมทิ้งก่อนรันขึ้นมาใหม่ เพื่อให้ระบบสร้างฐานข้อมูลใหม่ที่ถูกต้อง

📂 Project Structure (โครงสร้างไฟล์หลัก)
```Bash
manga-tracker/
├── backend/
│   ├── data/               # โฟลเดอร์เก็บไฟล์ manga.db (ถูกสร้างอัตโนมัติ)
│   ├── src/
│   │   └── index.js        # โค้ดหลักของ Express API และ SQLite
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # โค้ดหน้าจอ React ทั้งหมด (Components, Modal, Store)
│   │   ├── index.css       # ธีม Dark Mode และ Stylesheet
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # ตั้งค่าการเชื่อมต่อ Frontend และ Backend
└── README.md
```
Developed with 💻 & ☕