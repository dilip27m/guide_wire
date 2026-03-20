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
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 pb-12 relative overflow-hidden font-sans">
      <Navbar activePage={activePage} />
      <main className={`${widthClass} mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10`}>
        {children}
      </main>
    </div>
  );
}
