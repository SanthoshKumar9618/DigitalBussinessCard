import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";

type Profile = {
  display_name: string;
  job_title?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  whatsapp?: string;
  email?: string;
  phone?: string;
};

const PublicProfile = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE_URL}/public/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Profile not found" : "Could not load profile");
        return res.json();
      })
      .then(setProfile)
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  if (error) return <p style={{ textAlign: "center" }}>{error}</p>;
  if (!profile) return <p>Loading...</p>;

  // ✅ SAFE: profile exists here
  const avatarUrl =
    profile.avatar_url?.startsWith("http")
      ? profile.avatar_url
      : profile.avatar_url
      ? `${API_BASE_URL}${profile.avatar_url}`
      : null;


  return (
    <div style={{ maxWidth: 420, margin: "auto", textAlign: "center" }}>
      {avatarUrl && <img src={avatarUrl} width={120} alt={profile.display_name} />}

      <h1>{profile.display_name}</h1>
      <h3>
        {profile.job_title}
        {profile.company && ` · ${profile.company}`}
      </h3>

      <p>{profile.bio}</p>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {profile.phone && <a href={`tel:${profile.phone}`}>📞 Call</a>}
        {profile.whatsapp && (
          <a href={`https://wa.me/${profile.whatsapp}`}>💬 WhatsApp</a>
        )}
        {profile.email && <a href={`mailto:${profile.email}`}>✉️ Email</a>}
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer">🌐 Website</a>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
