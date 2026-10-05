import React, { useState } from "react";
import { Icons } from "../../../components/Icons";
import { StarRating } from "../../../components/StarRating";
import { AggregatedVolumeBar } from "./AggregatedVolumeBar";
import { SeriesInfoModal } from "./SeriesInfoModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useSeriesStore } from "../../../store/useSeriesStore";
import { coverSrc } from "../../../api/seriesApi";
import { getSeriesDerivedStats, getLogState, getMissingVolumesText, getCollectionLogLabel, formatVolumeRangesString } from "../../../utils/helpers";
import { TYPE_LABEL, STATUS_LABEL } from "../../../utils/constants";
import { Series } from "../../../types";
import '../Series.css';

interface SeriesListItemProps {
  series: Series;
}

export function SeriesListItem({ series }: SeriesListItemProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteSeries = useSeriesStore(s => s.deleteSeries);
  const updateSeriesRating = useSeriesStore(s => s.updateSeriesRating);
  const stats = getSeriesDerivedStats(series);

  const renderTimeline = () => {
    const s = stats.n.publishYear || "?";
    // The status badge right next to this already says "จบแล้ว", so an unknown end year is just "?".
    if (stats.n.status === 'completed' || stats.n.endYear) return `${s} – ${stats.n.endYear || "?"}`;
    return `${s} – ปัจจุบัน`;
  };

  // Capped to one line (one format) so multi-format series don't stretch the row taller
  // than its neighbors; the rest are one click away via "+N รูปแบบ".
  // Read-only and stopped series have nothing to show here: their meta-line badge already says so.
  const renderMissing = () => {
    if (!stats.n.isCollecting || stats.n.isCollectingStopped) return null;
    const logs = stats.n.collectionLogs;
    // A log that can be judged leads the line (missing first, then complete); partial and no-total logs
    // only lead when they are all the series has.
    const byState = (state: string) => logs.find(log => getLogState(log) === state);
    const primaryLog = byState('missing') ?? byState('complete') ?? byState('unknown') ?? logs[0];
    const kind = getLogState(primaryLog);
    const text = kind === 'partial' ? formatVolumeRangesString(primaryLog.ranges) : getMissingVolumesText(primaryLog.ranges, primaryLog.totalVolumes);
    const missingText = kind === 'unknown' ? 'ยังไม่ระบุจำนวนเล่มทั้งหมด' : text;
    const extraCount = logs.length - 1;
    const logLabel = getCollectionLogLabel(primaryLog);
    // "ครบถ้วน" and the no-total message need no label: the bar above already reads "สะสม: 40/40" or "สะสม: 5/?".
    const label = kind === 'partial' ? `เก็บบางเล่ม (${logLabel})` : kind === 'missing' ? `ขาด (${logLabel})` : '';
    return (
      <div className="list-row__missing-row">
        <p className={`list-row__missing list-row__missing--${kind}`} title={`${label} ${missingText}`.trim()}>
          {label && <span className="list-row__missing-label">{label} </span>}
          {/* word joiner after each "-" so a wrapped line breaks between ranges, never inside "25-40" */}
          <span className="list-row__missing-value">{missingText.replace(/-/g, '-⁠')}</span>
        </p>
        {extraCount > 0 && (
          <button
            type="button"
            className="list-row__missing-more"
            onClick={() => setShowEdit(true)}
            title="ดูรูปแบบสะสมทั้งหมดในหน้าต่างแก้ไข"
          >
            +{extraCount} รูปแบบ
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`list-row list-row--${stats.n.status}`}>

      {/* Column 1: cover wrapper */}
      <div className="list-row__cover-wrapper">
        {stats.n.imageUrl ? (
          <img src={coverSrc(stats.n.imageUrl)} alt={stats.n.title} className="list-row__cover" />
        ) : (
          <div className="list-row__cover--empty">ไม่มีรูป</div>
        )}
      </div>

      {/* Column 2: Info Block — title, author, then type/status/years */}
      <div className="list-row__info">
        <h3 className="list-row__title" title={stats.n.title}>{stats.n.title}</h3>
        <p className="list-row__author" title={`${stats.n.author || "?"} ${stats.n.publisher ? `| ${stats.n.publisher}` : ""}`}>
          {stats.n.author || "?"} {stats.n.publisher ? `| ${stats.n.publisher}` : ""}
        </p>
        <div className="list-row__meta">
          <span className={`badge badge--${stats.n.type}`}>{TYPE_LABEL[stats.n.type]}</span>
          <span className={`badge badge--${stats.n.status}`}>{STATUS_LABEL[stats.n.status]}</span>
          <span className="list-row__timeline">{renderTimeline()}</span>
        </div>
      </div>

      {/* Column 3: reading progress (the bar turns green once fully read) + reading-state badge */}
      <div className="list-row__read">
        <AggregatedVolumeBar logs={stats.n.readingLogs} type="read" icon={Icons.Book} titleLabel="อ่าน" isMini />
        {stats.isCaughtUp && <span className="badge badge--caughtup">ทันปัจจุบัน</span>}
        {stats.isUnread && stats.n.isCollecting && <span className="badge badge--collect-only">สายดอง</span>}
      </div>

      {/* Column 4: collection progress with what is still missing (or the collection-state badge) under it */}
      <div className="list-row__collect">
        {stats.n.isCollecting && <AggregatedVolumeBar logs={stats.n.collectionLogs} type="buy" icon={Icons.Cart} titleLabel="สะสม" isMini />}
        {renderMissing()}
        {stats.totalReadCount > 0 && !stats.n.isCollecting && <span className="badge badge--read-only">อ่านอย่างเดียว</span>}
        {stats.isCollectStopped && <span className="badge badge--stopped">เลิกตามแล้ว</span>}
      </div>

      {/* Column 5: Star Rating */}
      <div className="list-row__rating">
        <StarRating rating={stats.n.rating || 0} onRate={(r) => updateSeriesRating(stats.n._id, r)} size="xs" />
      </div>

      {/* Column 6: Actions Panel */}
      <div className="list-row__actions">
        <button
          type="button"
          className="list-row__action-btn list-row__action-btn--edit"
          title="แก้ไข"
          onClick={() => setShowEdit(true)}
        >
          <Icons.Edit />
        </button>
        <button
          type="button"
          className="list-row__action-btn list-row__action-btn--danger"
          title="ลบ"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Icons.Trash />
        </button>
      </div>

      {showEdit && <SeriesInfoModal series={stats.n} onClose={() => setShowEdit(false)} />}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          series={stats.n}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => { deleteSeries(stats.n._id); setShowDeleteConfirm(false); }}
        />
      )}
    </div>
  );
}
