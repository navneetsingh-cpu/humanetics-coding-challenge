import { Component } from '@angular/core';
import { AtdDashboardComponent } from './atd-dashboard/atd-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [AtdDashboardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'humanetics-coding-challange';
}
