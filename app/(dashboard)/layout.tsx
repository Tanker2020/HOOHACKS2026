import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-grid">
      <Sidebar />
      <main className="main-wrap">{children}</main>
    </div>
  );
}
