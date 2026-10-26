import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header';
import { Nav } from './nav';

/** The signed-in app frame: left nav, header, and the current page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Nav],
  template: `
    <div class="flex h-screen">
      <app-nav />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-header />
        <main class="min-h-0 flex-1 overflow-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class Shell {}
