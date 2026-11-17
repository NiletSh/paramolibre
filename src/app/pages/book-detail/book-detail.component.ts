import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookService } from '../../services/book';
import { AuthService } from '../../core/services/auth.service';
import { Book } from '../../models/book';
import { LOAN_DAYS, findSchoolBook, slotLabel } from '../../data/school-collection';
import { ReaderLoansService } from '../../services/reader-loans.service';

interface BookDetail {
  id: string | number;
  ownerId?: string;
  title: string;
  author: string;
  description: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  location: string;
  slot: string;
  rfid: string;
  lexical: string;
  owner: string;
  ownerAvatar?: string;
  status: 'available' | 'exchanged' | 'reserved';
  publishedDate: string;
  imageColor: string;
  imageUrl: string;
}

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatSnackBarModule],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.scss'
})
export class BookDetailComponent implements OnInit, OnDestroy {
  readonly loanDays = LOAN_DAYS;

  book: BookDetail | null = null;
  loanMode: 'fisico' | 'virtual' | null = null;
  notFound = false;
  isLoggedIn = false;
  isAdmin = false;
  canEditBook = false;
  cardUid = '';
  linkedUid = '';
  cardLinked = false;
  savingCard = false;
  private loansSub?: Subscription;

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
    reserved: 'Apartado'
  };

  statusColors: Record<string, string> = {
    available: '#55603C',
    exchanged: '#868e96',
    reserved: '#C4785C'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private loans: ReaderLoansService
  ) {}

  ngOnDestroy(): void {
    this.loansSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.loansSub = this.loans.loans$.subscribe(() => {
      if (!this.book) return;
      this.loanMode = this.loans.find(this.book.id)?.mode || null;
    });
    this.authService.isAuthenticated$.subscribe((status) => {
      this.isLoggedIn = status;
      this.isAdmin = this.authService.getCurrentUser()?.rol === 'admin';
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.notFound = true;
      return;
    }

    this.bookService.getBookById(idParam).subscribe({
      next: (book) => {
        if (!book) {
          this.notFound = true;
          return;
        }

        this.book = this.toBookDetail(book);
        this.loanMode = this.loans.find(book.id ?? '')?.mode || null;
        this.canEditBook = this.canEdit(this.book);
        const savedUid = book.rfidUid || this.rememberedCard(book.id);
        if (savedUid) {
          this.linkedUid = savedUid;
          this.cardLinked = true;
          this.rememberCard(book.id, savedUid);
        }
        this.notFound = false;
      },
      error: () => {
        const school = findSchoolBook(idParam);
        if (!school) {
          this.notFound = true;
          return;
        }
        this.book = this.toBookDetail(school);
        this.loanMode = this.loans.find(school.id ?? '')?.mode || null;
        this.canEditBook = false;
        this.notFound = false;
      }
    });
  }

  hideCover(): void {
    if (this.book) {
      this.book.imageUrl = '';
    }
  }

  goBack(): void {
    this.router.navigate(['/catalogo']);
  }

  chooseLoan(mode: 'fisico' | 'virtual'): void {
    if (!this.book) return;
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `libro/${this.book.id}`, reason: 'Inicia sesión para pedir el libro.' }
      });
      return;
    }
    const until = new Date();
    until.setDate(until.getDate() + this.loanDays);
    this.loans.save({
      bookId: String(this.book.id),
      title: this.book.title,
      author: this.book.author,
      slot: this.book.slot,
      mode,
      until: until.toISOString()
    });
    this.loanMode = mode;
    const where = mode === 'fisico'
      ? `Está disponible. Puedes recogerlo hoy en ${this.book.slot}. El préstamo es de ${this.loanDays} días y puedes devolverlo antes.`
      : `La copia digital queda contigo ${this.loanDays} días. Puedes devolverla antes. El ejemplar físico sigue en ${this.book.slot}.`;
    this.snackBar.open(where, 'Cerrar', { duration: 7000, panelClass: ['snackbar-success'] });
  }

  returnLoan(): void {
    if (!this.book) return;
    const loan = this.loans.find(this.book.id);
    if (!loan) return;
    this.loans.askReturn(loan);
  }

  loanUntil(): string {
    if (!this.book) return '';
    const until = this.loans.find(this.book.id)?.until;
    if (!until) return '';
    const date = new Date(until);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  }

  private toBookDetail(book: Book): BookDetail {
    return {
      id: book.id || '',
      ownerId: book.ownerId,
      title: book.title,
      author: book.author,
      description: book.description,
      category: book.category,
      condition: book.condition,
      location: book.shelf_slot_location ? slotLabel(book.shelf_slot_location) : (book.location || 'Ubicación por asignar'),
      slot: book.shelf_slot_location ? slotLabel(book.shelf_slot_location) : (book.location || 'Ubicación por asignar'),
      rfid: book.rfidUid || book.rfid_or_sensor_id || 'Sin etiqueta todavía',
      lexical: book.lexical_complexity === 'BASICO' ? 'Básico' : book.lexical_complexity === 'AVANZADO' ? 'Avanzado' : book.lexical_complexity === 'INTERMEDIO' ? 'Intermedio' : 'Sin nivel',
      owner: book.ownerName || 'Usuario',
      status: book.status || 'available',
      publishedDate: this.formatDate(book.createdAt),
      imageColor: '#A65338',
      imageUrl: book.imageUrl || 'assets/images/hero-books.svg'
    };
  }

  saveCard(): void {
    if (!this.book || this.savingCard) return;
    const uid = this.cardUid.trim();
    if (uid.length < 4) {
      this.snackBar.open('Escribe el UID de la tarjeta, por ejemplo 2A34651A.', 'Cerrar', {
        duration: 5000,
        panelClass: ['snackbar-warning']
      });
      return;
    }
    this.savingCard = true;
    this.bookService.linkShelfCard(this.book.id, uid).subscribe({
      next: (linked) => {
        this.savingCard = false;
        this.linkedUid = linked?.uid || uid;
        this.cardUid = '';
        this.cardLinked = true;
        if (this.book) this.rememberCard(this.book.id, this.linkedUid);
        this.snackBar.open('Tarjeta vinculada. El estante ya puede reconocer este libro.', 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-success']
        });
      },
      error: (error) => {
        this.savingCard = false;
        const message = error?.error?.message || 'No se pudo vincular la tarjeta.';
        this.snackBar.open(message, 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  private cardKey(id: string | number | undefined): string {
    return `pl_rfid_${id}`;
  }

  private rememberCard(id: string | number | undefined, uid: string): void {
    const clean = (uid || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (id == null || id === '' || !clean) return;
    localStorage.setItem(this.cardKey(id), clean);
  }

  private rememberedCard(id: string | number | undefined): string {
    if (id == null || id === '') return '';
    return localStorage.getItem(this.cardKey(id)) || '';
  }

  formatUid(uid: string): string {
    const clean = (uid || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    return clean.replace(/(.{2})/g, '$1 ').trim();
  }

  private formatDate(value?: string): string {
    if (!value) return 'Fecha no disponible';

    return new Date(value).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  private canEdit(book: BookDetail): boolean {
    const user = this.authService.getCurrentUser();
    return !!user && (this.sameUser(book.ownerId, user.id) || user.rol === 'admin');
  }

  private sameUser(ownerId: string | undefined, userId: number): boolean {
    return ownerId != null && ownerId !== '' && Number(ownerId) === Number(userId);
  }
}
