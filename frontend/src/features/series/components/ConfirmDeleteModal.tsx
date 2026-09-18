import React from "react";
import { Series } from "../../../types";
import { getSeriesDerivedStats, getSetFromRanges } from "../../../utils/helpers";

interface ConfirmDeleteModalProps {
  series: Series;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({ series, onConfirm, onClose }: ConfirmDeleteModalProps) {
  const stats = getSeriesDerivedStats(series);
  const totalBought = stats.n.collectionLogs.reduce((sum, log) => sum + getSetFromRanges(log.ranges).size, 0);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '440px' }}>
        <div className="modal__header">
          <h2 className="modal__title">ลบซีรีส์นี้อย่างถาวร?</h2>
          <button type="button" className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <p>
            คุณกำลังจะลบ <strong>"{stats.n.title}"</strong> การกระทำนี้ไม่สามารถย้อนกลับได้
            และจะลบข้อมูลต่อไปนี้ทั้งหมด:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: '20px', lineHeight: 1.8, color: 'var(--muted)' }}>
            <li>บันทึกการอ่าน {stats.n.readingLogs.length} รายการ ({stats.totalReadCount} เล่ม)</li>
            {stats.n.isCollecting && (
              <li>บันทึกการสะสม {stats.n.collectionLogs.length} รายการ ({totalBought} เล่ม)</li>
            )}
          </ul>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>ยกเลิก</button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>ลบถาวร</button>
        </div>
      </div>
    </div>
  );
}
