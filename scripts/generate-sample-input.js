#!/usr/bin/env node
/**
 * Generates a multi-page sample .docx into data/inputs/sample-sow.docx for
 * exercising the extractor against a realistic SOW-shaped document with
 * tables of varying widths (3, 4, 5, and 6 columns) interleaved with prose.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'data/inputs');
const OUT_PATH = path.join(OUT_DIR, 'sample-sow.docx');

const LOREM_LONG =
  'This section captures the formally agreed scope between the parties and is binding once executed. Any changes must be raised through the change-control process described in the appendix. References in this document to "Provider" mean the supplying entity; "Client" means the receiving entity. Where a value is left blank in a table, treat it as not applicable rather than zero.';

const LOREM_MEDIUM =
  'The information in the table below should be read alongside the surrounding prose. Numeric values are exact unless explicitly marked as estimates. Where currency is shown without a symbol the default is USD.';

const LOREM_SHORT = 'See the table below for the structured breakdown.';

const children = [
  // Cover / title page
  title('Master Statement of Work'),
  centered('Engagement #2026-MSW-019'),
  centered('Effective Date: 2026-05-08'),
  pageBreak(),

  // Section 1
  h1('Executive Summary'),
  p(LOREM_LONG),
  p(
    'The remainder of this document is organized as follows: Product Details define what is being delivered; Deliverables enumerate concrete artifacts; Timeline lays out milestones; Roles & Responsibilities map ownership; Pricing fixes the commercial terms; Acceptance Criteria define done; Risks describe known threats; and the Appendix collects supporting reference material.'
  ),
  pageBreak(),

  // Section 2 — 4-column table
  h1('Product Details'),
  p(LOREM_MEDIUM),
  table(
    ['Component', 'Version', 'License', 'Notes'],
    [
      ['Ingest Service', '4.2.1', 'MIT', 'High-throughput ingestion API'],
      ['Transform Pipeline', '2.0.0', 'Apache-2.0', 'Stateful batch transforms'],
      ['Storage Layer', '1.4.7', 'Proprietary', 'Encrypted at rest'],
      ['Reporting UI', '0.9.3', 'MIT', 'Beta — feature-flagged'],
      ['Admin Console', '3.1.0', 'Proprietary', 'SSO required'],
    ]
  ),
  p('Component versions reflect the targeted release at engagement kick-off and may be updated by mutual agreement during execution.'),
  pageBreak(),

  // Section 3 — 5-column table + list
  h1('Deliverables'),
  p('The Provider shall produce each artifact listed below by the indicated due date. Each row is independently acceptance-tested.'),
  table(
    ['ID', 'Artifact', 'Owner', 'Due Date', 'Acceptance'],
    [
      ['D-001', 'Architecture diagram', 'Provider', '2026-05-22', 'Client review + signoff'],
      ['D-002', 'API contract (OpenAPI)', 'Provider', '2026-05-29', 'Lint + integration test pass'],
      ['D-003', 'Migration plan', 'Joint', '2026-06-12', 'Dry-run on staging'],
      ['D-004', 'Runbook v1', 'Provider', '2026-06-26', 'Walked through with on-call'],
      ['D-005', 'Final report', 'Provider', '2026-07-10', 'Steering committee approval'],
    ]
  ),
  p('Supporting deliverables (non-acceptance-gated):'),
  bullet('Weekly status notes posted in the shared workspace'),
  bullet('Bi-weekly demo recordings'),
  bullet('Decision log kept current within 48 hours of each decision'),
  pageBreak(),

  // Section 4 — 3-column table
  h1('Timeline'),
  p('Milestones are organized by phase. Slip on any milestone triggers an automatic review at the next steering committee.'),
  table(
    ['Milestone', 'Target Date', 'Status'],
    [
      ['Kickoff', '2026-05-08', 'Complete'],
      ['Design freeze', '2026-05-29', 'On track'],
      ['Alpha cut', '2026-06-12', 'Pending'],
      ['Beta with pilot users', '2026-06-26', 'Pending'],
      ['Production cutover', '2026-07-10', 'Pending'],
      ['Post-launch review', '2026-07-24', 'Pending'],
    ]
  ),
  pageBreak(),

  // Section 5 — 6-column table
  h1('Roles and Responsibilities'),
  p('Ownership is captured below using a RACI-style matrix. Exactly one party is Accountable per row; multiple parties may be Responsible, Consulted, or Informed.'),
  table(
    ['Activity', 'Provider', 'Client', 'Steering', 'Security', 'Legal'],
    [
      ['Architecture decisions', 'A', 'C', 'I', 'C', '—'],
      ['Code delivery', 'A/R', '—', 'I', '—', '—'],
      ['Security review', 'R', 'C', 'I', 'A', 'C'],
      ['Contract amendments', 'C', 'C', 'A', '—', 'R'],
      ['Production deploys', 'R', 'A', 'I', 'C', '—'],
      ['Incident response', 'R', 'A', 'I', 'C', 'I'],
    ]
  ),
  p(LOREM_SHORT),
  pageBreak(),

  // Section 6 — 5-column pricing table
  h1('Pricing'),
  p('All amounts are in USD and exclude applicable taxes. Invoicing cadence is monthly in arrears unless otherwise noted.'),
  table(
    ['Line Item', 'Quantity', 'Unit', 'Rate', 'Subtotal'],
    [
      ['Senior engineer', '320', 'hours', '225.00', '72,000.00'],
      ['Tech lead', '160', 'hours', '275.00', '44,000.00'],
      ['Architect', '80', 'hours', '350.00', '28,000.00'],
      ['Project manager', '120', 'hours', '195.00', '23,400.00'],
      ['Security review', '1', 'engagement', '15,000.00', '15,000.00'],
      ['Travel (estimated)', '1', 'allowance', '8,000.00', '8,000.00'],
      ['Total', '', '', '', '190,400.00'],
    ]
  ),
  p('Travel is reimbursed at cost against receipts. Any line item exceeding its quantity by more than 10% requires written change-order approval prior to incurring the overage.'),
  pageBreak(),

  // Section 7 — list + 3-column table
  h1('Acceptance Criteria'),
  p('Each deliverable is accepted only when ALL of the following are satisfied:'),
  numbered('Functional tests pass on the agreed environment.'),
  numbered('Performance meets or exceeds the targets in the table below.'),
  numbered('Security review has no open critical or high findings.'),
  numbered('Documentation is complete and reviewed by the Client.'),
  numbered('Operational handover (runbook walk-through) is recorded.'),
  p('Performance targets:'),
  table(
    ['Metric', 'Target', 'Measurement Window'],
    [
      ['p50 latency', '< 80 ms', 'Rolling 1-hour'],
      ['p99 latency', '< 350 ms', 'Rolling 1-hour'],
      ['Error rate', '< 0.5%', 'Rolling 24-hour'],
      ['Availability', '>= 99.9%', 'Calendar month'],
    ]
  ),
  pageBreak(),

  // Section 8 — 4-column table
  h1('Risks and Mitigations'),
  p('The following risks were identified during planning. Owners are responsible for tracking the mitigation through to closure.'),
  table(
    ['Risk', 'Likelihood', 'Impact', 'Mitigation'],
    [
      ['Schedule slip on dependency X', 'Medium', 'High', 'Identified backup vendor; spike booked week 2'],
      ['Key engineer attrition', 'Low', 'High', 'Pair programming + documented decision log'],
      ['Migration data corruption', 'Low', 'Critical', 'Rehearsed dry-run + point-in-time restore tested'],
      ['Scope creep in reporting UI', 'High', 'Medium', 'Strict change-control; weekly scope review'],
      ['Security finding in audit', 'Medium', 'High', 'Pre-audit hardening sprint scheduled'],
    ]
  ),
  pageBreak(),

  // Section 9 — appendix + small 2-col table
  h1('Appendix A: Definitions'),
  p('Terms used throughout this document:'),
  table(
    ['Term', 'Definition'],
    [
      ['Provider', 'The supplying entity entering into this SOW.'],
      ['Client', 'The receiving entity entering into this SOW.'],
      ['Steering', 'The joint committee with binding decision authority over scope and schedule.'],
      ['Acceptance', 'The Client’s formal sign-off that a deliverable meets its criteria.'],
      ['Change Control', 'The process by which scope, schedule, or pricing is formally amended.'],
    ]
  ),
  h2('Appendix B: Change Control Procedure'),
  p('Any party may initiate a change request by submitting the change-request template to the Steering Committee. The committee reviews change requests at its standing weekly meeting and renders a decision within five business days. Approved changes are appended to this SOW as numbered amendments and take effect on the date specified in the amendment.'),
  p('Disputes that cannot be resolved by the Steering Committee escalate to the executive sponsors named in the master agreement.'),
];

await mkdir(OUT_DIR, { recursive: true });
const doc = new Document({
  creator: 'doc-extractor sample generator',
  title: 'Master Statement of Work',
  sections: [{ properties: {}, children }],
});
const buffer = await Packer.toBuffer(doc);
await writeFile(OUT_PATH, buffer);
console.log(`wrote ${OUT_PATH} (${buffer.length} bytes)`);

// ---- helpers ----

function title(text) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 48 })],
  });
}
function centered(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun(text)],
  });
}
function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}
function p(text) {
  return new Paragraph({ children: [new TextRun(text)] });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 } });
}
function numbered(text) {
  return new Paragraph({ text, numbering: { reference: 'numbered-list', level: 0 } });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function table(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
          children: [
            new Paragraph({ children: [new TextRun({ text: h, bold: true })] }),
          ],
        })
    ),
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map(
          (c) =>
            new TableCell({
              width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun(c)] })],
            })
        ),
      })
  );
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}
