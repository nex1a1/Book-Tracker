import React from "react";
import { Icons } from "../../../components/Icons";
import { StarRating } from "../../../components/StarRating";
import { Dropdown } from "../../../components/Dropdown";
import { Autocomplete } from "../../../components/Autocomplete";
import { RATING_LABEL } from "../../../utils/constants";
import { SeriesType, SeriesStatus } from "../../../types";

const TYPE_OPTIONS = [
  { value: "manga", label: "Manga (การ์ตูน)" },
  { value: "novel", label: "Novel (นิยาย)" },
  { value: "light_novel", label: "Light Novel (ไลท์โนเวล)" },
];

const STATUS_OPTIONS = [
  { value: "ongoing", label: "ยังไม่จบ (Ongoing)" },
  { value: "completed", label: "จบแล้ว (Completed)" },
  { value: "hiatus", label: "หยุดตีพิมพ์ชั่วคราว (On Hiatus)" },
  { value: "cancelled", label: "โดนตัดจบ (Cancelled)" },
];

type RequiredFieldKey = 'title' | 'author' | 'publisher' | 'publishYear' | 'endYear';

interface BasicInfoFormState {
  title: string;
  imageUrl: string;
  author: string;
  publisher: string;
  type: SeriesType;
  status: SeriesStatus;
  publishYear: number | string;
  endYear: number | string;
  rating: number;
}

interface SeriesBasicInfoCardProps {
  form: BasicInfoFormState;
  fieldErrors: Partial<Record<RequiredFieldKey, string>>;
  authors: { name: string }[];
  publishers: { name: string }[];
  titleInputRef: React.RefObject<HTMLInputElement>;
  onFieldChange: (patch: Partial<BasicInfoFormState>) => void;
  onStatusChange: (val: string) => void;
  clearFieldError: (key: RequiredFieldKey) => void;
}

export function SeriesBasicInfoCard({
  form, fieldErrors, authors, publishers, titleInputRef, onFieldChange, onStatusChange, clearFieldError,
}: SeriesBasicInfoCardProps) {
  const isEndYearApplicable = form.status === 'completed' || form.status === 'cancelled';

  return (
    <div className="form-section-card">
      <h3 className="form-section-card__title"><Icons.Info /> ข้อมูลพื้นฐานของเรื่อง</h3>

      <label className="field">
        <span>ชื่อเรื่องภาษาไทย / ชื่อเรื่องหลัก <span className="danger">*</span></span>
        <input
          ref={titleInputRef}
          data-field="title"
          className={`input ${fieldErrors.title ? 'input--error' : ''}`}
          value={form.title}
          onChange={e => { onFieldChange({ title: e.target.value }); clearFieldError('title'); }}
          placeholder="กรอกชื่อเรื่องภาษาไทย..."
          required
          aria-required="true"
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? "title-error" : undefined}
        />
        {fieldErrors.title && <span id="title-error" className="field-error-msg">{fieldErrors.title}</span>}
      </label>

      <label className="field">
        <span>ลิงก์รูปภาพหน้าปกหนังสือ (URL)</span>
        <input className="input" value={form.imageUrl} onChange={e => onFieldChange({ imageUrl: e.target.value })} placeholder="วาง URL ลิงก์รูปปกตรงนี้ หรือคลิกดึงปกจาก MAL ในแถบด้านซ้าย..." />
      </label>

      <div className="field-row">
        <label className="field">
          <span>ผู้แต่ง / ผู้แต่งเรื่อง <span className="danger">*</span></span>
          <Autocomplete
            data-field="author"
            className={fieldErrors.author ? 'input--error' : ''}
            value={form.author}
            onChange={val => { onFieldChange({ author: val }); clearFieldError('author'); }}
            options={authors.map(a => a.name)}
            placeholder="พิมพ์ชื่อผู้แต่ง..."
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.author}
            aria-describedby={fieldErrors.author ? "author-error" : undefined}
          />
          {fieldErrors.author && <span id="author-error" className="field-error-msg">{fieldErrors.author}</span>}
        </label>
        <label className="field">
          <span>สำนักพิมพ์แปลไทย <span className="danger">*</span></span>
          <Autocomplete
            data-field="publisher"
            className={fieldErrors.publisher ? 'input--error' : ''}
            value={form.publisher}
            onChange={val => { onFieldChange({ publisher: val }); clearFieldError('publisher'); }}
            options={publishers.map(p => p.name)}
            placeholder="พิมพ์ชื่อสำนักพิมพ์..."
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.publisher}
            aria-describedby={fieldErrors.publisher ? "publisher-error" : undefined}
          />
          {fieldErrors.publisher && <span id="publisher-error" className="field-error-msg">{fieldErrors.publisher}</span>}
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>ประเภทสื่อ</span>
          <Dropdown
            value={form.type}
            options={TYPE_OPTIONS}
            onChange={val => onFieldChange({ type: val as SeriesType })}
          />
        </label>
        <label className="field">
          <span>สถานะความคืบหน้าเรื่อง</span>
          <Dropdown
            value={form.status}
            options={STATUS_OPTIONS}
            onChange={onStatusChange}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>ปีที่พิมพ์ครั้งแรก (ค.ศ.) <span className="danger">*</span></span>
          <input
            type="number"
            data-field="publishYear"
            className={`input ${fieldErrors.publishYear ? 'input--error' : ''}`}
            value={form.publishYear}
            onChange={e => { onFieldChange({ publishYear: e.target.value }); clearFieldError('publishYear'); }}
            placeholder="เช่น 2019"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.publishYear}
            aria-describedby={fieldErrors.publishYear ? "publishYear-error" : undefined}
          />
          {fieldErrors.publishYear && <span id="publishYear-error" className="field-error-msg">{fieldErrors.publishYear}</span>}
        </label>
        {/* Always rendered (not conditionally mounted) so choosing "completed"/"cancelled" never reflows
            the row as a surprise — the field is visible but disabled until it applies. */}
        <label className={`field ${isEndYearApplicable ? '' : 'field--inactive'}`}>
          <span>ปีที่พิมพ์เสร็จสิ้น (ค.ศ.) {isEndYearApplicable && <span className="danger">*</span>}</span>
          <input
            type="number"
            data-field="endYear"
            className={`input ${fieldErrors.endYear ? 'input--error' : ''}`}
            value={form.endYear}
            onChange={e => { onFieldChange({ endYear: e.target.value }); clearFieldError('endYear'); }}
            placeholder={isEndYearApplicable ? "เช่น 2024" : "ระบุได้เมื่อสถานะเป็น \"จบแล้ว\" หรือ \"โดนตัดจบ\""}
            disabled={!isEndYearApplicable}
            required={isEndYearApplicable}
            aria-required={isEndYearApplicable}
            aria-invalid={!!fieldErrors.endYear}
            aria-describedby={fieldErrors.endYear ? "endYear-error" : undefined}
          />
          {fieldErrors.endYear && <span id="endYear-error" className="field-error-msg">{fieldErrors.endYear}</span>}
        </label>
      </div>

      <div className="field">
        <span>คะแนนความชื่นชอบส่วนตัว</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
          <StarRating rating={form.rating} onRate={(r) => onFieldChange({ rating: r })} size="lg" />
          {form.rating > 0 && <span style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 'bold' }}>{RATING_LABEL[form.rating]}</span>}
        </div>
      </div>
    </div>
  );
}
