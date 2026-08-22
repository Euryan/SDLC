import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ClipboardCheck,
  ScanEye,
  ArrowRight,
} from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { useChild } from "../context/ChildContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const STEPS = ["Akun", "Data Anak", "Tes Autisme"];

const Field = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <Label className="font-nunito text-[13px] text-[#5c777c]">{label}</Label>
    <Input
      {...props}
      className="h-11 font-nunito border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
    />
  </div>
);

const Stepper = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex flex-col items-center gap-1">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center font-nunito font-bold text-[13px] transition-all ${
              i < current
                ? "bg-[#3ea45f] text-white"
                : i === current
                ? "bg-[#6fcccb] text-white"
                : "bg-[#e7ecec] text-[#9fb2b3]"
            }`}
          >
            {i < current ? <Check size={16} /> : i + 1}
          </div>
          <span className="font-nunito text-[10px] text-[#8aa0a3]">{label}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={`h-0.5 w-8 mb-4 rounded ${i < current ? "bg-[#3ea45f]" : "bg-[#e7ecec]"}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register, saveChildData, saveAutismTest } = useAuth();
  const { updateChild } = useChild();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [account, setAccount] = useState({ name: "", email: "", password: "", confirm: "" });
  const [child, setChild] = useState({
    fullName: "",
    nickname: "",
    age: "",
    dob: "",
    gender: "",
    school: "",
    grade: "",
    parentName: "",
    parentContact: "",
  });
  const [testChoice, setTestChoice] = useState(null); // "done" | "not"
  const [diagnosis, setDiagnosis] = useState("");

  const setA = (k, v) => setAccount((s) => ({ ...s, [k]: v }));
  const setC = (k, v) => setChild((s) => ({ ...s, [k]: v }));

  // Step 1: create account
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (account.password !== account.confirm) {
      setError("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setLoading(true);
    try {
      await register(account.name, account.email, account.password);
      setStep(1);
    } catch (err) {
      setError(err?.response?.data?.detail || "Gagal mendaftar. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: save child data
  const handleChildData = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const payload = { ...child, age: Number(child.age) || null };
    try {
      await saveChildData(payload);
      updateChild(payload); // reflect in profile page
      setStep(2);
    } catch (err) {
      setError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: finish (done with diagnosis) or go screening
  const finishWithDiagnosis = async () => {
    setLoading(true);
    try {
      await saveAutismTest({ done: true, diagnosis, method: "diagnosa" });
      navigate("/");
    } catch {
      setError("Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  };

  const goScreening = async () => {
    await saveAutismTest({ done: false }).catch(() => {});
    navigate("/screening");
  };

  const skipForNow = async () => {
    await saveAutismTest({ done: false }).catch(() => {});
    navigate("/");
  };

  return (
    <AuthShell
      title="Buat Akun Baru"
      subtitle="Mulai perjalanan belajar bersama AutiGaze"
      footer={
        step === 0 ? (
          <span className="font-nunito text-[14px] text-[#5c777c]">
            Sudah punya akun?{" "}
            <Link to="/signin" className="font-bold text-[#3aa0a0] hover:underline">
              Masuk di sini
            </Link>
          </span>
        ) : null
      }
    >
      <Stepper current={step} />

      {error && (
        <p className="font-nunito text-[13px] text-[#eb5757] bg-[#ffeaea] rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Step 1: Account */}
      {step === 0 && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-nunito text-[13px] text-[#5c777c]">Nama Akun</Label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9fb2b3]" />
              <Input
                required
                value={account.name}
                onChange={(e) => setA("name", e.target.value)}
                placeholder="Nama Anda"
                className="pl-9 h-11 font-nunito border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="font-nunito text-[13px] text-[#5c777c]">Email</Label>
            <div className="relative">
              <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9fb2b3]" />
              <Input
                type="email"
                required
                value={account.email}
                onChange={(e) => setA("email", e.target.value)}
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
                minLength={6}
                value={account.password}
                onChange={(e) => setA("password", e.target.value)}
                placeholder="Minimal 6 karakter"
                className="pl-9 pr-10 h-11 font-nunito border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9fb2b3]"
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <Field
            label="Konfirmasi Kata Sandi"
            type="password"
            required
            value={account.confirm}
            onChange={(e) => setA("confirm", e.target.value)}
            placeholder="Ulangi kata sandi"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Lanjut
          </button>
        </form>
      )}

      {/* Step 2: Child data */}
      {step === 1 && (
        <form onSubmit={handleChildData} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Lengkap Anak" required value={child.fullName} onChange={(e) => setC("fullName", e.target.value)} />
            <Field label="Nama Panggilan" required value={child.nickname} onChange={(e) => setC("nickname", e.target.value)} />
            <Field label="Usia" type="number" required value={child.age} onChange={(e) => setC("age", e.target.value)} />
            <Field label="Tanggal Lahir" placeholder="cth: 12 Mar 2018" value={child.dob} onChange={(e) => setC("dob", e.target.value)} />
            <Field label="Jenis Kelamin" placeholder="Laki-laki / Perempuan" value={child.gender} onChange={(e) => setC("gender", e.target.value)} />
            <Field label="Sekolah" value={child.school} onChange={(e) => setC("school", e.target.value)} />
            <Field label="Kelas" value={child.grade} onChange={(e) => setC("grade", e.target.value)} />
            <Field label="Nama Orang Tua" value={child.parentName} onChange={(e) => setC("parentName", e.target.value)} />
          </div>
          <Field label="Kontak Orang Tua" placeholder="+62 ..." value={child.parentContact} onChange={(e) => setC("parentContact", e.target.value)} />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Lanjut
          </button>
        </form>
      )}

      {/* Step 3: Autism test */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="font-nunito text-[15px] text-[#2c4f63] font-bold text-center">
            Apakah anak sudah pernah melakukan tes / screening autisme?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTestChoice("done")}
              className={`rounded-xl border-2 py-4 font-nunito font-bold text-[14px] transition-all ${
                testChoice === "done"
                  ? "border-[#6fcccb] bg-[#eafafa] text-[#2c5f66]"
                  : "border-[#e2ebec] text-[#5c777c] hover:border-[#bfe6e6]"
              }`}
            >
              Sudah pernah
            </button>
            <button
              onClick={() => setTestChoice("not")}
              className={`rounded-xl border-2 py-4 font-nunito font-bold text-[14px] transition-all ${
                testChoice === "not"
                  ? "border-[#6fcccb] bg-[#eafafa] text-[#2c5f66]"
                  : "border-[#e2ebec] text-[#5c777c] hover:border-[#bfe6e6]"
              }`}
            >
              Belum pernah
            </button>
          </div>

          {testChoice === "done" && (
            <div className="space-y-4 animate-fadeIn">
              <Field
                label="Hasil / Diagnosa (opsional)"
                placeholder="cth: Autism Spectrum Disorder (Level 1)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
              <button
                onClick={finishWithDiagnosis}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Selesai & Masuk ke Beranda
              </button>
            </div>
          )}

          {testChoice === "not" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="rounded-xl bg-[#eafafa] p-4 flex items-start gap-3">
                <ClipboardCheck size={20} className="text-[#3aa0a0] shrink-0 mt-0.5" />
                <p className="font-nunito text-[13px] text-[#4c6a70]">
                  Kami sarankan melakukan screening awal untuk memahami kebutuhan anak lebih baik.
                </p>
              </div>
              <button
                onClick={goScreening}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7fd8d3] to-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-all hover:brightness-105 flex items-center justify-center gap-2"
              >
                <ScanEye size={18} /> Screening Autisme
                <ArrowRight size={16} />
              </button>
              <button
                onClick={skipForNow}
                className="w-full font-nunito text-[13px] text-[#8aa0a3] hover:text-[#5c777c] py-1"
              >
                Lewati untuk sekarang
              </button>
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
};

export default SignUpPage;
