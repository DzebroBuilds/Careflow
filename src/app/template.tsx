// A template remounts on every navigation, so each page gets a short entrance.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rise">{children}</div>;
}
