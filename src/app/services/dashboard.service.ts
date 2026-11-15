import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  enPrestamo: number;
  devueltos: number;
  librosPublicados: number;
}

export interface DashboardBook {
  id: number;
  title: string;
  author: string;
  status: 'available' | 'exchanged' | 'reserved';
  imageUrl?: string | null;
}

export interface DashboardActivity {
  id: number;
  message: string;
  time: string;
  icon: string;
  status: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentBooks: DashboardBook[];
  activities: DashboardActivity[];
}

export interface AdminOverview {
  exito: boolean;
  resumen: {
    usuarios: number;
    libros: number;
  };
  actividades: AdminActivityItem[];
  usuarios: AdminUserRow[];
  libros: AdminBookRow[];
}

export interface AdminActivityItem {
  tipo: 'registro' | 'sesion' | 'libro' | 'estante';
  texto: string;
  detalle: string;
  fecha: string;
  libroId?: number | null;
}

export interface AdminUserRow {
  id: number;
  nombre: string;
  email: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
  libros: number;
  lecturas: number;
  fecha_registro: string;
  ultima_conexion: string | null;
}

export interface AdminBookRow {
  id: number;
  titulo: string;
  autor: string;
  estado: string;
  fecha: string;
  dueno: string;
}

export interface AppNotification {
  id: number | string;
  tipo: string;
  titulo?: string;
  mensaje: string;
  fecha: string;
  leida?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardData> {
    return this.http.get<{ exito: boolean; data: DashboardData }>(`${this.apiUrl}/dashboard`).pipe(
      map((response) => response.data)
    );
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<{ exito: boolean; notificaciones: AppNotification[] }>(`${this.apiUrl}/notifications`).pipe(
      map((response) => response.notificaciones || [])
    );
  }

  getAdminActivity(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.apiUrl}/activity`).pipe(
      switchMap((data) => this.completarActividad(data)),
      catchError(() => this.completarActividad(null))
    );
  }

  private completarActividad(data: AdminOverview | null): Observable<AdminOverview> {
    const base = data || this.vacio();
    const faltanLibros = !base.libros?.length;
    const faltanUsuarios = !base.usuarios?.length;
    if (!faltanLibros && !faltanUsuarios && (base.resumen.usuarios || base.resumen.libros)) {
      return of(base);
    }

    return forkJoin({
      books: this.http.get<{
        data?: Array<Record<string, string | number | null>>;
        pagination?: { total?: number };
      }>(`${environment.apiUrl}/books?limit=100`).pipe(catchError(() => of(null))),
      users: this.http.get<{ usuarios?: Array<Record<string, string | number | boolean | null>> }>(this.apiUrl).pipe(
        catchError(() => of(null))
      )
    }).pipe(
      map(({ books, users }) => this.mezclarCatalogo(base, books, users))
    );
  }

  private vacio(): AdminOverview {
    return {
      exito: false,
      resumen: { usuarios: 0, libros: 0 },
      actividades: [],
      usuarios: [],
      libros: []
    };
  }

  private mezclarCatalogo(
    base: AdminOverview,
    books: { data?: Array<Record<string, string | number | null>>; pagination?: { total?: number } } | null,
    users: { usuarios?: Array<Record<string, string | number | boolean | null>> } | null
  ): AdminOverview {
    const filas = books?.data || [];
    const libros: AdminBookRow[] = base.libros?.length
      ? base.libros
      : filas.map((book) => ({
          id: Number(book['id']) || 0,
          titulo: String(book['title'] || ''),
          autor: String(book['author'] || ''),
          estado: book['status'] === 'exchanged' ? 'intercambiado' : book['status'] === 'reserved' ? 'en_intercambio' : 'disponible',
          fecha: String(book['createdAt'] || book['created_at'] || ''),
          dueno: String(book['ownerName'] || book['owner_name'] || 'Lector')
        }));

    const cuentas = users?.usuarios || [];
    const usuarios: AdminUserRow[] = base.usuarios?.length
      ? base.usuarios
      : cuentas.length
        ? cuentas.map((user) => ({
            id: Number(user['id']) || 0,
            nombre: String(user['nombre'] || ''),
            email: String(user['email'] || ''),
            rol: user['rol'] === 'admin' ? 'admin' : 'usuario',
            activo: user['activo'] === true || user['activo'] === 1,
            libros: libros.filter((book) => String(book.dueno) === String(user['nombre'] || '')).length,
            lecturas: 0,
            fecha_registro: String(user['fecha_registro'] || ''),
            ultima_conexion: user['ultima_conexion'] ? String(user['ultima_conexion']) : null
          }))
        : this.lectoresDesdeLibros(filas, libros);

    const actividades = base.actividades?.length
      ? base.actividades
      : [
          ...usuarios
            .filter((user) => user.rol !== 'admin')
            .map((user) => ({
              tipo: 'registro' as const,
              texto: `${user.nombre} creó su cuenta`,
              detalle: user.email,
              fecha: user.fecha_registro
            })),
          ...libros.map((book) => ({
            tipo: 'libro' as const,
            texto: `${book.dueno} publicó "${book.titulo}"`,
            detalle: book.autor,
            fecha: book.fecha,
            libroId: book.id
          }))
        ];

    const lectores = usuarios.filter((user) => user.rol !== 'admin' && user.activo !== false).length;

    return {
      exito: true,
      resumen: {
        usuarios: base.resumen.usuarios || lectores,
        libros: base.resumen.libros || Number(books?.pagination?.total) || libros.length
      },
      actividades,
      usuarios,
      libros
    };
  }

  private lectoresDesdeLibros(
    filas: Array<Record<string, string | number | null>>,
    libros: AdminBookRow[]
  ): AdminUserRow[] {
    const vistos = new Set<string>();
    const usuarios: AdminUserRow[] = [];
    filas.forEach((book, index) => {
      const id = String(book['ownerId'] || book['user_id'] || book['ownerName'] || index);
      if (vistos.has(id)) return;
      vistos.add(id);
      const nombre = String(book['ownerName'] || book['owner_name'] || 'Lector');
      usuarios.push({
        id: Number(book['ownerId'] || book['user_id']) || 0,
        nombre,
        email: String(book['ownerEmail'] || book['owner_email'] || ''),
        rol: 'usuario',
        activo: true,
        libros: libros.filter((item) => item.dueno === nombre).length,
        lecturas: 0,
        fecha_registro: String(book['createdAt'] || book['created_at'] || ''),
        ultima_conexion: null
      });
    });
    return usuarios;
  }

  markNotificationsRead(): Observable<void> {
    return this.http.put<{ exito: boolean }>(`${this.apiUrl}/notifications/read`, {}).pipe(
      map(() => undefined)
    );
  }
}
