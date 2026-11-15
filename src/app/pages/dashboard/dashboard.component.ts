import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../services/perfil.service';
import { DashboardActivity, DashboardBook, DashboardService } from '../../services/dashboard.service';
import { BookService } from '../../services/book';
import { Book, SHELF_LOCATION } from '../../models/book';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  userName = 'Lector';
  loading = true;
  readonly shelfLocation = SHELF_LOCATION;

  stats = [
    { label: 'Libros publicados', value: 0, icon: 'library_books', tone: 'green', link: '/catalogo' },
    { label: 'En préstamo', value: 0, icon: 'menu_book', tone: 'gold', link: '/dashboard' },
    { label: 'Devueltos', value: 0, icon: 'inventory_2', tone: 'forest', link: '/dashboard' }
  ];

  recentBooks: Array<DashboardBook & { cover: string }> = [];
  activities: DashboardActivity[] = [];

  quickActions = [
    { label: 'Publicar libro', description: 'Agrega un titulo disponible', icon: 'add_circle', link: '/publicar-libro', tone: 'publish' },
    { label: 'Explorar catalogo', description: 'Encuentra tu siguiente lectura', icon: 'explore', link: '/catalogo', tone: 'catalog' },
    { label: 'Ver el estante', description: 'Ahí se prestan y se devuelven los libros', icon: 'inventory_2', link: '/catalogo', tone: 'proposals' },
    { label: 'Editar perfil', description: 'Actualiza tus datos', icon: 'manage_accounts', link: '/perfil', tone: 'profile' }
  ];

  constructor(
    private authService: AuthService,
    private perfilService: PerfilService,
    private dashboardService: DashboardService,
    private bookService: BookService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user?.nombre) {
      this.userName = user.nombre.split(' ')[0];
    }

    this.perfilService.getPerfil().subscribe({
      next: (profile) => {
        this.userName = profile.nombre?.split(' ')[0] || 'Lector';
        this.loadMyBooks(profile.id);
      },
      error: () => {
        if (user?.id) {
          this.loadMyBooks(user.id);
        }
      }
    });

    this.loadDashboard();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Disponible',
      exchanged: 'Prestado',
      reserved: 'Reservado'
    };
    return labels[status] || status;
  }

  private loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.stats = [
          { ...this.stats[0], value: data.stats.librosPublicados },
          { ...this.stats[1], value: data.stats.enPrestamo },
          { ...this.stats[2], value: data.stats.devueltos }
        ];
        this.activities = data.activities;
        this.loading = false;
      },
      error: () => {
        this.recentBooks = [];
        this.activities = [];
        this.loading = false;
      }
    });
  }

  private loadMyBooks(userId: number): void {
    this.bookService.getBooksByUser(userId).subscribe({
      next: (books) => {
        this.recentBooks = books.map((book, index) => ({
          ...this.toDashboardBook(book),
          cover: this.getBookCover(this.toDashboardBook(book), index)
        }));
      },
      error: () => {
        this.recentBooks = [];
      }
    });
  }

  private toDashboardBook(book: Book): DashboardBook {
    return {
      id: Number(book.id || 0),
      title: book.title,
      author: book.author,
      status: book.status || 'available',
      imageUrl: book.imageUrl
    };
  }

  private getBookCover(book: DashboardBook, index: number): string {
    if (book.imageUrl) {
      return `url("${book.imageUrl}") center / cover no-repeat`;
    }

    const covers = [
      'linear-gradient(135deg, #352C25 0%, #A65338 100%)',
      'linear-gradient(135deg, #8A3F2A 0%, #d58a14 100%)',
      'linear-gradient(135deg, #241E1A 0%, #68734A 100%)'
    ];
    return covers[index % covers.length];
  }
}
