import { Component, Input, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-atd-dashboard',
  templateUrl: './atd-dashboard.component.html',
  imports: [MatDividerModule, MatButtonModule, MatSlideToggleModule, NgClass],
  styleUrls: ['./atd-dashboard.component.scss']
})
export class AtdDashboardComponent implements OnInit {

  @Input() status: string = 'GGGGGRYRG'; // Default or bind from parent
  isRotating: boolean;

  sensors = [
    { x: 130, y: 20 },   // 1 (top of head)
    { x: 130, y: 70 },   // 2 (neck)
    { x: 50, y: 80 },   // 3 (left hand)
    { x: 70, y: 100 },  // 4 (left shoulder)
    { x: 130, y: 100 },  // 5 (chest)
    { x: 200, y: 80 },   // 6 (right hand)
    { x: 70, y: 200 },  // 7 (left foot)
    { x: 130, y: 170 },  // 8 (pelvis)
    { x: 200, y: 200 }   // 9 (right foot)
  ];

  lines = [
    { x1: 50, y1: 80, x2: 70, y2: 100 },  // 3 → 4
    { x1: 70, y1: 100, x2: 130, y2: 100 },  // 4 → 5
    { x1: 130, y1: 100, x2: 170, y2: 100 },   // 5 → 5.5 (angled!)
    { x1: 170, y1: 100, x2: 200, y2: 80 },   // 5.5 → 6 (angled!)
    { x1: 130, y1: 70, x2: 130, y2: 100 },  // 2 → 5 (neck to chest)
    { x1: 130, y1: 100, x2: 130, y2: 170 },  // 5 → 8
    { x1: 130, y1: 170, x2: 70, y2: 200 },  // 8 → 7
    { x1: 130, y1: 170, x2: 200, y2: 200 }   // 8 → 9
  ];

  constructor() { }

  ngOnInit(): void { }

  getColor(code: string): string {
    switch (code) {
      case 'G': return '#4c7c34';
      case 'R': return '#b41c24';
      case 'Y': return '#fcbc2b';
      default: return 'gray';
    }
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
  }
}
