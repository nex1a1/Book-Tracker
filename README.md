# 卍 Manga Tracker

A high-performance, full-stack application designed for enthusiasts to track their Manga, Novel, and Light Novel collections. This project emphasizes data integrity through a normalized relational database and seamless integration with external metadata providers.

---

## 🌟 Comprehensive Features

### 1. Dual-Layer Tracking
Unlike simple trackers, this application separates **Reading Progress** from **Physical/Digital Ownership**:
- **Reading Logs:** Track exactly which volumes you've read across different story arcs (e.g., "Main Story" vs. "Side Stories").
- **Collection Logs:** Track your library ownership. Supports different formats (Normal, Special Edition, E-Book) with distinct volume tracking for each.

### 2. Intelligent Data Fetching (MAL Integration)
- **Automated Metadata:** Search for any title to instantly fetch cover art, authors, publication years, and status (Ongoing/Finished).
- **Proxy Architecture:** The backend acts as a secure proxy to the MyAnimeList API, protecting your API keys and bypassing CORS restrictions.

### 3. Advanced Relational Database
The application utilizes a fully normalized SQLite schema:
- **Relational Mapping:** Authors and Publishers are treated as unique entities, enabling consistent naming and filtering.
- **Transactional Integrity:** All updates to series and logs are wrapped in SQL transactions to ensure "all-or-nothing" data consistency.
- **Performance Optimized:** Database indexes ensure lightning-fast searching and filtering on `title`, `type`, and `status`.

### 4. Intelligent Range Merging
- **Auto-Consolidation:** Overlapping or contiguous volume ranges (e.g., `1-7` and `8-12`) are automatically merged into a single entry (`1-12`).
- **Instant UI Feedback:** Ranges are merged instantly in the browser for a clean and responsive user experience.

### 5. Robust Security & Validation
- **Zod Integration:** All API requests are strictly validated on the backend to prevent corrupted or invalid data from reaching the database.
- **Clean UI/UX:** Features dual view modes (Grid/List), real-time filtering, and smart autocomplete for metadata.

---

## 🏗️ Technical Architecture

### Modular Backend (Node.js/Express)
The backend follows a "Controller-Service" pattern for maximum maintainability:
- **`config/`**: Centralized environment and database connection logic.
- **`controllers/`**: Pure business logic, separated from route definitions.
- **`routes/`**: Clean, declarative API routing.
- **`utils/`**: Reusable data mappers, validation schemas (Zod), and migration scripts.

### Feature-Based Frontend (React)
The frontend uses a modern, scalable structure:
- **Zustand State:** Minimalist global state management.
- **Custom Hooks:** Business logic (like complex filtering/sorting) is isolated from UI components.
- **API Layer:** A dedicated service layer for all network communication.
- **Vanilla CSS:** Component-scoped styling without the overhead of heavy CSS frameworks.

---

## 📊 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/series` | `GET` | Fetch filtered, paginated series list. |
| `/api/series/:id` | `PATCH` | Update series metadata and logs (Transactional & Validated). |
| `/api/series/stats` | `GET` | Get global stats (Total series, Read count, etc.). |
| `/api/authors` | `GET` | Fetch all unique authors in the database. |
| `/api/mal/search` | `GET` | Search MyAnimeList for automated data entry. |

---

## 🏗️ Technical Stack
- **Frontend:** React (Vite), Zustand, Axios, Vanilla CSS.
- **Backend:** Node.js (Express), `better-sqlite3`, **Zod**.
- **Database:** SQLite (Relational, Indexed).
- **DevOps:** Docker, Docker Compose.

---

## 🛠️ Development & Deployment

### Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
MAL_CLIENT_ID=your_id
DB_PATH=data/manga.db
```

### Running with Docker (Recommended)
The project is fully containerized. To start the entire stack:
```bash
docker-compose up --build
```
- **Backend:** Accessible at `http://localhost:3001`
- **Frontend:** Accessible at `http://localhost:5173`

---

## 🎯 Future Roadmap
- [ ] **Dashboard:** Create a visual analytics page for monthly reading trends and collection value.
- [ ] **Batch Import:** Add functionality to import collections from CSV or JSON.
- [ ] **User Accounts:** Add authentication and authorization for multi-user support.

---

## 📝 License
Personal project created by NEx1A. Open for modification and personal adaptation.
