export const truncateByBytes = (value, maxBytes) => {
  if (!value || !maxBytes || maxBytes <= 0) return value || ''
  const encoder = new TextEncoder()
  let used = 0
  let output = ''
  for (const ch of value) {
    const size = encoder.encode(ch).length
    if (used + size > maxBytes) break
    output += ch
    used += size
  }
  if (output.length < value.length) return `${output}...`
  return output
}
