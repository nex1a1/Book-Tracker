import React from "react";
import { Icons } from "./Icons";
import { BookLog } from "../types";
import { getCollectionLogLabel, getLogState, getMissingVolumesText, formatVolumeRangesString } from "../utils/helpers";

interface CollectionLogSummaryProps {
  log: BookLog;
  style?: React.CSSProperties;
}

// One "missing / complete / partial / no total yet" line per collection log, shared by the card and the live preview.
export function CollectionLogSummary({ log, style }: CollectionLogSummaryProps) {
  const label = getCollectionLogLabel(log);
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', ...style };
  const state = getLogState(log);

  if (state === 'partial') {
    return (
      <p style={rowStyle}>
        <Icons.Cart /> <strong>เก็บบางเล่ม ({label}):</strong>
        <span className="summary-status-pill partial">{formatVolumeRangesString(log.ranges)}</span>
      </p>
    );
  }

  // No total yet: nothing can be called missing, so say that instead of "ขาด (…): -".
  if (state === 'unknown') {
    return (
      <p style={rowStyle}>
        <Icons.Cart /> <strong>สะสม ({label}):</strong>
        <span className="summary-status-pill unknown">ยังไม่ระบุจำนวนเล่มทั้งหมด</span>
      </p>
    );
  }

  const isComplete = state === 'complete';
  return (
    <p style={rowStyle}>
      <Icons.Cart /> <strong>{isComplete ? 'สะสมครบ' : 'ขาด'} ({label}):</strong>
      <span className={`summary-status-pill ${state}`}>{getMissingVolumesText(log.ranges, log.totalVolumes)}</span>
    </p>
  );
}
