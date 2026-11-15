-- ============================================================
-- PÁRAMO LIBRE
-- 1) En el SQL Editor, con la base "test" seleccionada, ejecuta solo:
--    CREATE DATABASE paramo_libre;
-- 2) Recarga la lista de Schemas, haz clic en paramo_libre.
-- 3) Pega y ejecuta este archivo completo.
-- En Render, DB_NAME debe ser paramo_libre.
-- ============================================================

-- ============================================================
-- 2. TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    foto_perfil VARCHAR(255) DEFAULT NULL,
    biografia TEXT DEFAULT NULL,
    ubicacion VARCHAR(150) DEFAULT NULL,
    telefono VARCHAR(20) DEFAULT NULL,
    rol ENUM('usuario', 'admin') DEFAULT 'usuario' NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    email_verificado BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_conexion TIMESTAMP NULL DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expira TIMESTAMP NULL DEFAULT NULL,
    
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo),
    INDEX idx_fecha_registro (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fotos_perfil (
    usuario_id INT UNSIGNED PRIMARY KEY,
    mime VARCHAR(40) NOT NULL,
    datos MEDIUMBLOB NOT NULL,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_foto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. TABLA: categorias
-- ============================================================
CREATE TABLE categorias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT DEFAULT NULL,
    icono VARCHAR(50) DEFAULT 'book',
    color VARCHAR(7) DEFAULT '#0d6efd',
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activo (activo),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABLA: libros
-- ============================================================
CREATE TABLE libros (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    categoria_id INT UNSIGNED DEFAULT NULL,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    isbn VARCHAR(20) DEFAULT NULL,
    descripcion TEXT NOT NULL,
    estado_libro ENUM('nuevo', 'como_nuevo', 'buen_estado', 'usado', 'muy_usado') NOT NULL DEFAULT 'buen_estado',
    estado_publicacion ENUM('disponible', 'en_intercambio', 'intercambiado', 'pausado') DEFAULT 'disponible' NOT NULL,
    ubicacion VARCHAR(150) DEFAULT NULL,
    imagen_portada VARCHAR(255) DEFAULT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    
    CONSTRAINT fk_libros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_libros_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_estado_publicacion (estado_publicacion),
    INDEX idx_activo (activo),
    FULLTEXT INDEX idx_busqueda (titulo, autor, descripcion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarjetas_rfid (
    uid VARCHAR(32) PRIMARY KEY,
    libro_id INT UNSIGNED NOT NULL,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rfid_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fotos_libros (
    libro_id INT UNSIGNED PRIMARY KEY,
    mime VARCHAR(40) NOT NULL,
    datos MEDIUMBLOB NOT NULL,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_foto_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TABLA: imagenes_libros
-- ============================================================
CREATE TABLE imagenes_libros (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    libro_id INT UNSIGNED NOT NULL,
    url_imagen VARCHAR(255) NOT NULL,
    orden INT UNSIGNED DEFAULT 0,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_imagenes_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_libro_id (libro_id),
    INDEX idx_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. TABLA: favoritos
-- ============================================================
CREATE TABLE favoritos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    libro_id INT UNSIGNED NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_fav_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fav_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    UNIQUE KEY uk_favorito (usuario_id, libro_id),
    INDEX idx_libro_id (libro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. TABLA: configuraciones_usuario
-- ============================================================
CREATE TABLE configuraciones_usuario (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL UNIQUE,
    notificaciones_email BOOLEAN DEFAULT TRUE,
    tema ENUM('claro', 'oscuro', 'sistema') DEFAULT 'claro',
    privacidad_perfil ENUM('publico', 'solo_usuarios', 'privado') DEFAULT 'publico',
    idioma VARCHAR(10) DEFAULT 'es',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_conf_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. TABLA: notificaciones (estante)
-- ============================================================
CREATE TABLE notificaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    intercambio_id INT UNSIGNED NULL,
    libro_id INT UNSIGNED NULL,
    leida BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_usuario (usuario_id),
    INDEX idx_notif_fecha (fecha_creacion),
    CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. DATOS DE PRUEBA: Categorías
-- ============================================================
INSERT INTO categorias (nombre, descripcion, icono, color) VALUES
('Novela', 'Ficción narrativa extensa con trama compleja', 'menu_book', '#0B4F6C'),
('Ciencia Ficción', 'Futurismo, tecnología y mundos imaginarios', 'rocket', '#5B2E91'),
('Fantasía', 'Magia, criaturas y mundos épicos', 'auto_fix_high', '#7B1FA2'),
('Historia', 'Eventos reales del pasado humano', 'account_balance', '#E65100'),
('Ciencia', 'Divulgación científica y académica', 'biotech', '#1B5E20'),
('Filosofía', 'Pensamiento crítico y ética', 'psychology', '#263238'),
('Arte', 'Pintura, escultura, música y cultura visual', 'palette', '#C62828'),
('Tecnología', 'Informática, programación e innovación', 'computer', '#00695C'),
('Poesía', 'Expresión literaria en verso', 'format_quote', '#AD1457'),
('Biografía', 'Vidas de personajes históricos', 'person', '#4527A0');

-- ============================================================
-- 12. DATOS DE PRUEBA: Usuarios (password: 'Password123' hasheado con BCrypt)
-- Nota: Los hashes son ejemplos. En producción se generan con bcryptjs.
-- Hash de ejemplo para Password123: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ============================================================
INSERT INTO usuarios (nombre, email, password_hash, foto_perfil, biografia, ubicacion, telefono, rol, activo, email_verificado) VALUES
('Carlos Mendoza', 'carlos@example.com', '$2b$10$mZkao69Q4TmCZAvHtSOkR.7MBTLK3un4sMhHKf.za.LerVGRze44e', NULL, 'Amante de la literatura clasica y moderna. Siempre buscando nuevas historias.', 'Biblioteca', '4421234567', 'admin', TRUE, TRUE),
('Ana Maria Rios', 'ana@example.com', '$2b$10$mZkao69Q4TmCZAvHtSOkR.7MBTLK3un4sMhHKf.za.LerVGRze44e', NULL, 'Estudiante de filosofia. Intercambio libros de pensamiento critico.', 'Entrada principal', '4429876543', 'usuario', TRUE, TRUE),
('Luis Fernando Vega', 'luis@example.com', '$2b$10$mZkao69Q4TmCZAvHtSOkR.7MBTLK3un4sMhHKf.za.LerVGRze44e', NULL, 'Ingeniero y aficionado a la ciencia ficcion. Colecciono ediciones especiales.', 'Laboratorio de computo', '4275558899', 'usuario', TRUE, TRUE),
('Sofia Herrera', 'sofia@example.com', '$2b$10$mZkao69Q4TmCZAvHtSOkR.7MBTLK3un4sMhHKf.za.LerVGRze44e', NULL, 'Artista visual. Busco libros de arte y diseno para inspirarme.', 'Patio central', '4424447766', 'usuario', TRUE, TRUE),
('Javier Torres', 'javier@example.com', '$2b$10$mZkao69Q4TmCZAvHtSOkR.7MBTLK3un4sMhHKf.za.LerVGRze44e', NULL, 'Historiador aficionado. Especializado en historia contemporanea.', 'Cafeteria', '4142223344', 'usuario', TRUE, TRUE);

INSERT INTO configuraciones_usuario (usuario_id) VALUES
(1), (2), (3), (4), (5);

-- Libros y favoritos quedan vacíos. Se publican desde la página.

-- ============================================================
-- 13. VISTAS ÚTILES PARA ESTADÍSTICAS (Panel Admin)
-- ============================================================

-- Vista: Resumen de actividad
CREATE VIEW vw_resumen_plataforma AS
SELECT 
    (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE) AS total_usuarios,
    (SELECT COUNT(*) FROM libros WHERE activo = TRUE AND estado_publicacion = 'disponible') AS libros_disponibles;

-- Vista: Libros por categoría
CREATE VIEW vw_libros_por_categoria AS
SELECT 
    c.nombre AS categoria,
    c.color,
    COUNT(l.id) AS total_libros
FROM categorias c
LEFT JOIN libros l ON c.id = l.categoria_id AND l.activo = TRUE
WHERE c.activo = TRUE
GROUP BY c.id, c.nombre, c.color
ORDER BY total_libros DESC;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
