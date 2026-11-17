import { Book } from '../models/book';

export const LOAN_DAYS = 14;

/** Acervo de la escuela, con el espacio exacto del estante. Sirve mientras la base aún no tiene esos ejemplares. */
export const SCHOOL_BOOKS: Book[] = [
  book('escuela-1', 'El principito', 'Antoine de Saint-Exupéry', 'Novela', 'BASICO', 'Modulo-A-Nivel-1', '04 A1 7C 2B', 'Un piloto se encuentra con un niño de otro planeta y aprende a mirar lo esencial.'),
  book('escuela-2', 'Pedro Páramo', 'Juan Rulfo', 'Novela', 'AVANZADO', 'Modulo-A-Nivel-2', '04 B9 33 E0', 'Juan Preciado llega a Comala a buscar a su padre y el pueblo le responde con los muertos.'),
  book('escuela-3', 'Cien años de soledad', 'Gabriel García Márquez', 'Novela', 'AVANZADO', 'Modulo-A-Nivel-3', '04 5D 8E 11', 'La historia de los Buendía en Macondo, donde el tiempo se repite y los nombres también.'),
  book('escuela-4', 'Rayuela', 'Julio Cortázar', 'Novela', 'AVANZADO', 'Modulo-B-Nivel-1', '04 12 C4 90', 'Oliveira busca a la Maga entre París y Buenos Aires, y el lector elige el orden de los capítulos.'),
  book('escuela-5', 'El túnel', 'Ernesto Sabato', 'Novela', 'INTERMEDIO', 'Modulo-B-Nivel-2', '04 77 0E 4A', 'Un pintor cuenta por qué cruzó el límite con la única persona que entendió su cuadro.'),
  book('escuela-6', 'Ficciones', 'Jorge Luis Borges', 'Novela', 'AVANZADO', 'Modulo-B-Nivel-3', '04 3C 18 D2', 'Cuentos de laberintos, bibliotecas infinitas y memorias que no caben en una vida.'),
  book('escuela-7', 'Crónica de una muerte anunciada', 'Gabriel García Márquez', 'Novela', 'INTERMEDIO', 'Modulo-C-Nivel-1', '04 9F 22 6B', 'Todo el pueblo sabe que van a matar a Santiago Nasar, y aun así ocurre.'),
  book('escuela-8', 'El llano en llamas', 'Juan Rulfo', 'Novela', 'INTERMEDIO', 'Modulo-C-Nivel-2', '04 61 AA 05', 'Relatos del campo mexicano donde la violencia y la sequía se dicen en pocas palabras.'),
  book('escuela-9', 'El amor en los tiempos del cólera', 'Gabriel García Márquez', 'Novela', 'AVANZADO', 'Modulo-C-Nivel-3', '04 E4 70 19', 'Florentino espera más de cincuenta años para volver a declararse a Fermina.')
];

export function findSchoolBook(id: string | number | null | undefined): Book | undefined {
  return SCHOOL_BOOKS.find((item) => String(item.id) === String(id));
}

export function slotLabel(slot?: string | null): string {
  const match = /^Modulo-(.+)-Nivel-(\d+)$/.exec(slot || '');
  if (!match) return slot?.trim() || 'Ubicación por asignar';
  return `Módulo ${match[1]} · Nivel ${match[2]}`;
}

function book(
  id: string,
  title: string,
  author: string,
  category: string,
  lexical: Book['lexical_complexity'],
  slot: string,
  rfid: string,
  description: string
): Book {
  return {
    id,
    title,
    author,
    category,
    condition: 'good',
    description,
    location: slotLabel(slot),
    ownerName: 'Biblioteca de la escuela',
    status: 'available',
    createdAt: '2026-11-01T12:00:00.000Z',
    rfidUid: rfid,
    rfid_or_sensor_id: rfid,
    shelf_slot_location: slot,
    physical_condition: 'OPTIMO',
    lexical_complexity: lexical
  };
}
