# 卍 Manga Tracker - ระบบบันทึกและติดตามสะสมมังงะและนิยายครบวงจร

**Manga Tracker** เป็นแอปพลิเคชัน Full-stack ประสิทธิภาพสูงที่ออกแบบมาสำหรับผู้รักการอ่านและการสะสมมังงะ (Manga), นิยาย (Novel) และไลท์โนเวล (Light Novel) โดยเฉพาะ ตัวระบบมุ่งเน้นเรื่อง **ความถูกต้องและความสมบูรณ์ของข้อมูล (Data Integrity)** ผ่านการออกแบบฐานข้อมูลเชิงสัมพันธ์แบบ Normalized (SQLite), ระบบจัดการช่วงเล่มด้วย Algorithm พิเศษ (Symmetric Range Merging), ความปลอดภัยของ API ด้วยการ Proxy และการตรวจสอบข้อมูลผ่าน Zod รวมถึงแยกการติดตามประวัติการอ่านออกจากการบันทึกหนังสือสะสม (เล่มจริง/ดิจิทัล) อย่างเป็นระบบ

---

## 🌟 คุณสมบัติเด่นของระบบ (Key Features)

### 1. ระบบบันทึกความคืบหน้าแบบสองชั้น (Dual-Layer Tracking)
ระบบแยกการติดตามหนังสือออกเป็น 2 ชั้นอย่างอิสระเพื่อให้สะท้อนสถานะจริงอย่างละเอียดที่สุด:
- **ประวัติการอ่าน (Reading Logs):** บันทึกช่วงเล่มที่อ่านแล้ว เช่น "เนื้อเรื่องหลัก (Main Story)" และ "ภาคแยก (Side Stories)"
- **คลังหนังสือสะสม (Collection Logs):** บันทึกจำนวนเล่มที่มีในครอบครอง โดยรองรับการแยกรูปแบบการสะสม (เล่มปกติ, Special Edition, E-Book) เพื่อไม่ให้สับสนในการเช็คชั้นหนังสือ

### 2. ค้นหาข้อมูลอัตโนมัติผ่าน MyAnimeList API Proxy
- **Automated Metadata:** ค้นหาชื่อมังงะ/นิยายเพื่อดึงรูปปก, ชื่อผู้แต่ง (Authors), ปีที่ตีพิมพ์ และสถานะจาก MyAnimeList มาใส่ในฟอร์มโดยอัตโนมัติ
- **Secure Backend Proxy:** ฝั่ง Server ทำหน้าที่เป็น Proxy ปลอดภัยสูงเพื่อเรียกใช้ MAL API โดยช่วยซ่อน Client ID ของระบบจากฝั่ง Client และแก้ไขปัญหา CORS ในตัว

### 3. การออกแบบฐานข้อมูลแบบ Normalized Database & SQL Transactions
- **Data Normalization:** แยกตารางผู้แต่ง (`authors`) และตารางสำนักพิมพ์ (`publishers`) เป็นเอกเทศ เพื่อลดการซ้ำซ้อนของข้อมูลและเพิ่มประสิทธิภาพในการค้นหาและจัดหมวดหมู่
- **Transactional Consistency:** ทุกการแก้ไขและสร้างข้อมูลที่เกี่ยวข้องกับความสัมพันธ์แบบหลายชั้น จะทำงานภายใต้ `db.transaction()` เพื่อให้มั่นใจว่าการบันทึกข้อมูลจะสำเร็จทั้งหมดหรือล้มเหลวร่วมกัน (All-or-Nothing) ป้องกันปัญหาข้อมูลขยะค้างในระบบ
- **Performance Optimized:** มีการทำ Database Indexing บน Column ที่สำคัญ เช่น `title`, `type`, `status` เพื่อให้การค้นหาและฟิลเตอร์ข้อมูลทำได้อย่างรวดเร็วแม้จะมีปริมาณข้อมูลมาก

### 4. อัลกอริทึมรวมช่วงเล่มแบบสมมาตร (Symmetric Range Merging)
- **Auto-Consolidation:** ระบบจะจัดเรียงและย่อยช่วงเล่มที่กรอกซ้ำซ้อนหรือติดกันให้อยู่ในรูปแบบที่สั้นที่สุดโดยอัตโนมัติ (เช่น หากกรอกเล่ม `[1-5]`, `[6-10]` และ `[9-12]` ระบบจะรวมเป็นช่วง `[1-12]` ให้ทันที)
- **Symmetric Merge:** อัลกอริทึมทำงานอย่างสอดคล้องกันทั้งฝั่ง Frontend (เพื่อการแสดงผลและโต้ตอบที่ลื่นไหล) และฝั่ง Backend (เพื่อให้มั่นใจเรื่องความถูกต้องก่อนบันทึกลงฐานข้อมูล)

### 5. การตรวจสอบข้อมูลอย่างเข้มงวดด้วย Zod & ความปลอดภัย
- **Zod Schema Validation:** ตรวจสอบโครงสร้างและชนิดของข้อมูลในทุก ๆ API Request (ทั้ง `POST` และ `PATCH`) เพื่อป้องกันไม่ให้ข้อมูลผิดพลาดถูกบันทึกลงใน Database
- **Premium UI/UX:** หน้าเว็บที่พัฒนาด้วย React 18 และ Vanilla CSS ที่จัดแต่งสีสันและรูปแบบอย่างประณีต (Harmony Theme) รองรับการแสดงผลแบบ Grid และ List, มี Sidebar ค้นหาและกรองที่ทำงานแบบตอบสนองทันที และระบบช่วยเติมคำอัติโนมัติ (Autocomplete) 

---

## 🏗️ เทคโนโลยีที่เลือกใช้ (Technical Stack)

- **Frontend:**
  - React 18 (Vite)
  - Zustand (State Management ประสิทธิภาพสูง ไร้ Boilerplate)
  - Axios (Client API Layer)
  - Vanilla CSS (เขียน CSS ควบคุมโครงสร้างด้วยตัวแปรร่วมและการแบ่งสัดส่วนตาม Feature)
- **Backend:**
  - Node.js (Express)
  - `better-sqlite3` (SQLite Driver ภาษา JavaScript ที่ทำงานแบบ Synchronous และเร็วที่สุด)
  - Zod (ระบบตรวจสอบ Schema และ Validation)
- **Database:**
  - SQLite (Normalized relational database)
- **DevOps:**
  - Docker & Docker Compose (พร้อมสำหรับการรันแอปพลิเคชันอย่างเป็นระเบียบ)

---

## 📂 โครงสร้างของโปรเจกต์ (Directory Structure)

```text
├── backend/
│   ├── data/                 # ที่เก็บไฟล์ฐานข้อมูล SQLite (เช่น manga.db)
│   ├── src/
│   │   ├── config/           # db.js (เชื่อมต่อ DB), env.js (ดึงค่า Env)
│   │   ├── controllers/      # ควบคุม Logic (seriesController, metadataController, malController)
│   │   ├── middleware/       # validate.js (Middleware ตรวจ Zod Payload)
│   │   ├── routes/           # ประกาศเส้นทาง API (index.js)
│   │   ├── utils/            # mapper.js (SQL Hydration/Merge), validation.js (Zod Schema), migration.js
│   │   └── index.js          # จุดเริ่มต้นการทำงานของ Express Server
│   ├── Dockerfile
│   ├── package.json          # สคริปต์รันระบบฝั่ง Server ("dev", "seed", "start")
│   └── .env                  # การตั้งค่าพอร์ต, คีย์ MAL และเส้นทางไฟล์ DB
│
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios config และตัวเรียกฝั่ง Backend (seriesApi.js)
│   │   ├── components/       # Icons.jsx, SharedUI.jsx, SharedUI.css (UI พื้นฐานและตัวเลือกดาว)
│   │   ├── features/         # จัดกลุ่มโมดูลของ UI
│   │   │   ├── series/       # การแสดงการ์ดซีรีส์ (SeriesCard.jsx, SeriesCard.css)
│   │   │   ├── filters/      # แถบตัวกรองและกล่องค้นหา (FilterSidebar.jsx, FilterSidebar.css)
│   │   │   └── modals/       # หน้าต่างเพิ่ม/แก้ไขซีรีส์และรายละเอียด (Modals.jsx, Modals.css)
│   │   ├── hooks/            # useFilteredSeries.js (สกัดการคำนวณและกรองข้อมูลการค้นหา)
│   │   ├── store/            # useSeriesStore.js (Zustand Global State)
│   │   ├── utils.js          # อัลกอริทึมช่วงเล่ม, คำนวณสถิติ และการแปลงเป็นภาษาไทย
│   │   ├── App.jsx           # โครงสร้างหน้าหลักและจัดวาง Sidebar
│   │   └── main.jsx          # จุดติดตั้ง React App
│   ├── Dockerfile
│   ├── package.json          # สคริปต์รันระบบฝั่ง Client ("dev", "build", "preview")
│   └── vite.config.js
│
├── docker-compose.yml        # ตัวประสาน Containers ทั้ง Full-Stack
├── README.md                 # คู่มือแนะนำการใช้งานระบบและการติดตั้ง [ไฟล์นี้]
└── Skill.md                  # คู่มือสเปกแบบเจาะลึกสำหรับการรันคำสั่งและการแก้ไขโครงสร้างโค้ด
```

---

## 📊 โครงสร้างฐานข้อมูลเชิงสัมพันธ์ (Database Schema)

ตารางทั้งหมดถูกทำ Normalization เพื่อรักษาประสิทธิภาพและลดความซ้ำซ้อนของข้อมูล:

```mermaid
erDiagram
    authors ||--o{ series : "writes"
    publishers ||--o{ series : "publishes"
    series ||--o{ reading_groups : "has"
    reading_groups ||--o{ reading_ranges : "contains"
    series ||--o{ collection_groups : "has"
    collection_groups ||--o{ collection_ranges : "contains"

    authors {
        int id PK
        text name "UNIQUE"
    }
    publishers {
        int id PK
        text name "UNIQUE"
    }
    series {
        int id PK
        text title
        text type "manga/novel/light_novel"
        int publishYear
        int endYear
        text status "ongoing/completed/hiatus/cancelled"
        int isCollecting "0 or 1"
        real rating
        text imageUrl
        text notes
        int author_id FK
        int publisher_id FK
        datetime createdAt
        datetime updatedAt
    }
    reading_groups {
        int id PK
        int series_id FK
        text title
        int totalVolumes
    }
    reading_ranges {
        int id PK
        int group_id FK
        int startVol
        int endVol
    }
    collection_groups {
        int id PK
        int series_id FK
        text title
        int totalVolumes
    }
    collection_ranges {
        int id PK
        int group_id FK
        int startVol
        int endVol
    }
```

### ดัชนีประสิทธิภาพเพื่อเร่งความเร็วในการเรียกดู (Database Indexes)
- `idx_series_title` ทำบนตาราง `series(title)`
- `idx_series_type_status` ทำบนตาราง `series(type, status)`
- `idx_series_author_id` ทำบนตาราง `series(author_id)`
- `idx_series_publisher_id` ทำบนตาราง `series(publisher_id)`

---

## 🔌 API Reference (ระบบการสื่อสารผ่านเครือข่าย)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/series` | ค้นหาและดึงข้อมูลหนังสือ (กรองตามคำค้นหา, ประเภท, สถานะ และการเรียงลำดับ) |
| **POST** | `/api/series` | เพิ่มหนังสือใหม่เข้าระบบ (เชื่อมสัมพันธ์กับผู้แต่ง/สำนักพิมพ์แบบ Transactional) |
| **PATCH** | `/api/series/:id` | แก้ไขข้อมูลหนังสือหรือรายการเล่มอ่าน/สะสม (รวมช่วงเล่มใหม่และบันทึกข้อมูลอย่างปลอดภัย) |
| **DELETE** | `/api/series/:id` | ลบหนังสือ (ตารางความสัมพันธ์อื่น ๆ ของหนังสือจะถูกลบแบบอัตโนมัติผ่าน Cascade) |
| **GET** | `/api/series/stats` | สรุปสถิติทั้งหมดในระบบ เช่น จำนวนซีรีส์, จำนวนเล่มที่อ่านแล้ว และจำนวนตามประเภท |
| **GET** | `/api/authors` | ดึงรายชื่อผู้แต่งที่มีทั้งหมดในระบบ (ไม่มีชื่อซ้ำ) |
| **GET** | `/api/publishers` | ดึงรายชื่อสำนักพิมพ์ที่มีทั้งหมดในระบบ (ไม่มีชื่อซ้ำ) |
| **GET** | `/api/mal/search` | ค้นหาข้อมูลและดาวน์โหลดรูปหน้าปกจาก MyAnimeList API ผ่าน Proxy ฝั่ง Server |

---

## 🛠️ ขั้นตอนการติดตั้งและใช้งาน (Installation & Setup)

### 1. การกำหนดสภาพแวดล้อม (Environment Configuration)
สร้างไฟล์ชื่อ `.env` ภายในโฟลเดอร์ `/backend` และเพิ่มค่ากำหนดดังนี้:
```env
PORT=3001
MAL_CLIENT_ID=กรอก_client_id_จาก_myanimelist_ตรงนี้
DB_PATH=data/manga.db
```

---

### วิธีที่ 1: การรันผ่าน Docker (แนะนำและรวดเร็วที่สุด)
ระบบพร้อมใช้งานด้วย Container ทันที ไม่จำเป็นต้องติดตั้งไลบรารีอื่นในเครื่องของคุณเพิ่มเติม:
```bash
# สั่งประกอบและรันตัวบริการทั้ง Backend และ Frontend ในคำสั่งเดียว
docker-compose up --build
```
- **Backend Service:** ทำงานที่ `http://localhost:3001`
- **Frontend App:** เข้าชมได้ที่ `http://localhost:5174`

---

### วิธีที่ 2: รันแยกฝั่งสำหรับการพัฒนา (Local Development Server)

#### ขั้นตอนสำหรับฝั่ง Backend
1. เปิด Terminal ในโฟลเดอร์ `backend` แล้วเรียกใช้คำสั่งติดตั้ง Dependencies:
   ```bash
   cd backend
   npm install
   ```
2. ใส่ข้อมูลทดสอบเริ่มต้นเข้าระบบเพื่อตรวจสอบคุณสมบัติ (Optional):
   ```bash
   npm run seed
   ```
3. สั่งรัน Server สำหรับงานพัฒนา (ทำงานร่วมกับ `nodemon` คอยตรวจจับเมื่อโค้ดเปลี่ยนเพื่อรีสตาร์ท):
   ```bash
   npm run dev
   ```

#### ขั้นตอนสำหรับฝั่ง Frontend
1. เปิด Terminal แยกอีกตัวในโฟลเดอร์ `frontend` แล้วสั่งติดตั้งไลบรารี:
   ```bash
   cd frontend
   npm install
   ```
2. สั่งรันแอปพลิเคชัน React ผ่านเครื่องมือพัฒนา Vite:
   ```bash
   npm run dev
   ```
3. เปิดเบราว์เซอร์ไปที่ลิงก์ที่แสดงอยู่บน Terminal (ตามค่ามาตรฐานคือ `http://localhost:5174`)

---

## 🎯 แผนงานในอนาคต (Roadmap)
- [ ] **Dashboard / Analytics:** หน้าวิเคราะห์ข้อมูลสรุปแบบกราฟิกสวยงาม แสดงแนวโน้มการอ่านรายเดือน อัตราการสะสมหนังสือ และงบประมาณ/เล่มที่สะสม
- [ ] **Batch Import & Export:** ความสามารถในการอัปโหลดไฟล์ Excel / CSV หรือ JSON เพื่อนำเข้าห้องสมุดของคุณอย่างรวดเร็ว หรือดาวน์โหลดเก็บไว้เป็น Backup
- [ ] **Multi-User Accounts:** พัฒนาระบบลงทะเบียนผู้ใช้และเข้าสู่ระบบด้วย JWT เพื่อรองรับการสะสมแยกบัญชีกัน

---

## 📝 สัญญาอนุญาตการใช้งาน (License)
โปรเจกต์นี้เป็นลิขสิทธิ์ส่วนบุคคลพัฒนาขึ้นโดย NEx1A อนุญาตให้นำไปดัดแปลง ใช้งาน และศึกษาเพื่อการใช้งานในชีวิตประจำวันได้อย่างเสรี
