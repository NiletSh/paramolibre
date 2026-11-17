import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
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
  private readonly loansSubject = new BehaviorSubject<ReaderLoan[]>(this.read());
  readonly loans$ = this.loansSubject.asObservable();
  readonly returnRequests = new Subject<ReaderLoan>();

  list(): ReaderLoan[] {
    return this.loansSubject.value;
  }

  find(bookId: string | number): ReaderLoan | undefined {
    return this.list().find((loan) => loan.bookId === String(bookId));
  }

  save(loan: ReaderLoan): void {
    const next = this.list().filter((item) => item.bookId !== loan.bookId);
    next.unshift(loan);
    this.write(next);
  }

  remove(bookId: string): void {
    this.write(this.list().filter((loan) => loan.bookId !== bookId));
    localStorage.removeItem(`pl_loan_${bookId}`);
  }

  askReturn(loan: ReaderLoan): void {
    this.returnRequests.next(loan);
  }

  private read(): ReaderLoan[] {
    const stored = this.parse(localStorage.getItem('pl_loans'));
    const known = new Set(stored.map((loan) => loan.bookId));
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('pl_loan_')) continue;
      const bookId = key.slice('pl_loan_'.length);
      if (known.has(bookId)) continue;
      const old = this.parseOne(localStorage.getItem(key));
      const school = findSchoolBook(bookId);
      stored.push({
        bookId,
        title: old.title || school?.title || 'Libro en préstamo',
        author: old.author || school?.author || '',
        slot: old.slot || school?.location || '',
        mode: old.mode === 'virtual' ? 'virtual' : 'fisico',
        until: old.until || ''
      });
    }
    return stored;
  }

  private write(loans: ReaderLoan[]): void {
    localStorage.setItem('pl_loans', JSON.stringify(loans));
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
