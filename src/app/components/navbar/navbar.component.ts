import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { AppNotification, DashboardService } from '../../services/dashboard.service';
import { ShelfLiveService } from '../../services/shelf-live.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" [class.home-bar]="isHomePage" [class.has-user]="isLoggedIn">
      <div class="navbar-inner">
        <a class="navbar-brand" routerLink="/" (click)="closeMenu()">
          <img class="brand-logo" src="assets/images/logo_paramo.png" alt="Páramo Libre" />
        </a>

        <div class="nav-links" *ngIf="isLoggedIn || !isHomePage">
          <ng-container *ngIf="isLoggedIn && isAdmin">
            <a class="nav-link" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Actividad</a>
            <a class="nav-link" routerLink="/admin/estante" routerLinkActive="active">Estante</a>
            <a class="nav-link" routerLink="/admin/biblioteca-40" routerLinkActive="active">Biblioteca 4.0</a>
            <a class="nav-link" routerLink="/perfil" routerLinkActive="active">Perfil</a>
          </ng-container>
          <ng-container *ngIf="isLoggedIn && !isAdmin">
            <a class="nav-link" routerLink="/catalogo" routerLinkActive="active">Cat&aacute;logo</a>
            <a class="nav-link" routerLink="/trueque" routerLinkActive="active">Trueque</a>
            <a class="nav-link" routerLink="/publicar-libro" routerLinkActive="active">Publicar libro</a>
            <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Mi espacio</a>
            <a class="nav-link" routerLink="/perfil" routerLinkActive="active">Perfil</a>
          </ng-container>
          <ng-container *ngIf="!isLoggedIn">
            <a class="nav-link" routerLink="/catalogo" routerLinkActive="active">Cat&aacute;logo</a>
            <a class="nav-link" routerLink="/trueque" routerLinkActive="active">Trueque</a>
            <a class="nav-link" routerLink="/auth/login" routerLinkActive="active">Iniciar sesi&oacute;n</a>
            <a class="nav-link nav-link-register" routerLink="/auth/registro" routerLinkActive="active">Registrarse</a>
          </ng-container>
        </div>

        <div class="nav-alerts" *ngIf="isLoggedIn" (click)="$event.stopPropagation()">
          <button type="button" class="alert-button" (click)="toggleAlerts()" aria-label="Notificaciones">
            <span class="material-icons">notifications</span>
            <span class="alert-count" *ngIf="unreadCount">{{ unreadCount }}</span>
          </button>
          <div class="alert-panel" *ngIf="alertsOpen" role="dialog" aria-label="Tus avisos">
            <div class="alert-panel-head">
              <div class="alert-panel-title">
                <span class="material-icons" aria-hidden="true">notifications_active</span>
                <div>
                  <strong>Tus avisos</strong>
                  <span class="alert-panel-sub" *ngIf="unreadCount">{{ unreadCount }} sin leer</span>
                  <span class="alert-panel-sub" *ngIf="!unreadCount">Al día</span>
                </div>
              </div>
            </div>
            <div class="alert-panel-body">
              <div class="alert-empty-state" *ngIf="!notifications.length">
                <span class="material-icons" aria-hidden="true">inbox</span>
                <p>Sin avisos por ahora</p>
                <small>Te avisamos cuando un libro entre o salga del estante.</small>
              </div>
              <ul class="alert-list" *ngIf="notifications.length">
                <li *ngFor="let item of notifications">
                  <article
                    class="alert-card"
                    [class.alert-card--unread]="item.leida === false"
                    [ngClass]="'alert-card--' + alertTone(item)">
                    <div class="alert-icon" aria-hidden="true">
                      <span class="material-icons">{{ alertIcon(item) }}</span>
                    </div>
                    <div class="alert-copy">
                      <div class="alert-meta">
                        <b>{{ item.titulo || 'Aviso' }}</b>
                        <time>{{ formatAlertWhen(item.fecha) }}</time>
                      </div>
                      <p>{{ item.mensaje }}</p>
                    </div>
                  </article>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <a class="nav-avatar" *ngIf="isLoggedIn" routerLink="/perfil" (click)="closeMenu()" [attr.aria-label]="'Perfil de ' + userName">
          <img *ngIf="photoUrl && !photoFailed" [src]="photoUrl" alt="" (error)="photoFailed = true">
          <span *ngIf="!photoUrl || photoFailed">{{ initials }}</span>
        </a>

        <button class="menu-toggle" *ngIf="isLoggedIn || !isHomePage" type="button" (click)="toggleMenu()" [class.active]="menuOpen" aria-label="Men&uacute;">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div class="mobile-menu" [class.open]="menuOpen" *ngIf="isLoggedIn || !isHomePage">
        <ng-container *ngIf="isLoggedIn && isAdmin">
          <a class="mobile-link" routerLink="/admin" (click)="closeMenu()" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Actividad</a>
          <a class="mobile-link" routerLink="/admin/estante" (click)="closeMenu()" routerLinkActive="active">Estante</a>
          <a class="mobile-link" routerLink="/admin/biblioteca-40" (click)="closeMenu()" routerLinkActive="active">Biblioteca 4.0</a>
          <a class="mobile-link" routerLink="/perfil" (click)="closeMenu()" routerLinkActive="active">Perfil</a>
        </ng-container>
        <ng-container *ngIf="isLoggedIn && !isAdmin">
          <a class="mobile-link" routerLink="/catalogo" (click)="closeMenu()" routerLinkActive="active">Cat&aacute;logo</a>
          <a class="mobile-link" routerLink="/trueque" (click)="closeMenu()" routerLinkActive="active">Trueque</a>
          <a class="mobile-link" routerLink="/publicar-libro" (click)="closeMenu()" routerLinkActive="active">Publicar libro</a>
          <a class="mobile-link" routerLink="/dashboard" (click)="closeMenu()" routerLinkActive="active">Mi espacio</a>
          <a class="mobile-link" routerLink="/perfil" (click)="closeMenu()" routerLinkActive="active">Perfil</a>
        </ng-container>
        <ng-container *ngIf="!isLoggedIn">
          <a class="mobile-link" routerLink="/catalogo" (click)="closeMenu()" routerLinkActive="active">Cat&aacute;logo</a>
          <a class="mobile-link" routerLink="/trueque" (click)="closeMenu()" routerLinkActive="active">Trueque</a>
          <a class="mobile-link" routerLink="/auth/login" (click)="closeMenu()" routerLinkActive="active">Iniciar sesi&oacute;n</a>
          <a class="mobile-link mobile-register" routerLink="/auth/registro" (click)="closeMenu()" routerLinkActive="active">Registrarse</a>
        </ng-container>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(247, 246, 241, 0.94);
      backdrop-filter: blur(10px);
    }

    .navbar-inner {
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 0 20px 0 12px;
    }

    .navbar.has-user .navbar-inner {
      padding-right: 118px;
    }

    .nav-alerts {
      position: absolute;
      top: 16px;
      right: 58px;
      z-index: 2;
    }

    .alert-button {
      position: relative;
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 50%;
      background: linear-gradient(145deg, #ffffff, #F3EBDD);
      color: #352C25;
      cursor: pointer;
      box-shadow: 0 0 0 1px rgba(138, 63, 42, 0.22), 0 8px 18px rgba(53, 44, 37, 0.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .alert-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 0 1px rgba(138, 63, 42, 0.32), 0 12px 22px rgba(53, 44, 37, 0.12);
    }

    .alert-button .material-icons {
      font-size: 22px;
    }

    .alert-count {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 999px;
      background: #c64b3d;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      line-height: 18px;
    }

    .alert-panel {
      position: absolute;
      top: 48px;
      right: 0;
      width: min(380px, calc(100vw - 24px));
      max-height: min(420px, calc(100dvh - 96px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 18px;
      background: linear-gradient(180deg, #ffffff 0%, #F5EFE4 100%);
      border: 1px solid rgba(123, 189, 47, 0.24);
      box-shadow: 0 22px 48px rgba(53, 44, 37, 0.18);
    }

    .alert-panel-head {
      flex-shrink: 0;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(123, 189, 47, 0.14);
      background:
        linear-gradient(90deg, rgba(123, 189, 47, 0.12), transparent 55%),
        #ffffff;
    }

    .alert-panel-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert-panel-title .material-icons {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      color: #8A3F2A;
      background: rgba(123, 189, 47, 0.14);
      font-size: 20px;
    }

    .alert-panel-title strong {
      display: block;
      color: #352C25;
      font-size: 15px;
      line-height: 1.2;
    }

    .alert-panel-sub {
      display: block;
      margin-top: 2px;
      color: #5E6844;
      font-size: 12px;
      font-weight: 650;
    }

    .alert-panel-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(138, 63, 42, 0.45) transparent;
    }

    .alert-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 28px 16px;
      text-align: center;
    }

    .alert-empty-state .material-icons {
      font-size: 36px;
      color: #A65338;
      opacity: 0.85;
    }

    .alert-empty-state p {
      margin: 0;
      color: #352C25;
      font-size: 14px;
      font-weight: 800;
    }

    .alert-empty-state small {
      margin: 0;
      max-width: 260px;
      color: #5E6844;
      font-size: 12px;
      line-height: 1.45;
    }

    .alert-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alert-card {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 10px;
      padding: 10px 11px;
      border-radius: 14px;
      border: 1px solid rgba(123, 189, 47, 0.14);
      background: rgba(255, 255, 255, 0.92);
    }

    .alert-card--unread {
      border-color: rgba(123, 189, 47, 0.34);
      box-shadow: inset 3px 0 0 #A65338;
      background: #F3EBDD;
    }

    .alert-icon {
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: rgba(123, 189, 47, 0.14);
      color: #8A3F2A;
    }

    .alert-icon .material-icons {
      font-size: 20px;
    }

    .alert-card--trade .alert-icon {
      background: rgba(213, 138, 20, 0.16);
      color: #b86e0a;
    }

    .alert-card--shelf .alert-icon {
      background: rgba(61, 107, 79, 0.14);
      color: #352C25;
    }

    .alert-card--success .alert-icon {
      background: rgba(79, 125, 42, 0.16);
      color: #55603C;
    }

    .alert-card--alert .alert-icon {
      background: rgba(198, 75, 61, 0.12);
      color: #c64b3d;
    }

    .alert-meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .alert-meta b {
      color: #352C25;
      font-size: 13px;
      line-height: 1.25;
    }

    .alert-meta time {
      flex-shrink: 0;
      color: #68734A;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .alert-copy p {
      margin: 4px 0 0;
      color: #5E6844;
      font-size: 12.5px;
      line-height: 1.45;
    }

    .navbar-brand {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #352C25;
      font-weight: 700;
      text-decoration: none;
    }

    .brand-logo {
      height: 64px;
      width: auto;
      display: block;
      object-fit: contain;
    }

    .home-bar {
      background: transparent;
    }

    .home-bar .nav-link {
      color: #352C25;
    }

    .home-bar .nav-link:hover,
    .home-bar .nav-link.active {
      color: #6e4524;
      background: transparent;
    }

    .nav-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1;
    }

    .nav-link {
      padding: 8px 12px;
      border-radius: 999px;
      color: #5E6844;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
      white-space: nowrap;
    }

    .nav-link:hover,
    .nav-link.active {
      color: #8A3F2A;
      background: rgba(128, 199, 64, 0.12);
    }

    .nav-link-register,
    .mobile-register {
      color: #ffffff !important;
      background: linear-gradient(135deg, #A65338 0%, #8A3F2A 100%) !important;
      box-shadow: 0 8px 20px rgba(138, 63, 42, 0.16);
    }

    .nav-avatar {
      position: absolute;
      top: 15px;
      right: 8px;
      width: 42px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 2px rgba(138, 63, 42, 0.45);
      background: linear-gradient(135deg, #A65338 0%, #8A3F2A 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      text-decoration: none;
    }

    .nav-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .menu-toggle {
      display: none;
      flex-direction: column;
      gap: 5px;
      padding: 8px;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .menu-toggle span {
      width: 22px;
      height: 2px;
      display: block;
      border-radius: 2px;
      background: #352C25;
    }

    .mobile-menu {
      display: none;
      flex-direction: column;
      gap: 6px;
      padding: 14px 24px 24px;
      border-top: 1px solid rgba(123, 189, 47, 0.16);
      background: #ffffff;
    }

    .mobile-menu.open {
      display: flex;
    }

    .mobile-link {
      padding: 11px 12px;
      border-radius: 8px;
      color: #5E6844;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
    }

    .mobile-link.active,
    .mobile-link:hover {
      color: #8A3F2A;
      background: rgba(128, 199, 64, 0.12);
    }

    @media (max-width: 1080px) {
      .nav-links {
        display: none;
      }

      .navbar.has-user .navbar-inner {
        padding-right: 156px;
      }

      .menu-toggle {
        display: flex;
      }

      .navbar.has-user .menu-toggle {
        position: absolute;
        top: 16px;
        right: 108px;
      }
    }

    @media (max-width: 720px) {
      .brand-logo {
        height: 46px;
        max-width: 42vw;
      }

      .navbar-inner {
        gap: 8px;
      }
    }

    @media (max-width: 460px) {
      .navbar-inner {
        padding: 0 12px;
      }
    }
  `]
})
export class NavbarComponent implements OnDestroy {
  menuOpen = false;
  isLoggedIn = false;
  isAdmin = false;
  isHomePage = true;
  userName = 'Perfil';
  photoUrl = '';
  initials = 'P';
  photoFailed = false;
  alertsOpen = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  private profileLoaded = false;
  private alertTimer?: ReturnType<typeof setInterval>;
  private alertSub?: Subscription;
  private loadStamp = 0;
  private readStamp = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private shelfLive: ShelfLiveService
  ) {
    this.authService.currentUser$.subscribe((user) => this.applyUser(user));

    this.authService.isAuthenticated$.subscribe((status) => {
      this.isLoggedIn = status;
      this.menuOpen = false;
      if (!status) {
        this.profileLoaded = false;
        this.stopAlerts();
        return;
      }
      this.startAlerts();
      if (this.profileLoaded) return;
      this.profileLoaded = true;
      this.authService.loadProfile().subscribe({
        error: () => {
          this.profileLoaded = false;
        }
      });
    });

    this.isHomePage = this.router.url === '/';
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isHomePage = event.urlAfterRedirects === '/';
        this.menuOpen = false;
      });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  ngOnDestroy(): void {
    this.stopAlerts();
  }

  @HostListener('document:click')
  closeAlerts(): void {
    this.alertsOpen = false;
  }

  toggleAlerts(): void {
    this.alertsOpen = !this.alertsOpen;
    if (!this.alertsOpen || !this.unreadCount) return;
    this.readStamp = Date.now();
    this.unreadCount = 0;
    this.notifications = this.notifications.map((item) => ({ ...item, leida: true }));
    this.dashboardService.markNotificationsRead().subscribe({
      error: () => this.loadAlerts()
    });
  }

  private startAlerts(): void {
    this.loadAlerts();
    if (this.alertTimer) return;
    this.alertTimer = setInterval(() => this.loadAlerts(), 8000);
    this.alertSub = this.shelfLive.events$.subscribe(() => this.loadAlerts());
  }

  private stopAlerts(): void {
    if (this.alertTimer) clearInterval(this.alertTimer);
    this.alertTimer = undefined;
    this.alertSub?.unsubscribe();
    this.alertSub = undefined;
    this.alertsOpen = false;
    this.notifications = [];
    this.unreadCount = 0;
  }

  private loadAlerts(): void {
    const stamp = ++this.loadStamp;
    const readStamp = this.readStamp;
    this.dashboardService.getNotifications().subscribe({
      next: (items) => {
        if (stamp !== this.loadStamp || readStamp !== this.readStamp) return;
        this.notifications = items;
        this.unreadCount = items.filter((item) => item.leida === false).length;
      }
    });
  }

  alertIcon(item: AppNotification): string {
    const tipo = (item.tipo || '').toLowerCase();
    if (tipo.includes('estante') || tipo.includes('libro_retirado') || tipo.includes('deposito')) {
      return 'inventory_2';
    }
    if (tipo.includes('complet')) {
      return 'check_circle';
    }
    if (tipo.includes('rechaz') || tipo.includes('cancel')) {
      return 'highlight_off';
    }
    return 'campaign';
  }

  alertTone(item: AppNotification): string {
    const tipo = (item.tipo || '').toLowerCase();
    if (tipo.includes('estante') || tipo.includes('libro_retirado') || tipo.includes('deposito')) {
      return 'shelf';
    }
    if (tipo.includes('complet')) {
      return 'success';
    }
    if (tipo.includes('rechaz') || tipo.includes('cancel') || tipo.includes('wrong')) {
      return 'alert';
    }
    return 'info';
  }

  formatAlertWhen(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  private applyUser(user: AuthUser | null): void {
    this.photoFailed = false;
    if (!user) {
      this.isAdmin = false;
      this.userName = 'Perfil';
      this.photoUrl = '';
      this.initials = 'P';
      return;
    }

    this.isAdmin = user.rol === 'admin';

    this.userName = user.nombre?.trim() || 'Perfil';
    this.photoUrl = user.foto_perfil || '';
    const parts = this.userName.split(/\s+/).filter(Boolean);
    this.initials = parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'P';
  }
}
