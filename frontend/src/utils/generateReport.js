import { jsPDF } from "jspdf";

// Generates a clean, structured PDF report of a child's learning progress.
export function generateProgressReport(child, progress) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 0;

  const teal = [111, 204, 203];
  const dark = [44, 79, 99];
  const gray = [120, 140, 145];

  // Header band
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("AUTIGAZE", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("EMPATHY IN MOTION", margin, 58);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Perkembangan Anak", pageW - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Dicetak: ${today}`, pageW - margin, 58, { align: "right" });

  y = 120;

  const sectionTitle = (title) => {
    doc.setFillColor(234, 250, 250);
    doc.roundedRect(margin, y - 14, pageW - margin * 2, 22, 4, 4, "F");
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin + 10, y + 1);
    y += 26;
  };

  const line = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(label, margin + 6, y);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), margin + 170, y);
    y += 18;
  };

  const paragraph = (text) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 100, 105);
    const lines = doc.splitTextToSize(text, pageW - margin * 2 - 12);
    doc.text(lines, margin + 6, y);
    y += lines.length * 13 + 6;
  };

  const bullets = (title, items) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(title, margin + 6, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 100, 105);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(`\u2022  ${it}`, pageW - margin * 2 - 20);
      doc.text(lines, margin + 14, y);
      y += lines.length * 13 + 2;
    });
    y += 6;
  };

  // Child data
  sectionTitle("Data Anak");
  line("Nama Lengkap", child.fullName);
  line("Nama Panggilan", child.nickname);
  line("Usia", `${child.age} tahun`);
  line("Diagnosa", child.diagnosis);
  line("Sekolah / Kelas", `${child.school} - ${child.grade}`);
  line("Terapis", child.therapist);
  y += 6;

  // Summary stats
  sectionTitle("Ringkasan Pembelajaran");
  line("Total Materi", progress.stats.totalMateri);
  line("Materi Selesai", progress.stats.selesai);
  line("Rata-rata Nilai", progress.stats.rataNilai);
  line("Hari Streak", progress.stats.streak);
  line("Tingkat Fokus", `${progress.focusLevel}%`);
  y += 6;

  // Category scores
  sectionTitle("Nilai per Kategori");
  progress.categoryScores.forEach((c) => line(c.name, c.nilai));
  y += 6;

  // AI Analysis
  sectionTitle("Analisis AI - Fokus & Perkembangan");
  paragraph(`Tingkat Fokus: ${progress.ai.focusSummary}`);
  paragraph(`Perkembangan: ${progress.ai.developmentSummary}`);
  bullets("Kelebihan:", progress.ai.strengths);
  bullets("Perlu Ditingkatkan:", progress.ai.improvements);
  bullets("Rekomendasi:", progress.ai.recommendations);

  // Completed materials (new page if needed)
  if (y > 680) {
    doc.addPage();
    y = 60;
  }
  sectionTitle("Materi yang Diselesaikan");
  progress.completedMaterials.forEach((m) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(`${m.title}`, margin + 6, y);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(`${m.category} - ${m.date}`, margin + 6, y + 12);
    doc.setTextColor(58, 160, 160);
    doc.setFont("helvetica", "bold");
    doc.text(`Nilai: ${m.score}`, pageW - margin - 6, y, { align: "right" });
    y += 30;
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
  });

  // Footer note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 165, 168);
  doc.text(
    "\u00a9 2026 AutiGaze Eureka - Laporan ini dibuat otomatis sebagai gambaran perkembangan.",
    margin,
    doc.internal.pageSize.getHeight() - 24
  );

  doc.save(`Laporan_${child.nickname}_AutiGaze.pdf`);
}
