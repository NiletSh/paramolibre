import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatTurn, EvaluateResponse, ReadingSession } from '../../models/library40.model';
import { Library40Service } from '../../services/library40.service';
import { ReaderLoan, ReaderLoansService } from '../../services/reader-loans.service';

@Component({
  selector: 'app-post-reading-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-reading-ai-chat.component.html',
  styleUrl: './post-reading-ai-chat.component.scss'
})
export class PostReadingAIChatComponent implements OnInit, OnDestroy {
  pending: ReadingSession[] = [];
  dismissed = false;
  open = false;
  active: ReadingSession | null = null;
  messages: ChatTurn[] = [];
  draft = '';
  sending = false;
  error = '';
  result: EvaluateResponse | null = null;
  localBookId = '';

  private userSub?: Subscription;
  private returnSub?: Subscription;

  constructor(
    private auth: AuthService,
    private library40: Library40Service,
    private loans: ReaderLoansService
  ) {}

  ngOnInit(): void {
    this.returnSub = this.loans.returnRequests.subscribe((loan) => this.startLocal(loan));
    this.userSub = this.auth.currentUser$.subscribe((user) => {
      if (!user) {
        this.pending = [];
        this.open = false;
        return;
      }
      this.loadPending();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.returnSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && !this.sending) this.close();
  }

  get invite(): ReadingSession | null {
    return this.pending[0] ?? null;
  }

  get userTurns(): number {
    return this.messages.filter((message) => message.role === 'user').length;
  }

  get questionLabel(): string {
    return `Pregunta ${Math.min(this.userTurns + 1, 2)} de 2`;
  }

  start(session: ReadingSession): void {
    this.localBookId = '';
    this.active = session;
    this.messages = [];
    this.result = null;
    this.error = '';
    this.draft = '';
    this.open = true;
    this.ask();
  }

  startLocal(loan: ReaderLoan): void {
    this.localBookId = loan.bookId;
    this.active = {
      id: 0,
      user_id: 0,
      book_id: 0,
      checked_out_at: '',
      returned_at: null,
      reading_duration_minutes: null,
      comprehension_status: 'PENDIENTE_VALIDACION',
      comprehension_score: null,
      ai_qualitative_summary: null,
      earned_reader_points: 0,
      title: loan.title,
      author: loan.author
    };
    this.messages = [];
    this.result = null;
    this.error = '';
    this.draft = '';
    this.dismissed = true;
    this.open = true;
    this.ask();
  }

  close(): void {
    const finished = Boolean(this.result?.done);
    this.open = false;
    this.sending = false;
    this.localBookId = '';
    if (finished) this.loadPending();
  }

  later(): void {
    this.dismissed = true;
  }

  onEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey) return;
    keyboard.preventDefault();
    this.send();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending || this.result || this.userTurns >= 2) return;
    this.draft = '';
    this.messages = [...this.messages, { role: 'user', content: text }];
    this.ask();
  }

  private askLocal(): void {
    if (!this.active) return;
    const title = this.active.title || 'este libro';
    const questions = [
      `¿Qué idea o momento de "${title}" te marcó más y por qué?`,
      'Explícale el conflicto central a alguien que no lo leyó.'
    ];
    if (this.userTurns < 2) {
      this.messages = [...this.messages, { role: 'assistant', content: questions[this.userTurns] }];
      this.sending = false;
      return;
    }
    const answers = this.messages.filter((message) => message.role === 'user').map((message) => message.content).join(' ');
    const score = answers.length >= 140 ? 84 : answers.length >= 60 ? 70 : 58;
    const points = Math.round(score / 2);
    this.result = {
      done: true,
      provider: 'offline',
      reply: null,
      comprehension_score: score,
      ai_qualitative_summary: 'La devolución quedó registrada. Lo que contaste alcanza para cerrar esta lectura.',
      points_awarded: points
    };
    this.loans.remove(this.localBookId);
    this.sending = false;
  }

  private loadPending(): void {
    this.library40.getPendingSessions().subscribe({
      next: (sessions) => {
        this.pending = sessions;
        if (!sessions.length) this.dismissed = false;
      },
      error: () => {
        this.pending = [];
      }
    });
  }

  private ask(): void {
    if (!this.active) return;
    if (this.localBookId) {
      this.askLocal();
      return;
    }
    this.sending = true;
    this.error = '';
    this.library40.evaluate({
      session_id: this.active.id,
      title: this.active.title || '',
      author: this.active.author || '',
      messages: this.messages
    }).subscribe({
      next: (response) => {
        this.sending = false;
        if (response.done) {
          this.result = response;
          return;
        }
        if (response.reply) {
          this.messages = [...this.messages, { role: 'assistant', content: response.reply }];
        }
      },
      error: (error: { error?: { message?: string } }) => {
        this.sending = false;
        this.error = error?.error?.message || 'No se pudo continuar la conversación.';
      }
    });
  }
}
