import { jsPDF } from 'jspdf';

export type MotionRowForPdf = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  motion_type: string | null;
  proposer_country_name: string | null;
  created_at: string;
  closed_at: string | null;
  attachment_filename?: string | null;
};

export type VoteRowForPdf = {
  country_name: string;
  vote: 'for' | 'against' | 'abstain';
};

const PAGE_H = 297;
const MARGIN = 16;
const LINE = 5.5;
const MAX_TEXT_W = 210 - MARGIN * 2;

function motionTypeLabel(type: string | null): string {
  if (!type) return '';
  const map: Record<string, string> = {
    set_agenda: 'Set the Agenda',
    set_speaking_time: 'Set the Speaking Time',
    moderated_caucus: 'Moderated Caucus',
    unmoderated_caucus: 'Unmoderated Caucus',
  };
  return map[type] || type;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    passed: 'Passed',
    failed: 'Failed',
    withdrawn: 'Withdrawn',
    voting: 'Vote still open (session ended before closure)',
  };
  return map[status] || status;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

export function buildSessionMotionsSummaryPdf(input: {
  sessionName: string;
  sessionId: string;
  endedAt: Date;
  motions: MotionRowForPdf[];
  votesByMotionId: Record<string, VoteRowForPdf[]>;
}): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  let y = MARGIN;
  doc.text('MUN session — motion vote summary', MARGIN, y);
  y += LINE * 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Session: ${input.sessionName}`, MARGIN, y);
  y += LINE;
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text(`Session ID: ${input.sessionId}`, MARGIN, y);
  y += LINE;
  doc.text(`Generated: ${input.endedAt.toISOString()}`, MARGIN, y);
  y += LINE * 1.8;
  doc.setTextColor(0);

  if (input.motions.length === 0) {
    y = ensureSpace(doc, y, LINE * 3);
    doc.setFontSize(10);
    doc.text('No motions were put to a vote during this session.', MARGIN, y);
    return Buffer.from(doc.output('arraybuffer'));
  }

  doc.setFontSize(10);
  doc.text(`Motions summarized: ${input.motions.length}`, MARGIN, y);
  y += LINE * 2;

  input.motions.forEach((m, index) => {
    const blockEstimate = 40 + (m.description ? 20 : 0);
    y = ensureSpace(doc, y, blockEstimate);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${m.title}`, MARGIN, y);
    y += LINE * 1.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const typeLine = motionTypeLabel(m.motion_type);
    if (typeLine) {
      doc.setTextColor(60);
      doc.text(`Type: ${typeLine}`, MARGIN, y);
      y += LINE;
    }
    doc.text(`Outcome: ${statusLabel(m.status)}`, MARGIN, y);
    y += LINE;
    doc.text(`Opened: ${m.created_at}`, MARGIN, y);
    y += LINE;
    if (m.closed_at) {
      doc.text(`Closed: ${m.closed_at}`, MARGIN, y);
      y += LINE;
    }
    if (m.proposer_country_name) {
      doc.text(`Proposed by: ${m.proposer_country_name}`, MARGIN, y);
      y += LINE;
    }
    doc.setTextColor(0);

    if (m.description) {
      y += LINE * 0.3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Description', MARGIN, y);
      y += LINE;
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(m.description, MAX_TEXT_W);
      wrapped.forEach((line: string) => {
        y = ensureSpace(doc, y, LINE);
        doc.text(line, MARGIN, y);
        y += LINE;
      });
    }

    if (m.attachment_filename) {
      y += LINE * 0.4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70);
      doc.text(`Delegate attachment (file name): ${m.attachment_filename}`, MARGIN, y);
      y += LINE;
      doc.setTextColor(0);
    }

    const motionVotes = input.votesByMotionId[m.id] || [];
    const forC = motionVotes.filter((v) => v.vote === 'for').length;
    const againstC = motionVotes.filter((v) => v.vote === 'against').length;
    const abstainC = motionVotes.filter((v) => v.vote === 'abstain').length;

    y += LINE * 0.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Vote tally', MARGIN, y);
    y += LINE;
    doc.setFont('helvetica', 'normal');
    doc.text(`In favour: ${forC}  |  Against: ${againstC}  |  Abstain: ${abstainC}`, MARGIN, y);
    y += LINE;

    if (motionVotes.length > 0) {
      y += LINE * 0.3;
      doc.setFont('helvetica', 'bold');
      doc.text('Delegation votes', MARGIN, y);
      y += LINE;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const sorted = [...motionVotes].sort((a, b) => a.country_name.localeCompare(b.country_name));
      sorted.forEach((v) => {
        const label = v.vote === 'for' ? 'For' : v.vote === 'against' ? 'Against' : 'Abstain';
        const line = `${v.country_name}: ${label}`;
        y = ensureSpace(doc, y, LINE);
        doc.text(line, MARGIN, y);
        y += LINE;
      });
      doc.setFontSize(9);
    }

    y += LINE * 1.2;
    doc.setDrawColor(200);
    doc.line(MARGIN, y, 210 - MARGIN, y);
    y += LINE;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

export function sanitizeFilenameBase(name: string): string {
  const trimmed = name.trim().slice(0, 80) || 'session';
  return trimmed.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'session';
}
