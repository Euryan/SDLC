CREATE DATABASE IF NOT EXISTS autigaze
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autigaze;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  child JSON NOT NULL,
  autism_test JSON NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS child_profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(150) NULL,
  nickname VARCHAR(80) NULL,
  age TINYINT UNSIGNED NULL,
  dob DATE NULL,
  gender VARCHAR(40) NULL,
  blood_type VARCHAR(5) NULL,
  diagnosis VARCHAR(255) NULL,
  diagnosis_date VARCHAR(80) NULL,
  school VARCHAR(150) NULL,
  grade VARCHAR(80) NULL,
  therapist VARCHAR(150) NULL,
  hobbies JSON NULL,
  parent_name VARCHAR(150) NULL,
  parent_contact VARCHAR(40) NULL,
  address TEXT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_child_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_categories (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  color VARCHAR(20) NULL,
  description VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_category_map (
  course_id VARCHAR(80) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (course_id, category_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chapters (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  course_id VARCHAR(80) NULL,
  title VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lessons (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  chapter_id VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  stage_title VARCHAR(255) NOT NULL,
  speech VARCHAR(255) NULL,
  description TEXT NULL,
  show_body_estimation BOOLEAN NOT NULL DEFAULT FALSE,
  content_type ENUM('vrm', 'image', 'video', 'article', 'visual_novel') NOT NULL DEFAULT 'vrm',
  media_url TEXT NULL,
  material_text TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  quiz_type VARCHAR(50) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  quiz_id VARCHAR(80) NOT NULL,
  prompt VARCHAR(255) NOT NULL,
  question_text VARCHAR(255) NOT NULL,
  options JSON NOT NULL,
  answer_key VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS news_articles (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  tag VARCHAR(80) NOT NULL,
  source VARCHAR(150) NOT NULL,
  source_url TEXT NULL,
  image_url TEXT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  published_at TIMESTAMP(6) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_progress (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  lesson_id VARCHAR(80) NOT NULL,
  status ENUM('started', 'completed') NOT NULL DEFAULT 'started',
  focus_score DECIMAL(5,2) NULL,
  score DECIMAL(5,2) NULL,
  duration_seconds INT NULL,
  started_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  completed_at TIMESTAMP(6) NULL,
  UNIQUE KEY uq_user_lesson (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_completion_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  lesson_id VARCHAR(80) NOT NULL,
  completed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS focus_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  lesson_id VARCHAR(80) NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO lesson_completion_events (id, user_id, lesson_id, completed_at)
SELECT UUID(), lp.user_id, lp.lesson_id, COALESCE(lp.completed_at, CURRENT_TIMESTAMP(6))
FROM lesson_progress lp
WHERE lp.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_completion_events event
    WHERE event.user_id = lp.user_id AND event.lesson_id = lp.lesson_id
  );

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  quiz_id VARCHAR(80) NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_answers (
  attempt_id CHAR(36) NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  answer VARCHAR(255) NULL,
  is_correct BOOLEAN NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_activity (
  user_id CHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  minutes INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, activity_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screening_definitions (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  method ENUM('gaze', 'mchat') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  video_id VARCHAR(100) NULL,
  version VARCHAR(30) NOT NULL DEFAULT '1.0',
  is_published BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screening_questions (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  definition_id VARCHAR(80) NOT NULL,
  question_text TEXT NOT NULL,
  risk_answer VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (definition_id) REFERENCES screening_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screening_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  definition_id VARCHAR(80) NOT NULL,
  score INT NULL,
  result VARCHAR(255) NULL,
  gaze_data JSON NULL,
  analysis JSON NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (definition_id) REFERENCES screening_definitions(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screening_answers (
  session_id CHAR(36) NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  answer VARCHAR(20) NOT NULL,
  PRIMARY KEY (session_id, question_id),
  FOREIGN KEY (session_id) REFERENCES screening_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES screening_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS status_checks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  audience ENUM('child', 'parent') NOT NULL DEFAULT 'child',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (conversation_id) REFERENCES companion_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_settings (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  persona ENUM('ceria', 'tenang', 'netral') NOT NULL DEFAULT 'netral',
  topic_restrictions TEXT NULL,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_session_summaries (
  user_id CHAR(36) NOT NULL,
  session_date DATE NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  summary TEXT NULL,
  generated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, session_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS companion_conversation_summaries (
  conversation_id CHAR(36) NOT NULL PRIMARY KEY,
  message_count INT NOT NULL DEFAULT 0,
  summary TEXT NULL,
  generated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (conversation_id) REFERENCES companion_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO course_categories (id, title, color, description, sort_order) VALUES
  ('visual', 'Pembelajaran Visual', '#eb8f8f', 'Belajar dengan gambar', 1),
  ('emosi', 'Pembelajaran Emosi', '#f0dd93', 'Mengenal perasaan', 2),
  ('motorik', 'Pembelajaran Motorik', '#8fce9a', 'Latihan gerak tubuh', 3);

INSERT IGNORE INTO courses (id, title, image_url, sort_order) VALUES
  ('c-alfabet', 'Ayo belajar Alfabet!', 'https://images.unsplash.com/photo-1539632346654-dd4c3cffad8c?auto=format&fit=crop&w=900&q=85', 1),
  ('c-berhitung', 'Ayo Belajar Berhitung', 'https://images.pexels.com/photos/1329297/pexels-photo-1329297.jpeg?auto=compress&cs=tinysrgb&w=900', 2),
  ('c-hewan', 'Mari Mengenal nama-nama Hewan', 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=900&q=85', 3),
  ('c-buah', 'Mari Mengenal nama-nama Buah!', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=85', 4),
  ('c-alattulis', 'Mari Mengenal nama-nama Alat Tulis!', 'https://images.unsplash.com/photo-1501349800519-48093d60bde0?auto=format&fit=crop&w=900&q=85', 5),
  ('c-keluarga', 'Ayo mengenal nama-nama anggota keluarga', 'https://images.unsplash.com/photo-1588979355313-6711a095465f?auto=format&fit=crop&w=900&q=85', 6),
  ('c-emosi', 'Belajar Mengenal Emosi', NULL, 2),
  ('e-sapa-perasaan', 'Mengenal Perasaan Sehari-hari', NULL, 3),
  ('e-ekspresi', 'Mengenal Ekspresi Wajah', NULL, 4),
  ('e-emosi-diri', 'Memahami Perasaan Diri', NULL, 5),
  ('e-emosi-teman', 'Memahami Perasaan Teman', NULL, 6),
  ('e-tenang', 'Latihan Menenangkan Diri', NULL, 7),
  ('c-motorik', 'Latihan Motorik', NULL, 8),
  ('m-koordinasi', 'Latihan Koordinasi Tubuh', NULL, 9),
  ('m-gerak-dasar', 'Gerak Dasar', NULL, 10),
  ('m-keseimbangan', 'Latihan Keseimbangan', NULL, 11),
  ('m-tangan', 'Keterampilan Tangan', NULL, 12),
  ('m-aktivitas', 'Aktivitas Motorik Harian', NULL, 13);

DELETE FROM course_category_map
WHERE category_id IN ('visual', 'emosi', 'motorik');
INSERT IGNORE INTO course_category_map (course_id, category_id) VALUES
  ('c-alfabet', 'visual'), ('c-berhitung', 'visual'), ('c-hewan', 'visual'),
  ('c-buah', 'visual'), ('c-alattulis', 'visual'), ('c-keluarga', 'visual'),
  ('c-emosi', 'emosi'), ('e-sapa-perasaan', 'emosi'), ('e-ekspresi', 'emosi'),
  ('e-emosi-diri', 'emosi'), ('e-emosi-teman', 'emosi'), ('e-tenang', 'emosi'),
  ('c-motorik', 'motorik'), ('m-koordinasi', 'motorik'), ('m-gerak-dasar', 'motorik'),
  ('m-keseimbangan', 'motorik'), ('m-tangan', 'motorik'), ('m-aktivitas', 'motorik');

UPDATE chapters SET course_id = 'c-motorik' WHERE course_id IS NULL;
INSERT IGNORE INTO chapters (id, course_id, title, sort_order) VALUES
  ('ch-1', 'c-motorik', 'Sapa Pagi!', 1), ('ch-2', 'c-motorik', 'Ekspresi dan Kontak Mata', 2),
  ('ch-3', 'c-motorik', 'Koordinasi Gerak', 3), ('ch-4', 'c-motorik', 'Berpamitan', 4),
  ('ch-5', 'c-alfabet', 'Mengenal Huruf', 1), ('ch-6', 'c-emosi', 'Mengenal Emosi', 1),
  ('ch-7', 'm-koordinasi', 'Koordinasi Tubuh', 1), ('ch-8', 'm-gerak-dasar', 'Gerak Dasar', 1),
  ('ch-9', 'm-keseimbangan', 'Keseimbangan', 1), ('ch-10', 'm-tangan', 'Keterampilan Tangan', 1),
  ('ch-11', 'm-aktivitas', 'Aktivitas Harian', 1), ('ch-12', 'c-alattulis', 'Mengenal Alat Tulis', 1);

INSERT IGNORE INTO lessons (id, chapter_id, name, stage_title, speech, description, show_body_estimation, content_type, media_url, material_text, sort_order) VALUES
  ('m-0', 'ch-1', 'Mengenal Sapaan', 'Materi Awal: Mengenal Sapaan', NULL, 'Kenali contoh sapaan sebelum mulai berlatih.', FALSE, 'image', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=85', 'Menyapa adalah cara kita menunjukkan keramahan kepada orang lain. Awali dengan melihat teman, tersenyum, lalu mengucapkan salam.', 0),
  ('m-1', 'ch-1', 'Menyapa', 'Motorik: Menyapa Halo!', 'Haii!!', 'Latihan gerak motorik untuk menyapa teman dengan melambaikan tangan dan berkata halo.', TRUE, 'vrm', NULL, NULL, 1),
  ('m-2', 'ch-1', 'Pembahasan pagi Hari', 'Motorik: Pembahasan Pagi Hari', 'Selamat pagi!', 'Belajar mengungkapkan salam pagi dan menceritakan kegiatan pagi dengan percaya diri.', TRUE, 'vrm', NULL, NULL, 2),
  ('m-3', 'ch-1', 'Sapa Pagi!', 'Motorik: Sapa Pagi!', 'Ohayou~', 'Mempraktikkan sapaan pagi dengan kontak mata dan senyuman yang ramah.', TRUE, 'vrm', NULL, NULL, 3),
  ('m-12', 'ch-1', 'Video Cara Menyapa', 'Video Materi: Cara Menyapa', NULL, 'Tonton video untuk melihat contoh cara menyapa dengan ramah.', FALSE, 'video', 'https://www.youtube.com/embed/VIDEO_ID', 'Perhatikan cara melihat lawan bicara, tersenyum, dan mengucapkan salam.', 4),
  ('m-18', 'ch-1', 'Cerita Sapa Teman Baru', 'Visual Novel: Sapa Teman Baru', NULL, 'Ikuti percakapan interaktif dan ketuk untuk melanjutkan dialog.', FALSE, 'visual_novel', NULL, '[{"speaker":"Luna","text":"Hai! Namaku Luna. Siapa namamu?","animationId":"greeting"},{"speaker":"Luna","text":"Senang sekali bisa berkenalan denganmu hari ini.","animationId":"talking"},{"speaker":"[Kamu]","text":"Ayo Sapa Luna dengan melambaikan Tanganmu!","animationId":"greeting","requiresWave":true},{"speaker":"Luna","text":"Wah kamu hebat!","animationId":"peace","voiceUrl":"/sound/Wahkamuhebat.wav"},{"speaker":"Luna","text":"Yuk, kita coba sapa teman lain dengan senyum dan kontak mata!","animationId":"peace"}]', 5),
  ('m-4', 'ch-2', 'Ekspresi Wajah', 'Emosi: Ekspresi Wajah Bahagia', 'Senyum :)', 'Mengenali dan meniru ekspresi wajah bahagia untuk komunikasi sosial.', TRUE, 'vrm', NULL, NULL, 1),
  ('m-5', 'ch-2', 'Kontak Mata', 'Emosi: Melatih Kontak Mata', 'Lihat aku~', 'Latihan menjaga kontak mata saat berbicara dengan teman.', TRUE, 'vrm', NULL, NULL, 2),
  ('m-6', 'ch-3', 'Bertepuk Tangan', 'Motorik: Bertepuk Tangan', 'Yeay!!', 'Melatih koordinasi tangan dengan gerakan bertepuk tangan bersama.', TRUE, 'vrm', NULL, NULL, 1),
  ('m-7', 'ch-3', 'Menunjuk Objek', 'Motorik: Menunjuk Objek', 'Itu apa?', 'Belajar menunjuk objek untuk menyampaikan keinginan dan rasa ingin tahu.', TRUE, 'vrm', NULL, NULL, 2),
  ('m-8', 'ch-4', 'Berpamitan', 'Motorik: Berpamitan Dadah', 'Dadah~', 'Latihan gerak melambaikan tangan untuk berpamitan dengan sopan.', TRUE, 'vrm', NULL, NULL, 1),
  ('m-9', 'ch-4', 'Mengangguk', 'Motorik: Mengangguk Setuju', 'Iya, boleh!', 'Mengenal gerakan mengangguk sebagai tanda setuju dalam percakapan.', TRUE, 'vrm', NULL, NULL, 2),
  ('m-10', 'ch-5', 'Huruf A', 'Mengenal Huruf A', NULL, 'Belajar mengenali dan menyebutkan huruf A.', FALSE, 'article', NULL, 'Huruf A adalah huruf pertama dalam alfabet. Coba sebutkan: A.', 1),
  ('m-11', 'ch-6', 'Mengenal Perasaan', 'Mengenal Perasaan', NULL, 'Belajar mengenali perasaan senang, sedih, dan marah.', FALSE, 'article', NULL, 'Setiap perasaan boleh dirasakan. Mari kenali perasaanmu hari ini.', 1),
  ('m-13', 'ch-7', 'Gerak Bersama', 'Koordinasi Tubuh', NULL, 'Latihan menggerakkan tangan dan kaki secara terkoordinasi.', FALSE, 'article', NULL, 'Ikuti gerakan secara perlahan dan nyaman.', 1),
  ('m-14', 'ch-8', 'Gerak Dasar', 'Mengenal Gerak Dasar', NULL, 'Latihan gerak dasar tubuh.', FALSE, 'article', NULL, 'Ayo bergerak bersama.', 1),
  ('m-15', 'ch-9', 'Berdiri Seimbang', 'Latihan Keseimbangan', NULL, 'Latihan menjaga keseimbangan tubuh.', FALSE, 'article', NULL, 'Berdirilah dengan aman dan perlahan.', 1),
  ('m-16', 'ch-10', 'Gerak Jari', 'Keterampilan Tangan', NULL, 'Latihan koordinasi jari dan tangan.', FALSE, 'article', NULL, 'Gunakan tangan dengan hati-hati.', 1),
  ('m-17', 'ch-11', 'Aktivitas Harian', 'Motorik dalam Aktivitas Harian', NULL, 'Latihan gerak sederhana dalam aktivitas harian.', FALSE, 'article', NULL, 'Lakukan setiap gerakan dengan nyaman.', 1),
  ('m-19', 'ch-12', 'Mengenal Pensil', 'Visual Novel: Mengenal Pensil', NULL, 'Ikuti cerita Luna mengenalkan pensil, lalu jawab kuisnya!', FALSE, 'visual_novel', '/images/papantulis.jpg', '[{"speaker":"Luna","text":"Pensil","animationId":"greeting","voiceUrl":"/sound/Pensil.wav","image":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},{"speaker":"Luna","text":"Pensil digunakan untuk menulis dan menggambar. Coretannya bisa dihapus dengan penghapus jika ada yang salah.","animationId":"talking","image":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},{"speaker":"Luna","text":"Sekarang, coba tunjukkan mana gambar Pensil yang tadi kita pelajari!","animationId":"thinking","quiz":{"options":[{"id":"pensil","label":"Pensil","imageUrl":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":true},{"id":"penghapus","label":"Penghapus","imageUrl":"https://images.unsplash.com/photo-1667532447990-51c6704ef358?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":false},{"id":"pulpen","label":"Pulpen","imageUrl":"https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":false}]}},{"speaker":"Luna","text":"Betul sekali, itu Pensil! Kamu hebat mengenali alat tulis.","animationId":"peace","voiceUrl":"/sound/Wahkamuhebat.wav"}]', 1);

-- Keep the visual novel scripts in sync on already-seeded databases (INSERT IGNORE above won't update existing rows).
UPDATE lessons SET material_text = '[{"speaker":"Luna","text":"Hai! Namaku Luna. Siapa namamu?","animationId":"greeting"},{"speaker":"Luna","text":"Senang sekali bisa berkenalan denganmu hari ini.","animationId":"talking"},{"speaker":"[Kamu]","text":"Ayo Sapa Luna dengan melambaikan Tanganmu!","animationId":"greeting","requiresWave":true},{"speaker":"Luna","text":"Wah kamu hebat!","animationId":"peace","voiceUrl":"/sound/Wahkamuhebat.wav"},{"speaker":"Luna","text":"Yuk, kita coba sapa teman lain dengan senyum dan kontak mata!","animationId":"peace"}]', content_type = 'visual_novel' WHERE id = 'm-18';
UPDATE lessons SET media_url = '/images/papantulis.jpg', content_type = 'visual_novel', material_text = '[{"speaker":"Luna","text":"Pensil","animationId":"greeting","voiceUrl":"/sound/Pensil.wav","image":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},{"speaker":"Luna","text":"Pensil digunakan untuk menulis dan menggambar. Coretannya bisa dihapus dengan penghapus jika ada yang salah.","animationId":"talking","image":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},{"speaker":"Luna","text":"Sekarang, coba tunjukkan mana gambar Pensil yang tadi kita pelajari!","animationId":"thinking","quiz":{"options":[{"id":"pensil","label":"Pensil","imageUrl":"https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":true},{"id":"penghapus","label":"Penghapus","imageUrl":"https://images.unsplash.com/photo-1667532447990-51c6704ef358?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":false},{"id":"pulpen","label":"Pulpen","imageUrl":"https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","correct":false}]}},{"speaker":"Luna","text":"Betul sekali, itu Pensil! Kamu hebat mengenali alat tulis.","animationId":"peace","voiceUrl":"/sound/Wahkamuhebat.wav"}]' WHERE id = 'm-19';

INSERT IGNORE INTO quizzes (id, category_id, title, quiz_type) VALUES
  ('quiz-visual', 'visual', 'Pembelajaran Visual', 'letter'),
  ('quiz-emosi', 'emosi', 'Pembelajaran Emosi', 'emotion');

INSERT IGNORE INTO quiz_questions (id, quiz_id, prompt, question_text, options, answer_key, sort_order) VALUES
  ('v-q1', 'quiz-visual', 'A', 'Huruf Di Atas Merupakan?', '["A","C","B"]', 'A', 1),
  ('v-q2', 'quiz-visual', 'B', 'Huruf Di Atas Merupakan?', '["D","B","P"]', 'B', 2),
  ('v-q3', 'quiz-visual', 'C', 'Huruf Di Atas Merupakan?', '["G","O","C"]', 'C', 3),
  ('v-q4', 'quiz-visual', 'D', 'Huruf Di Atas Merupakan?', '["D","B","O"]', 'D', 4),
  ('e-q1', 'quiz-emosi', 'happy', 'Ekspresi Di Atas Merupakan?', '["Senang","Sedih","Marah"]', 'Senang', 1),
  ('e-q2', 'quiz-emosi', 'sad', 'Ekspresi Di Atas Merupakan?', '["Senang","Sedih","Terkejut"]', 'Sedih', 2),
  ('e-q3', 'quiz-emosi', 'angry', 'Ekspresi Di Atas Merupakan?', '["Takut","Marah","Senang"]', 'Marah', 3),
  ('e-q4', 'quiz-emosi', 'surprised', 'Ekspresi Di Atas Merupakan?', '["Terkejut","Sedih","Marah"]', 'Terkejut', 4);

INSERT IGNORE INTO news_articles (id, title, tag, source, source_url, image_url, excerpt, content, published_at) VALUES
  ('n-1', 'Gejala dan Diagnosa anak Autism', 'Kesehatan', 'AutiGaze Health', 'https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders', 'https://images.unsplash.com/photo-1776057441567-ac16f7b9dd6f?auto=format&fit=crop&w=900&q=85', 'Mengenali tanda-tanda awal autisme pada anak dan langkah diagnosa yang tepat bersama ahli.', 'Autisme adalah kondisi perkembangan saraf yang memengaruhi komunikasi, interaksi, dan perilaku. Diagnosa dini membantu keluarga mendapatkan dukungan yang tepat.', CURRENT_TIMESTAMP),
  ('n-2', 'Cara Berkomunikasi Dengan Anak Autism', 'Parenting', 'AutiGaze Parenting', 'https://www.autismspeaks.org/communication', 'https://images.pexels.com/photos/6297609/pexels-photo-6297609.jpeg?auto=compress&cs=tinysrgb&w=900', 'Tips praktis membangun komunikasi hangat dan penuh empati dengan anak penyandang autisme.', 'Gunakan kalimat singkat dan jelas, beri waktu untuk memproses informasi, dan manfaatkan bantuan visual.', CURRENT_TIMESTAMP),
  ('n-3', 'Tokoh Sukses Dunia yang memiliki Autism', 'Inspirasi', 'AutiGaze Stories', 'https://www.autism.org.uk/', 'https://images.pexels.com/photos/8385977/pexels-photo-8385977.jpeg?auto=compress&cs=tinysrgb&w=900', 'Kisah inspiratif tokoh dunia yang membuktikan bahwa autisme bukan penghalang untuk sukses.', 'Setiap individu memiliki potensi unik. Lingkungan yang mendukung membantu potensi tersebut berkembang.', CURRENT_TIMESTAMP),
  ('n-4', 'Kisah Asho Pengidap Autisme Yang Menaklukan Marathon 42 Km', 'Olahraga', 'AutiGaze Sports', 'https://www.autismspeaks.org/', 'https://images.pexels.com/photos/29840338/pexels-photo-29840338.jpeg?auto=compress&cs=tinysrgb&w=900', 'Perjuangan luar biasa Asho menyelesaikan lari marathon penuh 42 kilometer.', 'Rutinitas latihan yang terstruktur dapat membantu menjaga fokus dan disiplin.', CURRENT_TIMESTAMP),
  ('n-5', 'Albert Einstein Ilmuan pengidap Autisme', 'Sains', 'AutiGaze Science', 'https://www.autism.org.uk/', 'https://images.pexels.com/photos/8439003/pexels-photo-8439003.jpeg?auto=compress&cs=tinysrgb&w=900', 'Menelusuri jejak sang jenius fisika yang diyakini memiliki ciri-ciri spektrum autisme.', 'Cara berpikir yang berbeda dapat melahirkan penemuan yang mengubah dunia.', CURRENT_TIMESTAMP),
  ('n-6', 'Bill Gates Miliarder dengan gejala Autisme', 'Teknologi', 'AutiGaze Tech', 'https://www.autismspeaks.org/', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=85', 'Sisi lain sang pendiri Microsoft dan kaitannya dengan karakteristik spektrum autisme.', 'Keunikan cara berpikir dapat menjadi fondasi kesuksesan di era modern.', CURRENT_TIMESTAMP);

INSERT IGNORE INTO screening_definitions (id, method, title, description, video_id, version) VALUES
  ('screening-gaze-v1', 'gaze', 'Screening via Gaze Section', 'Anak menonton video pendek sementara sistem mengamati arah pandangan (gaze) dan atensi. Hasil bersifat indikatif.', 'yb5B8f6MTv0', '1.0'),
  ('screening-mchat-v1', 'mchat', 'M-CHAT Screening', 'Kuesioner indikatif untuk membantu observasi perkembangan anak. Bukan diagnosis medis.', NULL, '1.0');

INSERT IGNORE INTO screening_questions (id, definition_id, question_text, risk_answer, sort_order) VALUES
  ('mchat-q1', 'screening-mchat-v1', 'Apakah anak menunjuk sesuatu untuk menunjukkan ketertarikan?', 'no', 1),
  ('mchat-q2', 'screening-mchat-v1', 'Apakah anak menoleh saat namanya dipanggil?', 'no', 2),
  ('mchat-q3', 'screening-mchat-v1', 'Apakah anak melakukan kontak mata saat berinteraksi?', 'no', 3),
  ('mchat-q4', 'screening-mchat-v1', 'Apakah anak tersenyum saat Anda tersenyum kepadanya?', 'no', 4),
  ('mchat-q5', 'screening-mchat-v1', 'Apakah anak menikmati permainan cilukba atau kejar-kejaran?', 'no', 5),
  ('mchat-q6', 'screening-mchat-v1', 'Apakah anak sering mengulang gerakan tertentu (mengepak, berputar)?', 'yes', 6),
  ('mchat-q7', 'screening-mchat-v1', 'Apakah anak terlihat sangat sensitif terhadap suara tertentu?', 'yes', 7),
  ('mchat-q8', 'screening-mchat-v1', 'Apakah anak meniru ekspresi atau tindakan Anda?', 'no', 8),
  ('mchat-q9', 'screening-mchat-v1', 'Apakah anak menunjukkan mainan kepada Anda untuk berbagi?', 'no', 9),
  ('mchat-q10', 'screening-mchat-v1', 'Apakah anak lebih suka bermain sendiri dibanding bersama teman?', 'yes', 10);
