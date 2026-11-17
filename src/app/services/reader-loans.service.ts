import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { findSchoolBook } from '../data/school-collection';

export interface ReaderLoan {
  bookId: string;
  title: string;
  author: string;
  slot: string;
  mode: 'fisico' | 'virtual';
  until: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReaderLoansService {
  private readonly loansSubject = new BehaviorSubject<ReaderLoan[]>([]);
  readonly loans$ = this.loansSubject.asObservable();
  readonly returnRequests = new Subject<ReaderLoan>();

  constructor(private auth: AuthService) {
    this.auth.currentUser$.subscribe(() => this.reload());
  }

  list(): ReaderLoan[] {
    return this.loansSubject.value;
  }

  find(bookId: string | number): ReaderLoan | undefined {
    return this.list().find((loan) => loan.bookId === String(bookId));
  }

  save(loan: ReaderLoan): void {
    const key = this.storageKey();
    if (!key) return;
    const next = this.list().filter((item) => item.bookId !== loan.bookId);
    next.unshift(loan);
    this.write(key, next);
  }

  remove(bookId: string): void {
    const key = this.storageKey();
    if (!key) return;
    this.write(key, this.list().filter((loan) => loan.bookId !== bookId));
    localStorage.removeItem(`pl_loan_${bookId}`);
  }

  askReturn(loan: ReaderLoan): void {
    this.returnRequests.next(loan);
  }

  private reload(): void {
    this.loansSubject.next(this.read());
  }

  private storageKey(): string | null {
    const id = this.auth.getCurrentUser()?.id;
    return id ? `pl_loans_${id}` : null;
  }

  private read(): ReaderLoan[] {
    const key = this.storageKey();
    if (!key) return [];
    this.claimLegacy(key);
    return this.parse(localStorage.getItem(key));
  }

  private claimLegacy(key: string): void {
    const already = localStorage.getItem(key);
    const stored = this.parse(already);
    const known = new Set(stored.map((loan) => loan.bookId));
    const legacy = this.parse(localStorage.getItem('pl_loans'));
    let changed = false;

    for (const loan of legacy) {
      if (known.has(loan.bookId)) continue;
      stored.push(loan);
      known.add(loan.bookId);
      changed = true;
    }

    const stale: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const itemKey = localStorage.key(index);
      if (!itemKey || !itemKey.startsWith('pl_loan_') || itemKey.startsWith('pl_loans')) continue;
      stale.push(itemKey);
      const bookId = itemKey.slice('pl_loan_'.length);
      if (known.has(bookId)) continue;
      const old = this.parseOne(localStorage.getItem(itemKey));
      const school = findSchoolBook(bookId);
      stored.push({
        bookId,
        title: old.title || school?.title || 'Libro en préstamo',
        author: old.author || school?.author || '',
        slot: old.slot || school?.location || '',
        mode: old.mode === 'virtual' ? 'virtual' : 'fisico',
        until: old.until || ''
      });
      known.add(bookId);
      changed = true;
    }

    if (changed) localStorage.setItem(key, JSON.stringify(stored));
    localStorage.removeItem('pl_loans');
    stale.forEach((itemKey) => localStorage.removeItem(itemKey));
  }

  private write(key: string, loans: ReaderLoan[]): void {
    localStorage.setItem(key, JSON.stringify(loans));
    this.loansSubject.next(loans);
  }

  private parse(raw: string | null): ReaderLoan[] {
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value.filter((item) => item && item.bookId) : [];
    } catch {
      return [];
    }
  }

  private parseOne(raw: string | null): Partial<ReaderLoan> {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}
