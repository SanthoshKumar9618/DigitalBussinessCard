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

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/${slug}`)
      .then(res => res.json())
      .then(setProfile);
  }, [slug]);

  // ⛔ Wait until profile is loaded
  if (!profile) return <p>Loading...</p>;

  // ✅ SAFE: profile exists here
  const avatarUrl =
    profile.avatar_url?.startsWith("http")
      ? profile.avatar_url
      : profile.avatar_url
      ? `${API_BASE_URL}${profile.avatar_url}`
      : null;

    console.log("SLUG FROM URL:", slug);


  return (
    <div style={{ maxWidth: 420, margin: "auto", textAlign: "center" }}>
      {avatarUrl && <img src={avatarUrl} width={120} />}

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
          <a href={profile.website} target="_blank">🌐 Website</a>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
