import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EvaluateRequest,
  EvaluateResponse,
  Library40Overview,
  ReaderCapital,
  ReadingSession
} from '../models/library40.model';

@Injectable({
  providedIn: 'root'
})
export class Library40Service {
  constructor(private http: HttpClient) {}

  getOverview(): Observable<Library40Overview> {
    return this.http.get<Library40Overview>(`${environment.apiUrl}/library40/overview`);
  }

  getCapital(): Observable<ReaderCapital> {
    return this.http.get<ReaderCapital>(`${environment.apiUrl}/library40/capital`);
  }

  getPendingSessions(): Observable<ReadingSession[]> {
    return this.http
      .get<{ sessions: ReadingSession[] }>(`${environment.apiUrl}/library40/sessions/pending`)
      .pipe(map((response) => response.sessions ?? []));
  }

  /** El servidor usa LLM_API_KEY / LLM_PROVIDER. Ver server/.env.example. */
  evaluate(body: EvaluateRequest): Observable<EvaluateResponse> {
    return this.http.post<EvaluateResponse>(`${environment.apiUrl}/comprehension/evaluate`, body);
  }
}
