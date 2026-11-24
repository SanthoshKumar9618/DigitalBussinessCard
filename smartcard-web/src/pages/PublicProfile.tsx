import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { API_BASE_URL } from "../services/api";

/**
 * The recipient page is server-rendered by the API (`/public/view/:slug`):
 * fast first paint, works without JavaScript, includes "Save contact" (.vcf)
 * and "Share my details" (lead capture). This route forwards there so links
 * on your own domain (e.g. https://yourdomain.com/priya-sharma) keep working.
 */
const PublicProfile = () => {
  const { slug } = useParams();
  const { search } = useLocation();

  useEffect(() => {
    if (!slug) return;
    const params = new URLSearchParams(search);
    if (!params.has("src")) params.set("src", "link");
    window.location.replace(
      `${API_BASE_URL}/public/view/${encodeURIComponent(slug)}?${params.toString()}`
    );
  }, [slug, search]);

  return (
    <p style={{ textAlign: "center", fontFamily: "system-ui", marginTop: "40vh", color: "#9CA3AF" }}>
      Opening profile…
    </p>
  );
};

export default PublicProfile;
