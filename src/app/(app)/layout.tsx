import Sidebar from "@/components/Sidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import OfflineStatusPill from "@/components/OfflineStatusPill";
import CommandPalette from "@/components/CommandPalette";
import TopSearchBar from "@/components/TopSearchBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Global Command Palette (Ctrl+K Omnisearch) */}
      <CommandPalette />

      {/* Responsive Sidebar (Desktop Fixed + Mobile Drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Top Bar with Breadcrumbs, Search Bar, and Offline Connectivity Pill */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-3 min-w-0">
              <Breadcrumbs />
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <TopSearchBar />
              <OfflineStatusPill />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
