# 📚 本棚 (Hondana) - Manga & Novel Tracker

โปรเจกต์นี้คือเว็บแอปพลิเคชันสำหรับจัดการและติดตามการอ่านและสะสมมังงะ/ไลท์โนเวลส่วนตัว ออกแบบมาเพื่อแก้ปัญหาของนักสะสม เช่น การซื้อหนังสือซ้ำ, การลืมว่าอ่านถึงเล่มไหน, หรือการติดตามเล่มที่ขาดหายไปบนชั้นหนังสือ

---

## ✨ Features (ฟีเจอร์เด่น)

- **Edition-Based Tracking:** ระบบแยก "การอ่าน" (อิงตามต้นฉบับ/ญี่ปุ่น) และ "การสะสม" (อิงตามเล่มพิมพ์ไทย) ออกจากกันอย่างอิสระ รองรับการเก็บมังงะแบบ Big Book, เล่มพิเศษ, หรือ E-Book ในซีรีส์เดียวกัน
- **Segmented Gap Visualization:** ระบบ Progress Bar แบบแบ่งช่อง ช่วยให้มองเห็น "ช่องโหว่" หรือเล่มที่ขาดไปจากการสะสมได้ทันทีด้วยตาเปล่า
- **Advanced Filtering & Search:** ระบบค้นหาและคัดกรองตามสถานะ (เช่น กำลังสะสม, อ่านจบแล้ว, สายดอง) และประเภทของหนังสือ
- **Hybrid Data Structure:** ใช้สถาปัตยกรรมแบบ Hybrid (SQL + JSON) บน SQLite เพื่อความยืดหยุ่นในการเก็บข้อมูล Log การอ่านที่ซับซ้อนโดยยังคงประสิทธิภาพการสืบค้น
- **Muted Pastel Dark Theme:** ดีไซน์ Dark Mode ในโทนพาสเทลถนอมสายตา พร้อมระบบ Badges ที่ช่วยแยกแยะประเภทหนังสือได้อย่างรวดเร็ว
- **Responsive View:** สลับมุมมองได้ทั้งแบบ Grid (เน้นภาพรวม) และ List (เน้นการตรวจสอบเล่มที่ขาด)

---

## 🛠️ Tech Stack (เทคโนโลยีที่ใช้)

**Frontend:**
- [React](https://reactjs.org/) (Vite)
- [Zustand](https://github.com/pmndrs/zustand) (State Management)
- Custom CSS (Modern CSS with Flexbox/Grid)
- React-Hot-Toast (Notifications)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (High-performance SQLite wrapper)

**Infrastructure:**
- Docker & Docker Compose

---

## 🚀 Getting Started (วิธีติดตั้งและรันโปรเจกต์)

### วิธีที่ 1: รันด้วย Docker (แนะนำ)
1. โคลนโปรเจกต์
   ```bash
   git clone https://github.com/nex1a1/Book-Tracker.git
   cd Book-Tracker
   ```
2. รันคำสั่ง Build และ Start คอนเทนเนอร์:
   ```bash
   docker compose up -d --build
   ```
3. เข้าใช้งานผ่าน Browser:
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)

### วิธีที่ 2: รันแบบ Manual (สำหรับ Development)
**Backend:**
1. `cd backend`
2. `npm install`
3. `npm run dev` (Backend จะรันที่พอร์ต 3001)

**Frontend:**
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Frontend จะรันที่พอร์ต 5173)

---

## 📂 Project Structure (โครงสร้างไฟล์)
```text
Book-Tracker/
├── backend/
│   ├── data/               # เก็บไฟล์ฐานข้อมูล manga.db
│   ├── src/
│   │   └── index.js        # Express API & SQLite Logic
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # UI Components & Application Logic
│   │   └── index.css       # Stylesheet (Pastel Dark Theme)
│   ├── vite.config.js      # Proxy configuration สำหรับเชื่อมต่อ Backend
│   └── Dockerfile
└── docker-compose.yml      # การตั้งค่า Multi-container setup
```

---

## ⚠️ ข้อควรระวัง
หากมีการปรับโครงสร้างตาราง (Schema) ในโค้ด และต้องการให้เห็นผลทันที:
1. ปิดคอนเทนเนอร์ด้วย `docker compose down`
2. ลบไฟล์ `backend/data/manga.db` เดิมทิ้ง
3. รันขึ้นมาใหม่ด้วย `docker compose up -d` ระบบจะสร้าง Database ใหม่พร้อม Schema ล่าสุดให้โดยอัตโนมัติ

Developed with 💻 & ☕ by NEx1A