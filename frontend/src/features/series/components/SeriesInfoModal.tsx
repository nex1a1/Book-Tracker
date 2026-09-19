import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Icons } from "../../../components/Icons";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { seriesApi } from "../../../api/seriesApi";
import { normalizeSeriesData, getSeriesDerivedStats } from "../../../utils/helpers";
import { FORMAT_LABEL } from "../../../utils/constants";
import { Series, BookLog, SeriesType, SeriesStatus } from "../../../types";
import type { CreateSeriesInput } from "../../../../../backend/src/utils/validation";

// Sub-components
import { SeriesFormSidebar } from "./SeriesFormSidebar";
import { SeriesBasicInfoCard } from "./SeriesBasicInfoCard";
import { SeriesLogsSection } from "./SeriesLogsSection";
import { MalItem } from "./MalSearchPanel";
import '../Series.css';

interface SeriesInfoModalProps {
  series?: Series;
  onClose: () => void;
}

interface FormState {
  title: string;
  author: string;
  publisher: string;
  publishYear: number | string;
  endYear: number | string;
  type: SeriesType;
  status: SeriesStatus;
  isCollecting: boolean;
  rating: number;
  imageUrl: string;
  notes: string;
  readingLogs: BookLog[];
  collectionLogs: BookLog[];
}

type RequiredFieldKey = 'title' | 'author' | 'publisher' | 'publishYear' | 'endYear';

export function SeriesInfoModal({ series, onClose }: SeriesInfoModalProps) {
  const isEdit = !!series;
  const normSeries = normalizeSeriesData(series);

  const initialState: FormState = {
    title: normSeries?.title || "",
    author: normSeries?.author || "",
    publisher: normSeries?.publisher || "",
    publishYear: normSeries?.publishYear || "",
    endYear: normSeries?.endYear || "",
    type: normSeries?.type || "manga",
    status: normSeries?.status || "ongoing",
    isCollecting: normSeries?.isCollecting ?? true,
    rating: normSeries?.rating || 0,
    imageUrl: normSeries?.imageUrl || "",
    notes: normSeries?.notes || "",
    readingLogs: normSeries?.readingLogs || [{ id: Date.now().toString(), title: "ภาคหลัก", totalVolumes: null, ranges: [] }],
    collectionLogs: normSeries?.collectionLogs || [{ id: Date.now().toString(), format: "normal", title: "เล่มปกติ", totalVolumes: null, ranges: [] }]
  };

  const [form, setForm] = useState<FormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredFieldKey, string>>>({});
  const { fetchSeries, fetchStats, fetchMetadata, authors, publishers } = useSeriesStore();

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const clearFieldError = (key: RequiredFieldKey) => {
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Snapshot taken once on mount; compared against `form` to know whether closing would discard something.
  const initialSnapshotRef = useRef(JSON.stringify(initialState));
  const isDirty = JSON.stringify(form) !== initialSnapshotRef.current;

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const discardConfirmRef = useRef<HTMLDivElement>(null);

  const requestClose = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else onClose();
  };

  // Focus the primary field on open instead of leaving focus stranded on the trigger button.
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Move focus into the discard-confirm dialog when it appears, onto the non-destructive option.
  useEffect(() => {
    if (showDiscardConfirm) {
      discardConfirmRef.current?.querySelector<HTMLElement>(".btn--ghost")?.focus();
    }
  }, [showDiscardConfirm]);

  // Escape-to-close and a Tab focus trap, since this dialog is portaled outside the normal DOM flow.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (showDiscardConfirm) setShowDiscardConfirm(false);
        else requestClose();
        return;
      }
      if (e.key === "Tab") {
        const container = showDiscardConfirm ? discardConfirmRef.current : modalRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDiscardConfirm, isDirty, onClose]);

  // New entries default to a focused "basic info first" view; editing keeps everything open
  // since the user came here specifically to work with existing logs/search.
  const [openSections, setOpenSections] = useState({ mal: isEdit, reading: isEdit, collection: isEdit });
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // Reactive Stats for Live Preview
  const stats = useMemo(() => {
    const tempSeries: Series = {
      _id: series?._id || "",
      id: series?.id || 0,
      ...form,
      publishYear: form.publishYear ? Number(form.publishYear) : null,
      endYear: form.endYear ? Number(form.endYear) : null,
    };
    try {
      return getSeriesDerivedStats(tempSeries);
    } catch {
      return {
        n: tempSeries,
        totalReadJP: 0,
        totalReadCount: 0,
        isAllRead: false,
        isFinishedReading: false,
        isCaughtUp: false,
        isReading: false,
        isUnread: true,
        isCollectMissing: false,
        isCollectComplete: false,
        isNotCollecting: !form.isCollecting
      };
    }
  }, [form, series]);

  const handleSelectMalItem = (m: MalItem) => {
    const node = m.node;
    const coverUrl = node.main_picture?.large || node.main_picture?.medium || "";

    // 1. Author mapping
    let authorStr = form.author;
    if (node.authors && node.authors.length > 0) {
      authorStr = node.authors.map(a => {
        const fname = a.node.first_name || "";
        const lname = a.node.last_name || "";
        return `${fname} ${lname}`.trim();
      }).filter(n => n !== "").join(", ");
    }

    // 2. Publish year mapping
    let pYear: number | string = form.publishYear;
    if (node.start_date) pYear = node.start_date.substring(0, 4);

    // 3. Status mapping
    let st: SeriesStatus = form.status;
    let eYear: number | string = form.endYear;
    if (node.status === "finished") {
       st = "completed";
       if (node.start_date) eYear = node.start_date.substring(0, 4);
    } else if (node.status === "currently_publishing") st = "ongoing";
    else if (node.status === "on_hiatus") st = "hiatus";
    else if (node.status === "discontinued") st = "cancelled";

    if (node.status === "finished" && node.end_date) {
      eYear = node.end_date.substring(0, 4);
    }

    // 4. Volumes mapping
    const newReadingLogs = [...form.readingLogs];
    const newCollectionLogs = [...form.collectionLogs];

    if (node.num_volumes && node.num_volumes > 0) {
      newReadingLogs[0] = { ...newReadingLogs[0], totalVolumes: node.num_volumes };
      newCollectionLogs[0] = { ...newCollectionLogs[0], totalVolumes: node.num_volumes };
    }

    setForm({
      ...form,
      imageUrl: coverUrl,
      author: authorStr || form.author,
      publishYear: pYear || form.publishYear,
      status: st,
      endYear: eYear || form.endYear,
      readingLogs: newReadingLogs,
      collectionLogs: newCollectionLogs
    });

    toast.success("ดึงข้อมูลอัตโนมัติเรียบร้อย! (ตรวจสอบและแก้ไขได้เลย)");
  };

  const updateLog = (key: 'readingLogs' | 'collectionLogs', idx: number, field: keyof BookLog, val: BookLog[keyof BookLog]) => {
    const newList = [...form[key]];
    const log = { ...newList[idx] };
    if (key === 'collectionLogs' && field === 'format') {
      const oldFormat = log.format || 'normal';
      const oldFormatLabel = FORMAT_LABEL[oldFormat] || '';
      if (!log.title || log.title.trim() === "" || log.title === oldFormatLabel || log.title === "เล่มปกติ") {
        log.title = FORMAT_LABEL[val as string] || '';
      }
    }
    newList[idx] = { ...log, [field]: val };
    setForm({ ...form, [key]: newList });
  };

  const handleStatusChange = (val: string) => {
    const status = val as SeriesStatus;
    if (status === 'ongoing' || status === 'hiatus') {
      setForm({ ...form, status, endYear: "" });
    } else {
      setForm({ ...form, status });
    }
  };

  const save = async () => {
    if (isSaving) return;

    const errors: Partial<Record<RequiredFieldKey, string>> = {};
    if (!form.title || form.title.toString().trim() === "") errors.title = "กรุณากรอกชื่อเรื่อง";
    if (!form.author || form.author.toString().trim() === "") errors.author = "กรุณากรอกผู้แต่ง";
    if (!form.publisher || form.publisher.toString().trim() === "") errors.publisher = "กรุณากรอกสำนักพิมพ์";
    if (!form.publishYear) errors.publishYear = "กรุณากรอกปีที่พิมพ์";
    if ((form.status === 'completed' || form.status === 'cancelled') && !form.endYear) errors.endYear = "กรุณากรอกปีที่จบ";

    const errorKeys = Object.keys(errors) as RequiredFieldKey[];
    if (errorKeys.length > 0) {
      setFieldErrors(errors);
      toast.error(
        errorKeys.length === 1
          ? errors[errorKeys[0]]!
          : `กรุณากรอกข้อมูลให้ครบถ้วน (${errorKeys.length} ช่องที่ไฮไลต์)`
      );
      const firstInvalid = modalRef.current?.querySelector<HTMLElement>(`[data-field="${errorKeys[0]}"]`);
      firstInvalid?.focus();
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      const payload: Partial<Series> = {
        ...form,
        publishYear: form.publishYear ? Number(form.publishYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
        readingLogs: form.readingLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null })),
        collectionLogs: form.collectionLogs.map(l => ({ ...l, totalVolumes: l.totalVolumes ? Number(l.totalVolumes) : null }))
      };
      if (isEdit && series) {
        await seriesApi.update(series._id, payload);
      } else {
        await seriesApi.create(payload as CreateSeriesInput);
      }
      await Promise.all([fetchSeries(), fetchStats(), fetchMetadata()]);
      toast.success("บันทึกสำเร็จ");
      onClose();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div
        className={`modal modal--large ${isEdit ? "modal--edit" : "modal--add"}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-modal-title"
      >
        <div className="modal__header">
          <h2 id="series-modal-title" className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEdit ? <Icons.Edit /> : <Icons.Plus />}
            {isEdit ? `แก้ไขข้อมูลเรื่อง: ${series?.title}` : "เพิ่มเรื่องใหม่เข้าระบบ"}
          </h2>
          <button type="button" className="modal__close" onClick={requestClose} aria-label="ปิด">✕</button>
        </div>

        <div className="modal__grid-container">

          <SeriesFormSidebar
            form={form}
            stats={stats}
            malOpen={openSections.mal}
            onToggleMal={() => toggleSection('mal')}
            onSelectMalItem={handleSelectMalItem}
            onNotesChange={notes => setField('notes', notes)}
          />

          {/* ── Right Content Form Area ── */}
          <div className="modal__form-content">

            <SeriesBasicInfoCard
              form={form}
              fieldErrors={fieldErrors}
              authors={authors}
              publishers={publishers}
              titleInputRef={titleInputRef}
              onFieldChange={patch => setForm(prev => ({ ...prev, ...patch }))}
              onStatusChange={handleStatusChange}
              clearFieldError={clearFieldError}
            />

            {/* Card 2: บันทึกการอ่าน */}
            <div className="form-section-card">
              <SeriesLogsSection
                type="reading"
                logs={form.readingLogs}
                isOpen={openSections.reading}
                onToggleOpen={() => toggleSection('reading')}
                onAdd={() => { setForm({ ...form, readingLogs: [...form.readingLogs, { id: Date.now().toString(), title: "", totalVolumes: null, ranges: [] }] }); setOpenSections(s => ({ ...s, reading: true })); }}
                onRemove={idx => setForm({ ...form, readingLogs: form.readingLogs.filter((_, i) => i !== idx) })}
                onUpdate={(idx, field, val) => updateLog('readingLogs', idx, field, val)}
              />
            </div>

            {/* Card 3: ข้อมูลการสะสม */}
            <div className="form-section-card">
              <label className="modal-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={form.isCollecting}
                  onChange={() => setField('isCollecting', !form.isCollecting)}
                  style={{ cursor: 'pointer' }}
                />
                <strong style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>เปิดเก็บสะสมคอลเลกชันสำหรับเรื่องนี้ (ตามเล่มแปลไทย)</strong>
              </label>

              {form.isCollecting && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <SeriesLogsSection
                    type="collection"
                    logs={form.collectionLogs}
                    isOpen={openSections.collection}
                    onToggleOpen={() => toggleSection('collection')}
                    onAdd={() => { setForm({ ...form, collectionLogs: [...form.collectionLogs, { id: Date.now().toString(), format: "normal", title: "", totalVolumes: null, ranges: [] }] }); setOpenSections(s => ({ ...s, collection: true })); }}
                    onRemove={idx => setForm({ ...form, collectionLogs: form.collectionLogs.filter((_, i) => i !== idx) })}
                    onUpdate={(idx, field, val) => updateLog('collectionLogs', idx, field, val)}
                    compactTitle
                  />
                </div>
              )}
            </div>

          </div>

        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={requestClose}>ยกเลิก</button>
          <button
            type="button"
            className="btn btn--save"
            onClick={save}
            disabled={isSaving}
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลซีรีส์ทั้งหมด"}
          </button>
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal" style={{ maxWidth: '420px' }} ref={discardConfirmRef} role="dialog" aria-modal="true" aria-labelledby="discard-confirm-title">
            <div className="modal__header">
              <h2 id="discard-confirm-title" className="modal__title">ทิ้งการเปลี่ยนแปลงที่ยังไม่ได้บันทึก?</h2>
            </div>
            <div className="modal__body">
              <p>ข้อมูลที่กรอกไว้ (รวมถึงข้อมูลที่ดึงมาจาก MAL) จะหายไปทั้งหมดถ้าปิดตอนนี้</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setShowDiscardConfirm(false)}>กลับไปแก้ไขต่อ</button>
              <button type="button" className="btn btn--danger" onClick={onClose}>ทิ้งการเปลี่ยนแปลง</button>
            </div>
          </div>
        </div>
      )}
    </div>, document.body
  );
}
