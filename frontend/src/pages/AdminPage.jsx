import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { API, authConfig } from "../lib/api";

const emptyCourse = { title: "", image_url: "", description: "", sort_order: 0, is_published: true };
const emptyNews = { title: "", tag: "", source: "", source_url: "", image_url: "", excerpt: "", content: "", is_published: true };

const AdminPage = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [news, setNews] = useState([]);
  const [course, setCourse] = useState(emptyCourse);
  const [article, setArticle] = useState(emptyNews);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    const loadData = async () => {
      const config = authConfig(token);
      const [courseResponse, newsResponse] = await Promise.all([
        fetch(`${API}/admin/courses`, config),
        fetch(`${API}/admin/news`, config),
      ]);
      if (!courseResponse.ok || !newsResponse.ok) throw new Error("Gagal memuat data admin");
      setCourses(await courseResponse.json());
      setNews(await newsResponse.json());
    };
    loadData().catch(() => setMessage("Gagal memuat data admin."));
  }, [token, user]);

  const loadData = async () => {
    const config = authConfig(token);
    const [courseResponse, newsResponse] = await Promise.all([
      fetch(`${API}/admin/courses`, config),
      fetch(`${API}/admin/news`, config),
    ]);
    if (!courseResponse.ok || !newsResponse.ok) throw new Error("Gagal memuat data admin");
    setCourses(await courseResponse.json());
    setNews(await newsResponse.json());
  };

  const submit = async (path, payload, reset) => {
    const response = await fetch(`${API}${path}`, {
      ...authConfig(token),
      method: "POST",
      headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setMessage("Gagal menyimpan data.");
      return;
    }
    reset();
    setMessage("Data berhasil disimpan.");
    await loadData();
  };

  const remove = async (path) => {
    const response = await fetch(`${API}${path}`, { ...authConfig(token), method: "DELETE" });
    if (response.ok) {
      setMessage("Data berhasil dihapus.");
      await loadData();
    } else setMessage("Gagal menghapus data.");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-nunito">Memuat...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div>
          <h1 className="font-fredoka text-[28px] text-[#2c5f66]">Admin Konten</h1>
          <p className="font-nunito text-[14px] text-[#5c777c]">Kelola course dan berita dari database MySQL.</p>
        </div>
        {message && <p className="font-nunito text-[13px] text-[#3aa0a0] bg-white rounded-xl px-4 py-3">{message}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form
            className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
            onSubmit={(event) => { event.preventDefault(); submit("/admin/courses", course, () => setCourse(emptyCourse)); }}
          >
            <h2 className="font-nunito font-extrabold text-[#2c4f63]">Tambah Course</h2>
            <input required placeholder="Judul course" value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <input placeholder="URL gambar" value={course.image_url} onChange={(e) => setCourse({ ...course, image_url: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <textarea placeholder="Deskripsi" value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <button className="rounded-lg bg-[#6fcccb] px-4 py-2 text-white font-nunito font-bold">Simpan Course</button>
          </form>

          <form
            className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
            onSubmit={(event) => { event.preventDefault(); submit("/admin/news", article, () => setArticle(emptyNews)); }}
          >
            <h2 className="font-nunito font-extrabold text-[#2c4f63]">Tambah Berita</h2>
            <input required placeholder="Judul berita" value={article.title} onChange={(e) => setArticle({ ...article, title: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Tag" value={article.tag} onChange={(e) => setArticle({ ...article, tag: e.target.value })} className="rounded-lg border p-2 font-nunito" />
              <input required placeholder="Sumber" value={article.source} onChange={(e) => setArticle({ ...article, source: e.target.value })} className="rounded-lg border p-2 font-nunito" />
            </div>
            <input placeholder="URL gambar" value={article.image_url} onChange={(e) => setArticle({ ...article, image_url: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <textarea placeholder="Ringkasan berita" value={article.excerpt} onChange={(e) => setArticle({ ...article, excerpt: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <textarea placeholder="Isi berita" value={article.content} onChange={(e) => setArticle({ ...article, content: e.target.value })} className="w-full rounded-lg border p-2 font-nunito" />
            <button className="rounded-lg bg-[#6fcccb] px-4 py-2 text-white font-nunito font-bold">Simpan Berita</button>
          </form>
        </div>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-nunito font-extrabold text-[#2c4f63] mb-3">Course ({courses.length})</h2>
          <div className="divide-y">
            {courses.map((item) => <div key={item.id} className="py-3 flex items-center gap-3"><span className="font-nunito flex-1">{item.title}</span><button onClick={() => remove(`/admin/courses/${item.id}`)} className="text-[#eb5757] font-nunito text-sm">Hapus</button></div>)}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-nunito font-extrabold text-[#2c4f63] mb-3">Berita ({news.length})</h2>
          <div className="divide-y">
            {news.map((item) => <div key={item.id} className="py-3 flex items-center gap-3"><span className="font-nunito flex-1">{item.title}</span><button onClick={() => remove(`/admin/news/${item.id}`)} className="text-[#eb5757] font-nunito text-sm">Hapus</button></div>)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;
