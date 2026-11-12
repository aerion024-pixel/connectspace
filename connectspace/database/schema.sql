-- ConnectSpace: skema database (MySQL 5.7+/8.x atau MariaDB 10.3+)
-- Cara pakai: phpMyAdmin > Import > pilih file ini, atau: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS connectspace
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE connectspace;

-- users: satu baris per akun
CREATE TABLE IF NOT EXISTS users (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  password   VARCHAR(255) NOT NULL,                       -- hash bcrypt, bukan teks asli
  avatar     VARCHAR(255) NULL,                           -- path /uploads/... atau URL gambar
  bio        TEXT         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)                       -- email unik sekaligus ter-index
) ENGINE=InnoDB;

-- posts: status di feed (users 1:N posts)
CREATE TABLE IF NOT EXISTS posts (
  id         INT          NOT NULL AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  content    TEXT         NULL,                           -- boleh kosong jika ada gambar
  image      VARCHAR(255) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_created (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- likes: tabel junction users M:N posts. Pasangan (user_id, post_id) unik: 1 user = maksimal 1 like per post
CREATE TABLE IF NOT EXISTS likes (
  id         INT       NOT NULL AUTO_INCREMENT,
  user_id    INT       NOT NULL,
  post_id    INT       NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_likes_user_post (user_id, post_id),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- comments: tanggapan atas post (posts 1:N comments, users 1:N comments)
CREATE TABLE IF NOT EXISTS comments (
  id         INT          NOT NULL AUTO_INCREMENT,
  post_id    INT          NOT NULL,
  user_id    INT          NOT NULL,
  comment    TEXT         NULL,                           -- boleh kosong jika ada gambar
  image      VARCHAR(255) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post (post_id, created_at),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
