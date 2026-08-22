import React, { useState } from "react";
import {
  User,
  Cake,
  Droplet,
  Stethoscope,
  School,
  GraduationCap,
  HeartPulse,
  Users,
  Phone,
  MapPin,
  Mail,
  CalendarDays,
  Heart,
  Pencil,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChildAvatar from "../components/ChildAvatar";
import { useChild } from "../context/ChildContext";
import { useAuth } from "../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "../components/ui/toaster";

const Field = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="h-9 w-9 rounded-xl bg-[#eafafa] flex items-center justify-center shrink-0">
      <Icon size={18} className="text-[#3aa0a0]" />
    </div>
    <div className="min-w-0">
      <div className="font-nunito text-[12px] text-[#8aa0a3]">{label}</div>
      <div className="font-nunito font-bold text-[14px] text-[#2c4f63]">{value}</div>
    </div>
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)]">
    <h2 className="font-nunito font-extrabold text-[15px] text-[#2c4f63] mb-1">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-[#f2f5f5]">
      {children}
    </div>
  </div>
);

const EDIT_FIELDS = [
  { key: "fullName", label: "Nama Lengkap" },
  { key: "nickname", label: "Nama Panggilan" },
  { key: "dob", label: "Tanggal Lahir" },
  { key: "age", label: "Usia", type: "number" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "bloodType", label: "Golongan Darah" },
  { key: "diagnosis", label: "Diagnosa" },
  { key: "diagnosisDate", label: "Waktu Diagnosa" },
  { key: "therapist", label: "Terapis" },
  { key: "school", label: "Sekolah" },
  { key: "grade", label: "Kelas" },
  { key: "parentName", label: "Nama Orang Tua" },
  { key: "parentContact", label: "Kontak" },
  { key: "email", label: "Email" },
  { key: "address", label: "Alamat" },
];

const EditProfileModal = ({ open, onOpenChange, child, onSave }) => {
  const [form, setForm] = useState(child);

  // keep form in sync when opening
  React.useEffect(() => {
    if (open) setForm(child);
  }, [open, child]);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    const payload = { ...form, age: Number(form.age) || child.age };
    onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-nunito font-extrabold text-[#2c4f63]">
            Edit Data Profil Anak
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1 py-1">
          {EDIT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="font-nunito text-[12px] text-[#5c777c]">{f.label}</Label>
              <Input
                type={f.type || "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="font-nunito text-[14px] border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
              />
            </div>
          ))}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-nunito text-[12px] text-[#5c777c]">
              Hobi (pisahkan dengan koma)
            </Label>
            <Input
              value={Array.isArray(form.hobbies) ? form.hobbies.join(", ") : form.hobbies}
              onChange={(e) =>
                handleChange(
                  "hobbies",
                  e.target.value.split(",").map((h) => h.trim()).filter(Boolean)
                )
              }
              className="font-nunito text-[14px] border-[#d8e6e6] focus-visible:ring-[#6fcccb]"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="font-nunito font-bold text-[14px] px-5 py-2.5 rounded-xl text-[#5c777c] hover:bg-[#f2f5f5] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="font-nunito font-bold text-[14px] px-5 py-2.5 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white transition-colors"
          >
            Simpan Perubahan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProfilePage = () => {
  const { child, updateChild } = useChild();
  const { user, saveChildData } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = async (payload) => {
    try {
      await saveChildData(payload);
      updateChild(payload);
      toast({ title: "Profil diperbarui", description: "Data anak berhasil disimpan." });
    } catch {
      toast({ title: "Gagal menyimpan", description: "Periksa koneksi backend lalu coba lagi." });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-gradient-to-br from-[#7fd8d3] to-[#66c7c8] rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 shadow-[0_12px_30px_-16px_rgba(90,180,180,0.9)]">
          <ChildAvatar name={child.fullName} size={92} />
          <div className="text-center sm:text-left text-white flex-1">
            <h1 className="font-fredoka font-semibold text-[26px] leading-tight">{child.fullName}</h1>
            <p className="font-nunito text-white/90 text-[14px]">
              “{child.nickname}” • {child.age} tahun
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <HeartPulse size={14} className="text-white" />
              <span className="font-nunito text-[12px] text-white">{child.diagnosis}</span>
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 bg-white text-[#2c7d7d] hover:bg-[#f2fbfb] font-nunito font-bold text-[14px] px-5 py-2.5 rounded-xl shadow transition-colors"
          >
            <Pencil size={16} /> Edit Profil
          </button>
        </div>

        <Card title="Data Pribadi">
          <Field icon={User} label="Nama Lengkap" value={child.fullName} />
          <Field icon={Heart} label="Nama Panggilan" value={child.nickname} />
          <Field icon={Cake} label="Tanggal Lahir" value={child.dob} />
          <Field icon={CalendarDays} label="Usia" value={`${child.age} tahun`} />
          <Field icon={User} label="Jenis Kelamin" value={child.gender} />
          <Field icon={Droplet} label="Golongan Darah" value={child.bloodType} />
        </Card>

        <Card title="Data Kesehatan & Terapi">
          <Field icon={HeartPulse} label="Diagnosa" value={child.diagnosis} />
          <Field icon={CalendarDays} label="Waktu Diagnosa" value={child.diagnosisDate} />
          <Field icon={Stethoscope} label="Terapis" value={child.therapist} />
          <Field
            icon={Heart}
            label="Hobi"
            value={Array.isArray(child.hobbies) ? child.hobbies.join(", ") : child.hobbies}
          />
        </Card>

        {user?.autismTest?.done && (
          <Card title="Hasil Screening Terakhir">
            <Field
              icon={HeartPulse}
              label="Metode"
              value={user.autismTest.method === "gaze" ? "Gaze Detection" : "M-CHAT"}
            />
            <Field
              icon={Stethoscope}
              label="Hasil"
              value={user.autismTest.result || user.autismTest.diagnosis || "-"}
            />
          </Card>
        )}

        <Card title="Data Sekolah">
          <Field icon={School} label="Sekolah" value={child.school} />
          <Field icon={GraduationCap} label="Kelas" value={child.grade} />
          <Field icon={CalendarDays} label="Bergabung Sejak" value={child.joinDate} />
        </Card>

        <Card title="Data Orang Tua / Wali">
          <Field icon={Users} label="Nama Orang Tua" value={child.parentName} />
          <Field icon={Phone} label="Kontak" value={child.parentContact} />
          <Field icon={Mail} label="Email" value={child.email} />
          <Field icon={MapPin} label="Alamat" value={child.address} />
        </Card>
      </main>

      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        child={child}
        onSave={handleSave}
      />
      <Toaster />
      <Footer />
    </div>
  );
};

export default ProfilePage;
