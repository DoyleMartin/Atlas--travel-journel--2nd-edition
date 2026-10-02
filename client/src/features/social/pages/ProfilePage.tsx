import { useParams } from 'react-router';
import './ProfilePage.css';

// TODO (5a): public profile — map, stats, trips, follow button
export default function ProfilePage() {
  const { username } = useParams();

  return (
    <section className="profile-page profile-page--placeholder">
      <h1>@{username}</h1>
      <p>Profiles are coming soon.</p>
    </section>
  );
}
