import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Gagal masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Selamat Datang Kembali"
      subtitle="Masuk untuk melanjutkan pembelajaran"
      footer={
        <span className="font-nunito text-[14px] text-[#5c777c]">
          Belum punya akun?{" "}
          <Link to="/signup" className="font-bold text-[#3aa0a0] hover:underline">
            Daftar sekarang
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="font-nunito text-[13px] text-[#5c777c]">Email</Label>
          <div className="relative">
            <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9fb2b3]" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="pl-9 h-11 font-nunito border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-nunito text-[13px] text-[#5c777c]">Kata Sandi</Label>
          <div className="relative">
            <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9fb2b3]" />
            <Input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9 pr-10 h-11 font-nunito border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9fb2b3] hover:text-[#5c777c]"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="font-nunito text-[13px] text-[#eb5757] bg-[#ffeaea] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Masuk
        </button>
      </form>
    </AuthShell>
  );
};

export default SignInPage;
