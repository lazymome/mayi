export const TAPNOW_PROJECT_VERSION = '1.0.0'
export const TAPNOW_PROJECT_EXTENSION = '.tapnowproj'

export const createEmptyTapnowProject = (overrides = {}) => {
  const now = new Date().toISOString()
  return {
    version: TAPNOW_PROJECT_VERSION,
    type: 'video-project',
    projectName: 'Untitled Tapnow Project',
    createdAt: now,
    updatedAt: now,
    workspaceMode: 'video',
    script: {
      title: '',
      synopsis: '',
      scenes: [],
    },
    storyboard: [],
    timeline: {
      fps: 30,
      width: 1920,
      height: 1080,
      tracks: [
        { id: 'video-main', type: 'video', name: 'Main Video', clips: [] },
        { id: 'subtitle-main', type: 'subtitle', name: 'Subtitles', clips: [] },
        { id: 'audio-main', type: 'audio', name: 'Audio', clips: [] },
      ],
    },
    assets: [],
    generationJobs: [],
    canvas: {},
    exportPresets: [
      { id: 'h264-1080p', label: 'H.264 1080p', container: 'mp4', codec: 'h264', width: 1920, height: 1080, fps: 30 },
    ],
    ...overrides,
  }
}

export const getTapnowProjectFolders = () => [
  'assets/images',
  'assets/videos',
  'assets/audio',
  'assets/subtitles',
  'cache',
  'renders',
  'thumbnails',
  'logs',
]

export const normalizeTapnowProject = (project = {}) => {
  const empty = createEmptyTapnowProject()
  return {
    ...empty,
    ...project,
    script: { ...empty.script, ...(project.script || {}) },
    timeline: { ...empty.timeline, ...(project.timeline || {}) },
    assets: Array.isArray(project.assets) ? project.assets : [],
    generationJobs: Array.isArray(project.generationJobs) ? project.generationJobs : [],
    storyboard: Array.isArray(project.storyboard) ? project.storyboard : [],
    exportPresets: Array.isArray(project.exportPresets) ? project.exportPresets : empty.exportPresets,
  }
}

export const serializeTapnowProject = (project) => {
  const normalized = normalizeTapnowProject({ ...project, updatedAt: new Date().toISOString() })
  return JSON.stringify(normalized, null, 2)
}
