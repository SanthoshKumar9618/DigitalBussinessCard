import { useState } from "react";
import { useNavigate } from "react-router-dom";

/** Landing page for the bare domain (and unknown paths). */
const Home = ({ notFound = false }: { notFound?: boolean }) => {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  const open = (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/^.*\//, "");
    if (s) navigate(`/${encodeURIComponent(s)}`);
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>S</div>
        <h1 style={styles.title}>{notFound ? "Page not found" : "SmartCard"}</h1>
        <p style={styles.sub}>
          {notFound
            ? "That link doesn't match a card. Check the address, or open a card by its name below."
            : "Digital business cards that update themselves. Scan a SmartCard QR code or open a card link to see someone's card."}
        </p>
        <form onSubmit={open} style={styles.form}>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="card name, e.g. priya-sharma"
            aria-label="Card name"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={!slug.trim()}>
            Open card
          </button>
        </form>
      </div>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", margin: 0, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0B0B0B", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 16, boxSizing: "border-box",
  },
  card: { maxWidth: 420, width: "100%", textAlign: "center", background: "#111827", border: "1px solid #1F2937", borderRadius: 22, padding: "32px 24px" },
  logo: {
    width: 56, height: 56, borderRadius: 28, background: "#C9A24D", color: "#0B0B0B", fontWeight: 800, fontSize: 26,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 26, margin: "16px 0 8px" },
  sub: { color: "#9CA3AF", margin: "0 0 20px", lineHeight: 1.5 },
  form: { display: "flex", gap: 8 },
  input: {
    flex: 1, padding: "12px 14px", borderRadius: 14, border: "1px solid #1F2937", background: "#1A2230",
    color: "#fff", fontSize: 15, minWidth: 0,
  },
  button: { padding: "12px 16px", borderRadius: 14, border: 0, background: "#C9A24D", color: "#0B0B0B", fontWeight: 700, cursor: "pointer" },
};

export default Home;
