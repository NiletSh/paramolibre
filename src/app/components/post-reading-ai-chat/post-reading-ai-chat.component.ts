import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatTurn, EvaluateResponse, ReadingSession } from '../../models/library40.model';
import { Library40Service } from '../../services/library40.service';

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

  private userSub?: Subscription;

  constructor(
    private auth: AuthService,
    private library40: Library40Service
  ) {}

  ngOnInit(): void {
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
    return `Pregunta ${Math.min(this.userTurns + 1, 3)} de 3`;
  }

  start(session: ReadingSession): void {
    this.active = session;
    this.messages = [];
    this.result = null;
    this.error = '';
    this.draft = '';
    this.open = true;
    this.ask();
  }

  close(): void {
    const finished = Boolean(this.result?.done);
    this.open = false;
    this.sending = false;
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
    if (!text || this.sending || this.result || this.userTurns >= 3) return;
    this.draft = '';
    this.messages = [...this.messages, { role: 'user', content: text }];
    this.ask();
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
