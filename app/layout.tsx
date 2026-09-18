import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata = {
  title: 'SAFE-RAG | Enterprise Verification',
};

// Runs before React hydrates so the correct theme class is on <html> from
// the very first paint -- otherwise the page flashes light then dark.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('safe_rag_theme');
    var theme = stored === 'dark' || stored === 'light' ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 flex min-h-screen text-gray-900 dark:text-gray-100 font-sans antialiased transition-colors">
        <ThemeProvider>
          {/* Fixed Sidebar */}
          <Sidebar />

          {/* Main Content Area (pushes past the 64-width sidebar) */}
          <main className="ml-64 flex-1 p-8 min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}