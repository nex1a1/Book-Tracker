import { SeriesType, SeriesStatus } from "../types";

export const TYPE_LABEL: Record<SeriesType, string> = {
  manga: "Manga",
  novel: "Novel",
  light_novel: "Light Novel"
};

export const STATUS_LABEL: Record<SeriesStatus, string> = {
  ongoing: "ยังไม่จบ",
  completed: "จบแล้ว",
  hiatus: "หยุดตีพิมพ์ชั่วคราว",
  cancelled: "โดนตัดจบ"
};

export const FORMAT_LABEL: Record<string, string> = {
  normal: "เล่มปกติ",
  bigbook: "Bigbook",
  pocket: "Pocket Book",
  digital: "E-Book",
  omnibus: "Omnibus"
};

export const RATING_LABEL: Record<number, string> = {
  0: "—",
  1: "★ แย่",
  2: "★★ พอใช้",
  3: "★★★ ดี",
  4: "★★★★ ดีมาก",
  5: "★★★★★ ยอดเยี่ยม"
};
