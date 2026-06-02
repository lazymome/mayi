const fs = require('fs');
const path = require('path');
const root = process.cwd();
const appPath = path.join(root, 'src', 'App.jsx');
const app = fs.readFileSync(appPath, 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const result = {
  historyItem: exists('src/features/history/components/HistoryItem.jsx'),
  maskEditor: exists('src/features/canvas/components/MaskEditor.jsx'),
  hooks: ['useToast.js', 'useTheme.js', 'useInjectedStyles.js'].map((file) => [
    file,
    exists(`src/hooks/${file}`),
  ]),
  app: {
    hasHistoryItemImport: app.includes('features/history/components/HistoryItem'),
    hasInlineHistoryItem: app.includes('const HistoryItem = memo'),
    hasMaskEditorImport: app.includes('features/canvas/components/MaskEditor'),
    hasInlineMaskEditor: app.includes('const MaskEditor ='),
    hasUseTheme: app.includes('const { theme, setTheme } = useTheme();'),
    hasInlineThemeState: app.includes('const [theme, setTheme] = useState(() =>'),
    hasUseToast: app.includes('const { toasts, showToast, dismissToast } = useToast();'),
    hasInlineToastBlock: app.includes('Toast 通知系统'),
    hasInjectedStylesHook: app.includes('useInjectedStyles(styles);'),
    hasInlineStyleInjection: app.includes('document.createElement("style")'),
  },
};

console.log(JSON.stringify(result, null, 2));
