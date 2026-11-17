import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookService } from '../../services/book';
import { AuthService } from '../../core/services/auth.service';
import { Book, BOOK_CATEGORIES, BOOK_CONDITIONS } from '../../models/book';
import { SCHOOL_BOOKS, slotLabel } from '../../data/school-collection';

interface CatalogBook {
  id: string | number;
  title: string;
  author: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  location: string;
  owner: string;
  ownerId?: string;
  status: 'available' | 'exchanged' | 'reserved';
  imageColor: string;
  imageUrl?: string | null;
  createdAt?: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent implements OnInit {
  searchTerm = '';
  selectedCategory = 'Todos';
  selectedCondition = 'Todos';
  sortBy = 'recent';
  currentPage = 1;
  itemsPerPage = 8;
  loading = false;

  categories = ['Todos', ...BOOK_CATEGORIES];
  conditions = [{ value: 'Todos', label: 'Todos los estados' }, ...BOOK_CONDITIONS];

  conditionLabels: Record<string, string> = {
    new: 'Nuevo',
    like_new: 'Como nuevo',
    good: 'Bueno',
    fair: 'Aceptable'
  };

  conditionColors: Record<string, string> = {
    new: '#55603C',
    like_new: '#A65338',
    good: '#C4785C',
    fair: '#868e96'
  };

  statusLabels: Record<string, string> = {
    available: 'Disponible',
    exchanged: 'Prestado',
    reserved: 'Reservado'
  };

  allBooks: CatalogBook[] = [];
  isLoggedIn = false;

  constructor(
    private bookService: BookService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe((status) => {
      this.isLoggedIn = status;
    });
    this.loadBooks();
  }

  get paginatedBooks(): CatalogBook[] {
    const filtered = this.getFilteredBooksSync();
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.getFilteredBooksSync().length / this.itemsPerPage);
  }

  get totalResults(): number {
    return this.getFilteredBooksSync().length;
  }

  onSearch(): void {
    this.currentPage = 1;
  }

  applyFilters(): void {
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todos';
    this.selectedCondition = 'Todos';
    this.sortBy = 'recent';
    this.currentPage = 1;
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  private loadBooks(): void {
    this.loading = true;
    this.bookService.getBooks({ limit: 100 }).subscribe({
      next: (books) => {
        const extras = books.filter((book) => !SCHOOL_BOOKS.some((school) => school.title === book.title));
        this.allBooks = [...SCHOOL_BOOKS, ...extras].map((book, index) => this.toCatalogBook(book, index));
        this.loading = false;
      },
      error: () => {
        this.allBooks = SCHOOL_BOOKS.map((book, index) => this.toCatalogBook(book, index));
        this.loading = false;
      }
    });
  }

  private getFilteredBooksSync(): CatalogBook[] {
    let result = this.allBooks;

    if (this.selectedCategory !== 'Todos') {
      result = result.filter((book) => this.normalizeText(book.category) === this.normalizeText(this.selectedCategory));
    }

    if (this.selectedCondition !== 'Todos') {
      result = result.filter((book) => book.condition === this.selectedCondition);
    }

    if (this.searchTerm.trim()) {
      const term = this.normalizeText(this.searchTerm);
      result = result.filter((book) =>
        this.normalizeText(book.title).includes(term) ||
        this.normalizeText(book.author).includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (this.sortBy === 'title') return a.title.localeCompare(b.title, 'es');
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  private toCatalogBook(book: Book, index: number): CatalogBook {
    const colors = ['#A65338', '#7b2cbf', '#e63946', '#55603C', '#C4785C'];

    return {
      id: book.id || index + 1,
      title: book.title,
      author: book.author,
      category: book.category,
      condition: book.condition,
      location: book.shelf_slot_location ? slotLabel(book.shelf_slot_location) : (book.location || 'Ubicación por asignar'),
      owner: book.ownerName || 'Usuario',
      ownerId: book.ownerId,
      status: book.status || 'available',
      imageColor: colors[index % colors.length],
      imageUrl: book.imageUrl,
      createdAt: book.createdAt
    };
  }

  hideCover(book: CatalogBook): void {
    book.imageUrl = null;
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

}
