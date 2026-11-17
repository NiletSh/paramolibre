import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ReaderGuard } from './guards/reader.guard';
import { BookFormComponent } from './pages/books/book-form/book-form';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminShelfComponent } from './pages/admin/admin-shelf.component';

export const routes: Routes = [
  // ============================================
  // RUTAS PÚBLICAS Y PRIVADAS CON MAIN LAYOUT
  // ============================================
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'catalogo',
        loadComponent: () => import('./pages/catalog/catalog.component').then(m => m.CatalogComponent)
      },
      {
        path: 'trueque',
        redirectTo: 'catalogo',
        pathMatch: 'full'
      },
      {
        path: 'libro/:id',
        loadComponent: () => import('./pages/book-detail/book-detail.component').then(m => m.BookDetailComponent)
      },
      {
        path: 'publicar-libro',
        component: BookFormComponent,
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'publicar',
        component: BookFormComponent,
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'libros/nuevo',
        redirectTo: 'publicar-libro',
        pathMatch: 'full'
      },
      {
        path: 'libros/:id/editar',
        component: BookFormComponent,
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'libro/:id/editar',
        component: BookFormComponent,
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'mis-libros',
        redirectTo: 'catalogo',
        pathMatch: 'full'
      },
      {
        path: 'intercambios',
        redirectTo: 'catalogo',
        pathMatch: 'full'
      },
      {
        path: 'intercambio/:bookId',
        redirectTo: 'libro/:bookId',
        pathMatch: 'full'
      },
      {
        path: 'mis-propuestas',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'propuestas',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'perfil',
        component: PerfilComponent,
        canActivate: [AuthGuard],
        title: 'Mi perfil - Páramo Libre'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'mi-espacio',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [AuthGuard, ReaderGuard]
      },
      {
        path: 'admin/estante',
        component: AdminShelfComponent,
        canActivate: [AuthGuard, AdminGuard],
        title: 'Estante en vivo - Páramo Libre'
      },
      {
        path: 'admin/biblioteca-40',
        loadComponent: () => import('./pages/admin/library40-analytics.component').then(m => m.Library40AnalyticsComponent),
        canActivate: [AuthGuard, AdminGuard],
        title: 'Biblioteca 4.0 - Páramo Libre'
      },
      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard, AdminGuard]
      }
    ]
  },

  // ============================================
  // RUTAS DE AUTENTICACIÓN CON AUTH LAYOUT
  // ============================================
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'registro',
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },

  // ============================================
  // RUTA 404 - REDIRECCIÓN AL HOME
  // ============================================
  {
    path: '**',
    redirectTo: ''
  }
];
