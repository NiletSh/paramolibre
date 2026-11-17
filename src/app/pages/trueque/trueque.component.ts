import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-trueque',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="module">
      <p class="eyebrow">Módulo</p>
      <h1>Trueque de libros</h1>
      <p>
        Este módulo es para cuando dos lectores quieren cambiar un ejemplar entre ellos.
        No es la función principal: la biblioteca de la escuela vive en el catálogo,
        con la ubicación del estante y el préstamo físico o virtual.
      </p>
      <p>
        El trueque no mueve el gemelo digital del acervo. El libro de la escuela sigue
        en su módulo y su nivel hasta que alguien lo pide en préstamo.
      </p>
      <a routerLink="/catalogo">Ir a la biblioteca</a>
    </section>
  `,
  styles: [`
    .module { max-width: 720px; margin: 0 auto; padding: 48px 20px 72px; color: #352C25; }
    .eyebrow { margin: 0 0 8px; color: #8A3F2A; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 12px; font-family: Fraunces, Georgia, serif; font-size: clamp(32px, 5vw, 48px); }
    p { margin: 0 0 14px; line-height: 1.6; }
    a { display: inline-block; margin-top: 8px; padding: 12px 18px; border-radius: 999px; background: #A65338; color: #fff; font-weight: 700; text-decoration: none; }
  `]
})
export class TruequeComponent {}
