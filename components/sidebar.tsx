"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/workflows", label: "Workflows" },
  { href: "/runs", label: "Runs" },
  { href: "/artifacts", label: "Artifacts" },
  { href: "/files", label: "Files" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">Workflow Autopilot</div>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
            {link.label}
          </Link>
        );
      })}
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 20 }}>
        Shared volume mode enabled.
      </p>
    </aside>
  );
}
