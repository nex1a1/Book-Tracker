import { SeriesType, SeriesStatus, LogLanguage } from "../types";

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

export const LANGUAGE_LABEL: Record<LogLanguage, string> = {
  th: "ไทย",
  jp: "ญี่ปุ่น (JP)",
  en: "อังกฤษ (EN)",
  other: "ภาษาอื่น"
};

export const LANGUAGE_SHORT: Record<LogLanguage, string> = {
  th: "TH",
  jp: "JP",
  en: "EN",
  other: "อื่นๆ"
};
