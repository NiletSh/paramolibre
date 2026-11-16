import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { library40Seed } from '../../data/library40-seed';
import {
  Library40Overview,
  PhysicalCondition,
  LexicalComplexity,
  TwinSlot
} from '../../models/library40.model';
import { Library40Service } from '../../services/library40.service';

@Component({
  selector: 'app-library40-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './library40-analytics.component.html',
  styleUrl: './library40-analytics.component.scss'
})
export class Library40AnalyticsComponent implements OnInit {
  overview: Library40Overview = library40Seed();
  loading = true;
  usingFallback = true;

  constructor(private library40: Library40Service) {}

  ngOnInit(): void {
    this.library40.getOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.usingFallback = data.source !== 'database';
        this.loading = false;
      },
      error: () => {
        this.overview = library40Seed();
        this.usingFallback = true;
        this.loading = false;
      }
    });
  }

  get modules(): string[] {
    return [...new Set(this.overview.twin.map((cell) => cell.module))];
  }

  slotsFor(moduleName: string): TwinSlot[] {
    return this.overview.twin.filter((cell) => cell.module === moduleName);
  }

  conditionLabel(value: PhysicalCondition | null): string {
    const labels: Record<PhysicalCondition, string> = {
      OPTIMO: 'Óptimo',
      DESGASTE: 'Desgaste',
      REPARACION: 'Reparación'
    };
    return value ? labels[value] : 'Sin registro';
  }

  lexicalLabel(value: LexicalComplexity | null): string {
    const labels: Record<LexicalComplexity, string> = {
      BASICO: 'Básico',
      INTERMEDIO: 'Intermedio',
      AVANZADO: 'Avanzado'
    };
    return value ? labels[value] : 'Sin nivel';
  }

  formatMinutes(total: number): string {
    const minutes = Math.max(0, Math.round(total || 0));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${rest} min`;
    if (!rest) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }

  formatWhen(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  presenceLabel(cell: TwinSlot): string {
    if (cell.presence === 'empty') return 'Libre';
    if (cell.alert === 'overdue') return `Fuera hace ${cell.days_out} días`;
    if (cell.presence === 'away') return cell.days_out ? `En préstamo · ${cell.days_out} días` : 'En préstamo';
    return 'En estante';
  }

  slotTone(cell: TwinSlot): 'free' | 'available' | 'loan' | 'error' {
    if (cell.presence === 'empty') return 'free';
    if (cell.alert === 'overdue' || cell.book?.physical_condition === 'REPARACION') return 'error';
    if (cell.presence === 'away') return 'loan';
    return 'available';
  }

  toneLabel(cell: TwinSlot): string {
    const labels = { free: 'Libre', available: 'Disponible', loan: 'Ocupado', error: 'Error' };
    return labels[this.slotTone(cell)];
  }

  selected: TwinSlot | null = null;

  selectSlot(cell: TwinSlot): void {
    this.selected = this.selected?.slot === cell.slot ? null : cell;
  }

  weeklyLine(): string {
    const rows = this.overview.operations?.weekly || [];
    if (!rows.length) return '';
    const max = Math.max(...rows.map((row) => row.points), 1);
    const step = rows.length === 1 ? 0 : 260 / (rows.length - 1);
    return rows.map((row, index) => `${20 + index * step},${110 - (row.points / max) * 86}`).join(' ');
  }
}
