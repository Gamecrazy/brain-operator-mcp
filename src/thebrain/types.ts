export type BrainId = string;
export type ThoughtId = string;
export type LinkId = string;
export type AttachmentId = string;

export type UnknownRecord = Record<string, unknown>;

export type BrainSummary = UnknownRecord & {
  id?: string;
  name?: string;
};

export type ThoughtSummary = UnknownRecord & {
  id?: string;
  name?: string;
  label?: string;
};

export type SearchResult = UnknownRecord;
export type ThoughtDetail = UnknownRecord;
export type ThoughtGraph = UnknownRecord;
export type LinkDetail = UnknownRecord;
export type NoteResult = UnknownRecord | string;
export type AttachmentSummary = UnknownRecord;
