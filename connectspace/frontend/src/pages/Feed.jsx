import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Composer from '../components/Composer.jsx';
import PostCard from '../components/PostCard.jsx';

export default function Feed() {
  const [posts, setPosts] = useState(null); // null = masih memuat
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/posts')
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message));
  }, []);

  // Post baru selalu ditaruh paling atas (urutan terbaru lebih dulu).
  const addPost = (post) => setPosts((list) => [post, ...(list || [])]);
  const removePost = (id) => setPosts((list) => list.filter((p) => p.id !== id));
  // patch boleh berupa objek, atau fungsi (post saat ini) => objek, supaya tidak memakai state basi.
  const updatePost = (id, patch) =>
    setPosts((list) =>
      list.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p))
    );

  return (
    <section className="column" aria-label="Beranda">
      <Composer onCreated={addPost} />

      {error && (
        <p className="empty" role="alert">
          {error}
        </p>
      )}
      {posts === null && !error && <p className="empty">Memuat beranda…</p>}
      {posts && posts.length === 0 && <p className="empty">Belum ada status. Tulis yang pertama di atas.</p>}

      {posts &&
        posts.map((post) => <PostCard key={post.id} post={post} onChange={updatePost} onDelete={removePost} />)}
    </section>
  );
}
