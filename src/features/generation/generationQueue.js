export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export const JOB_TYPES = {
  TEXT_TO_VIDEO: 'text-to-video',
  IMAGE_TO_VIDEO: 'image-to-video',
  SUBTITLE_BURN: 'subtitle-burn',
  FILTER: 'filter',
  EXPORT: 'export',
}

export const createGenerationJob = ({ type, title, payload = {}, status = JOB_STATUS.PENDING } = {}) => ({
  id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type: type || JOB_TYPES.TEXT_TO_VIDEO,
  title: title || 'Untitled generation job',
  status,
  progress: 0,
  payload,
  result: null,
  error: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const updateJobStatus = (job, patch = {}) => ({
  ...job,
  ...patch,
  updatedAt: new Date().toISOString(),
})
