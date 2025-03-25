import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { KeyValuePipe, NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { STATUS, LineCoordinates, Sensor } from './atd-dashboard.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [...MaterialModles, NgClass, ReactiveFormsModule, HighchartsChartModule, FormsModule, KeyValuePipe],
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

  private dataHistory: { [sensorId: string]: [number, number][] } = {}; // key: sensor, value: array of [time, value]
  sensorsAvailable: string[] = Array.from({ length: 100 }, (_, i) => `sensor_${i}`);
  selectedSensors: string[] = ['sensor_0', 'sensor_1', 'sensor_2'];
  timeRanges: { [key: string]: number } = {
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1mo': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '5y': 5 * 365 * 24 * 60 * 60 * 1000,
  };


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
  selectedTimeRange = '1m'; // default to 1 minute

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

    this.initSocket();
    this.updateChartSeries();

  }

  initSocket() {
    this.socket = io('http://localhost:3000');

    this.socket.on('sensor-data-batch', (batch: SensorBatch[]) => {
      const now = Date.now();

      batch.forEach((dataPoint) => {
        const timestamp = dataPoint.timestamp;

        this.selectedSensors.forEach((sensorId) => {
          const value = dataPoint.sensors[sensorId];
          if (value === undefined) return;

          if (!this.dataHistory[sensorId]) this.dataHistory[sensorId] = [];
          this.dataHistory[sensorId].push([timestamp, value]);

          // Clean up old data beyond selected time range
          const cutoff = now - this.timeRanges[this.selectedTimeRange];
          this.dataHistory[sensorId] = this.dataHistory[sensorId].filter(d => d[0] >= cutoff);
        });
      });

      this.refreshChart();
    });
  }

  updateChartSeries() {
    if (!this.chart) return;

    this.chart.update({
      series: this.selectedSensors.map(sensorId => ({
        name: sensorId,
        type: 'spline',
        data: this.dataHistory[sensorId] || [],
      }))
    }, true, true);
  }

  refreshChart() {
    if (!this.chart) return;

    this.selectedSensors.forEach((sensorId, index) => {
      const data = this.dataHistory[sensorId] || [];
      if (this.chart?.series[index]) {
        this.chart.series[index].setData(data, false);
      } else {
        this.chart?.addSeries({ name: sensorId, type: 'spline', data }, false);
      }
    });

    // Remove unused series if sensors were deselected
    while (this.chart.series.length > this.selectedSensors.length) {
      this.chart.series[this.chart.series.length - 1].remove(false);
    }

    this.chart.redraw();
  }

  onSensorSelectionChange() {
    this.updateChartSeries();
  }

  onTimeRangeChange() {
    // trigger cleanup + update chart
    this.refreshChart();
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
    if (this.socket) this.socket.disconnect();
  }
}
