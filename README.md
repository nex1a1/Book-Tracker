# 📚 Manga Tracker

ระบบบันทึกการอ่านและการซื้อมังงะ, นิยาย, Light Novel

## Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB 7
- **Container**: Docker Compose

## Getting Started

### 1. Copy .env
```bash
cp .env.example .env
# แก้ไข MONGO_USER, MONGO_PASSWORD ตามต้องการ
```

### 2. Run
```bash
docker-compose up --build
```

### Services
| Service       | URL                        | หมายเหตุ              |
|---------------|----------------------------|-----------------------|
| Frontend      | http://localhost:5173      |                       |
| Backend API   | http://localhost:3001/api  |                       |
| Mongo Express | http://localhost:8081      | GUI สำหรับดู Database |

## API Endpoints

### Series
| Method | Path                   | คำอธิบาย                        |
|--------|------------------------|----------------------------------|
| GET    | /api/series            | ดูรายการทั้งหมด (มี filter)     |
| GET    | /api/series/stats      | สถิติรวม                         |
| GET    | /api/series/:id        | ดูรายละเอียด                     |
| POST   | /api/series            | เพิ่มเรื่องใหม่                  |
| PATCH  | /api/series/:id        | แก้ไข                            |
| DELETE | /api/series/:id        | ลบ                               |

### Query Parameters (GET /api/series)
- `page`, `limit` — pagination
- `type` — `manga` | `novel` | `light_novel`
- `status` — `ongoing` | `completed` | `hiatus` | `cancelled`
- `isCollecting` — `true` | `false`
- `search` — ค้นหาจากชื่อเรื่องหรือชื่อผู้แต่ง

## Series Schema

```ts
{
  title: string            // ชื่อเรื่อง
  author: string           // ผู้แต่ง
  type: "manga" | "novel" | "light_novel"
  publishYear?: number     // ปีที่ตีพิมพ์
  status: "ongoing" | "completed" | "hiatus" | "cancelled"

  lastReadVolume: number   // อ่านถึงเล่มไหน
  lastReadChapter?: number // อ่านถึงตอนไหน

  lastBoughtVolume: number // ซื้อถึงเล่มไหน
  boughtFormat: "normal" | "bigbook" | "pocket" | "digital" | "omnibus"

  isCollecting: boolean    // เก็บสะสม vs อ่านเฉยๆ

  totalVolumes?: number    // จำนวนเล่มรวม
  coverImage?: string
  notes?: string
  tags?: string[]
}
```