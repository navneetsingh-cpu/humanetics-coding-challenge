import { NgFor, NgStyle } from '@angular/common';
import { Component, computed, Input, signal, Signal } from '@angular/core';

@Component({
  selector: 'app-atd-dashboard',
  standalone: true,
  imports: [NgFor, NgStyle],
  templateUrl: './atd-dashboard.component.html',
  styleUrl: './atd-dashboard.component.scss'
})
export class AtdDashboardComponent {

  private _status = signal('GGGGGRYRG'); // Default status

  @Input() set status(value: string) {
    if (value.length === 9) {
      this._status.set(value);
    } else {
      console.error('Status must be a 9-character string.');
    }
  }

  get status(): Signal<string> {
    return this._status.asReadonly();
  }

  sensors = [
    { x: 130, y: 20 },   // 1 - Head
    { x: 130, y: 70 },   // 2 - Neck
    { x: 40, y: 100 },   // 3 - Left upper arm
    { x: 70, y: 100 },   // 4 - Left lower arm
    { x: 130, y: 100 },  // 5 - Chest
    { x: 210, y: 100 },  // 6 - Right hand
    { x: 70, y: 200 },   // 7 - Left foot
    { x: 130, y: 170 },  // 8 - Pelvis
    { x: 200, y: 200 }   // 9 - Right foot
  ];

  getColor = computed(() => {
    return (index: number): string => {
      const code = this._status()[index];
      switch (code) {
        case 'G': return 'green';
        case 'R': return 'red';
        case 'Y': return 'gold';
        default: return 'gray';
      }
    };
  });

}
