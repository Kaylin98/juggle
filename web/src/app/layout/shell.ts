import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from '../shared/toasts';
import { Header } from './header';
import { Nav } from './nav';

/** The signed-in app frame: left nav, header, the current page and toasts. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Nav, Toasts],
  template: `
    <div class="flex h-screen">
      <app-nav />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-header />
        <!-- Pages scroll sideways inside their own areas (schedule grid, board columns), never the page. -->
        <main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toasts />
  `,
})
export class Shell {}
