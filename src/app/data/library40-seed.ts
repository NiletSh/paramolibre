import { Library40Overview, TwinBook, TwinSlot } from '../models/library40.model';

const OVERDUE_DAYS = 14;

function present(
  title: string,
  author: string,
  category: string,
  physical: TwinBook['physical_condition'],
  lexical: TwinBook['lexical_complexity']
): TwinBook & { presence: 'present'; days_out: number } {
  return { id: null, title, author, category, physical_condition: physical, lexical_complexity: lexical, presence: 'present', days_out: 0 };
}

function away(
  title: string,
  author: string,
  category: string,
  physical: TwinBook['physical_condition'],
  lexical: TwinBook['lexical_complexity'],
  days: number
): TwinBook & { presence: 'away'; days_out: number } {
  return { id: null, title, author, category, physical_condition: physical, lexical_complexity: lexical, presence: 'away', days_out: days };
}

function slot(code: string, book: (TwinBook & { presence: 'present' | 'away'; days_out: number }) | null): TwinSlot {
  const match = /^Modulo-(.+)-Nivel-(\d+)$/.exec(code);
  const days = book?.days_out ?? 0;
  return {
    slot: code,
    module: match?.[1] ?? 'A',
    level: match ? Number(match[2]) : 1,
    presence: book?.presence ?? 'empty',
    alert: book?.presence === 'away' && days >= OVERDUE_DAYS ? 'overdue' : null,
    days_out: days,
    book: book
      ? {
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category,
          physical_condition: book.physical_condition,
          lexical_complexity: book.lexical_complexity
        }
      : null
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Misma escena que server/data/library40-seed.js, para pintar el tablero si el API no responde. */
export function library40Seed(): Library40Overview {
  return {
    source: 'seed',
    overdue_days: OVERDUE_DAYS,
    kpis: {
      finished_count: 18,
      abandoned_count: 6,
      in_progress_count: 4,
      finished_rate: 75,
      abandoned_rate: 25,
      avg_reading_minutes: 412,
      comprehension_by_category: [
        { category: 'Novela', average_score: 78, sessions: 11 },
        { category: 'Ciencia Ficción', average_score: 71, sessions: 4 },
        { category: 'Filosofía', average_score: 84, sessions: 3 },
        { category: 'Poesía', average_score: 66, sessions: 2 },
        { category: 'Historia', average_score: 74, sessions: 4 }
      ]
    },
    qualitative: [
      {
        category: 'Novela',
        score: 86,
        points: 43,
        when: daysAgo(1),
        summary: 'Relacionó el pueblo y la repetición de los nombres con la idea de un tiempo que no avanza en línea recta. No recitó la trama: explicó qué le hacía ruido.'
      },
      {
        category: 'Filosofía',
        score: 81,
        points: 40,
        when: daysAgo(2),
        summary: 'Distinguió la duda del personaje de su propia lectura y pudo decir qué pregunta se lleva fuera del libro.'
      },
      {
        category: 'Ciencia Ficción',
        score: 69,
        points: 34,
        when: daysAgo(3),
        summary: 'Identificó el conflicto central y una consecuencia, aunque todavía cuenta la historia más de lo que la interpreta.'
      },
      {
        category: 'Poesía',
        score: 74,
        points: 37,
        when: daysAgo(4),
        summary: 'Eligió una imagen y explicó por qué le cambió el ánimo. La lectura es sensorial y honesta, sin vocabulario prestado.'
      },
      {
        category: 'Historia',
        score: 77,
        points: 38,
        when: daysAgo(6),
        summary: 'Conectó una decisión del relato con algo que ya había visto en otra lectura. La síntesis es breve y propia.'
      }
    ],
    operations: {
      sla: {
        status: 'OPERATIVO',
        availability_target: 99.5,
        availability_observed: 99.8,
        open_seconds_target: 1.5,
        open_tickets: 2,
        proactive_alerts: 2
      },
      tickets: [
        { id: 'INC-014', title: 'Rayuela lleva más de 14 días fuera del estante', severity: 'alta', state: 'abierto' },
        { id: 'INC-011', title: 'El túnel está marcado en reparación', severity: 'media', state: 'en_curso' }
      ],
      weekly: [
        { week: 'S1', points: 420 },
        { week: 'S2', points: 510 },
        { week: 'S3', points: 480 },
        { week: 'S4', points: 640 },
        { week: 'S5', points: 590 },
        { week: 'S6', points: 720 }
      ],
      rfid_tags: 7,
      readers_active: 4
    },
    twin: [
      slot('Modulo-A-Nivel-1', present('Cien años de soledad', 'Gabriel García Márquez', 'Novela', 'OPTIMO', 'AVANZADO')),
      slot('Modulo-A-Nivel-2', present('El principito', 'Antoine de Saint-Exupéry', 'Novela', 'OPTIMO', 'BASICO')),
      slot('Modulo-A-Nivel-3', null),
      slot('Modulo-B-Nivel-1', away('Rayuela', 'Julio Cortázar', 'Novela', 'DESGASTE', 'AVANZADO', 18)),
      slot('Modulo-B-Nivel-2', present('El túnel', 'Ernesto Sabato', 'Novela', 'REPARACION', 'INTERMEDIO')),
      slot('Modulo-B-Nivel-3', present('Ficciones', 'Jorge Luis Borges', 'Novela', 'OPTIMO', 'AVANZADO')),
      slot('Modulo-C-Nivel-1', away('Crónica de una muerte anunciada', 'Gabriel García Márquez', 'Novela', 'OPTIMO', 'INTERMEDIO', 3)),
      slot('Modulo-C-Nivel-2', present('El amor en los tiempos del cólera', 'Gabriel García Márquez', 'Novela', 'DESGASTE', 'AVANZADO')),
      slot('Modulo-C-Nivel-3', null)
    ]
  };
}
