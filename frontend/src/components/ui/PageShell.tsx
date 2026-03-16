import Navbar, { ActivePage } from "./Navbar";

interface PageShellProps {
  activePage: ActivePage;
  children: React.ReactNode;
  maxWidth?: "4xl" | "6xl";
}

export default function PageShell({
  activePage,
  children,
  maxWidth = "4xl",
}: PageShellProps) {
  const widthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-4xl";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar activePage={activePage} />
      <main className={`${widthClass} mx-auto px-6 py-12`}>{children}</main>
    </div>
  );
}
