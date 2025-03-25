import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { STATUS, LineCoordinates, Sensor } from './atd-dashboard.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatSelectModule } from '@angular/material/select';
import { io } from 'socket.io-client';
import * as Highcharts from 'highcharts';

const MaterialModles = [MatDividerModule, MatButtonModule, MatSlideToggleModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule]

interface SensorBatch {
  timestamp: number;
  sensors: { [key: string]: number };
}

@Component({
  selector: 'app-atd-dashboard',
  templateUrl: './atd-dashboard.component.html',
  imports: [...MaterialModles, NgClass, ReactiveFormsModule, HighchartsChartModule],
  styleUrls: ['./atd-dashboard.component.scss']
})
export class AtdDashboardComponent implements OnInit, OnDestroy {
  status: string = 'GGGGGRYRG';

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options;
  private chart: Highcharts.Chart | undefined;

  socket = io('http://localhost:3000');
  sensorSeriesMap: { [sensorId: string]: Highcharts.Series } = {};
  maxPoints = 100;

  isRotating: boolean;

  selectedRange: any;

  timeRanges = [
    { label: 'Last 30 seconds', durationMs: 30 * 1000 },
    { label: 'Last 1 minute', durationMs: 60 * 1000 },
    { label: 'Last 5 minutes', durationMs: 5 * 60 * 1000 },
    { label: 'Last 1 hour', durationMs: 60 * 60 * 1000 },
    { label: 'Last 1 day', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Last 1 year', durationMs: 365 * 24 * 60 * 60 * 1000 },
    { label: 'Last 5 years', durationMs: 5 * 365 * 24 * 60 * 60 * 1000 },
  ];


  sensors: Sensor[] = [
    { x: 130, y: 20, tooltip: 'top of head' },   // 1 (top of head)
    { x: 130, y: 70, tooltip: 'neck' },   // 2 (neck)
    { x: 50, y: 80, tooltip: 'left hand' },   // 3 (left hand)
    { x: 70, y: 100, tooltip: 'left shoulder' },  // 4 (left shoulder)
    { x: 130, y: 100, tooltip: 'chest' },  // 5 (chest)
    { x: 200, y: 80, tooltip: 'right hand' },   // 6 (right hand)
    { x: 70, y: 200, tooltip: 'left foot' },  // 7 (left foot)
    { x: 130, y: 170, tooltip: 'pelvis' },  // 8 (pelvis)
    { x: 200, y: 200, tooltip: 'right foot' }   // 9 (right foot)
  ];
  codeForm: FormGroup;

  lines: LineCoordinates[] = [
    { x1: 50, y1: 80, x2: 70, y2: 100 },
    { x1: 70, y1: 100, x2: 130, y2: 100 },
    { x1: 130, y1: 100, x2: 170, y2: 100 },
    { x1: 170, y1: 100, x2: 200, y2: 80 },
    { x1: 130, y1: 70, x2: 130, y2: 100 },
    { x1: 130, y1: 100, x2: 130, y2: 170 },
    { x1: 130, y1: 170, x2: 70, y2: 200 },
    { x1: 130, y1: 170, x2: 200, y2: 200 }
  ];

  atdString = new FormControl(this.status);

  constructor(private fb: FormBuilder) {
    this.chartOptions = {
      chart: {
        type: 'spline',
        events: {
          load: () => {
            this.chart = Highcharts.charts[0];
          },
        },
      },
      title: { text: 'Real-time Sensor Data' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'Sensor Value' } },
      series: [
        { name: 'Sensor 0', type: 'spline', data: [] },
        { name: 'Sensor 1', type: 'spline', data: [] },
        { name: 'Sensor 2', type: 'spline', data: [] },
      ],
    };
  }


  ngOnInit(): void {
    this.codeForm = this.fb.group({
      atdString: [
        this.status,
        [
          Validators.required,
          Validators.pattern(/^[GRY]{9}$/)
        ]
      ]
    });

    this.socket = io('http://localhost:3000');

    this.socket.on('sensor-data-batch', (batch: SensorBatch[]) => {
      batch.forEach((dataPoint) => {
        const time = dataPoint.timestamp;

        // For demo, we use 3 sensors
        ['sensor_0', 'sensor_1', 'sensor_2'].forEach((sensorId, i) => {
          const value = dataPoint.sensors[sensorId];
          const series = this.chart?.series[i];
          if (series) {
            series.addPoint([time, value], false, series.data.length > 100); // smooth chart
          }
        });
      });

      this.chart?.redraw();
    });

  }

  placeSensors() {
    this.status = this.codeForm.get('atdString')?.value
  }

  getColor(code: STATUS): string {
    switch (code) {
      case STATUS.OK: return '#4c7c34';
      case STATUS.BROKEN: return '#b41c24';
      case STATUS.UNSTABLE: return '#fcbc2b';
      default: return 'gray';
    }
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
