import Sidebar from "@/components/Sidebar";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Responsive Sidebar (Desktop Fixed + Mobile Drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
