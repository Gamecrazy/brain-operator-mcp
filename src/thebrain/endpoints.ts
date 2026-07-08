export const endpoints = {
  listBrains: "/brains",
  getBrain: (brainId: string) => `/brains/${encodeURIComponent(brainId)}`,
  getStats: (brainId: string) => `/brains/${encodeURIComponent(brainId)}/statistics`,
  getModifications: (brainId: string) => `/brains/${encodeURIComponent(brainId)}/modifications`,
  searchThoughts: (brainId: string) => `/search/${encodeURIComponent(brainId)}`,
  createThought: (brainId: string) => `/thoughts/${encodeURIComponent(brainId)}`,
  getThought: (brainId: string, thoughtId: string) =>
    `/thoughts/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}`,
  updateThought: (brainId: string, thoughtId: string) =>
    `/thoughts/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}`,
  getThoughtGraph: (brainId: string, thoughtId: string) =>
    `/thoughts/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}/graph`,
  createLink: (brainId: string) => `/links/${encodeURIComponent(brainId)}`,
  getNote: (brainId: string, thoughtId: string, suffix = "") =>
    `/notes/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}${suffix}`,
  appendNote: (brainId: string, thoughtId: string) =>
    `/notes/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}/append`,
  addUrlAttachment: (brainId: string, thoughtId: string) =>
    `/attachments/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}/url`,
  listAttachments: (brainId: string, thoughtId: string) =>
    `/thoughts/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}/attachments`
} as const;
