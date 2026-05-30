const originalError = console.error
const originalWarn = console.warn
const originalLog = console.log

const shouldFilterPassiveEventWarning = (args) => args.some((arg) => {
  let msg = ''
  if (typeof arg === 'string') msg = arg
  else if (arg && typeof arg === 'object') msg = arg.message || arg.toString?.() || JSON.stringify(arg)
  else if (arg != null) msg = String(arg)

  return msg.includes('Unable to preventDefault inside passive event listener')
    || msg.includes('passive event listener invocation')
    || (msg.includes('preventDefault') && msg.includes('passive'))
})

console.error = function filteredConsoleError(...args) {
  if (shouldFilterPassiveEventWarning(args)) return
  originalError.apply(console, args)
}

console.warn = function filteredConsoleWarn(...args) {
  if (shouldFilterPassiveEventWarning(args)) return
  originalWarn.apply(console, args)
}

console.log = function filteredConsoleLog(...args) {
  if (shouldFilterPassiveEventWarning(args)) return
  originalLog.apply(console, args)
}
