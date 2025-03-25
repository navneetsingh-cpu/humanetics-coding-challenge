// Core Angular and Material imports
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

// WebSocket client and charting libraries
import { io } from 'socket.io-client';
import * as Highcharts from 'highcharts';

// RxJS for reactive streaming and cleanup
import { auditTime, Subject, takeUntil } from 'rxjs';

// Material modules grouped for easy import
const MaterialModles = [
  MatDividerModule, MatButtonModule, MatSlideToggleModule,
  MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule
];

// Data structure for receiving sensor data batches
interface SensorBatch {
  timestamp: number;
  sensors: { [key: string]: number };
}

@Component({
  selector: 'app-atd-dashboard',
  templateUrl: './atd-dashboard.component.html',
  imports: [
    ...MaterialModles, NgClass, ReactiveFormsModule,
    HighchartsChartModule, FormsModule, KeyValuePipe
  ],
  styleUrls: ['./atd-dashboard.component.scss']
})
export class AtdDashboardComponent implements OnInit, OnDestroy {
  // A 9-character status string (G/R/Y) to represent ATD sensor health
  status: string = 'GGGGGRYRG';

  // Highcharts setup
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options;
  private chart: Highcharts.Chart | undefined;

  // Socket.IO client connection to the backend server
  socket = io('http://localhost:3000');

  // Map to store chart series by sensorId
  sensorSeriesMap: { [sensorId: string]: Highcharts.Series } = {};

  maxPoints = 100; // Max points shown per series (for performance)
  isRotating: boolean; // Flag to control animation state
  selectedRange: any;  // Placeholder for selected time range object

  // Stores data history for each sensor for chart rendering
  private dataHistory: { [sensorId: string]: [number, number][] } = {};

  // All available sensors + selected ones to display
  sensorsAvailable: string[] = Array.from({ length: 3 }, (_, i) => `sensor_${i}`);
  selectedSensors: string[] = ['sensor_0', 'sensor_1', 'sensor_2'];

  // RxJS streams for data batching and cleanup
  private destroy$ = new Subject<void>();
  private dataStream$ = new Subject<SensorBatch[]>();

  // Time ranges for chart viewing (from 30s to 5y)
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

  // Coordinates and tooltip info for each sensor position on the ATD body
  sensors: Sensor[] = [
    { x: 130, y: 20, tooltip: 'top of head' },
    { x: 130, y: 70, tooltip: 'neck' },
    { x: 50, y: 80, tooltip: 'left hand' },
    { x: 70, y: 100, tooltip: 'left shoulder' },
    { x: 130, y: 100, tooltip: 'chest' },
    { x: 200, y: 80, tooltip: 'right hand' },
    { x: 70, y: 200, tooltip: 'left foot' },
    { x: 130, y: 170, tooltip: 'pelvis' },
    { x: 200, y: 200, tooltip: 'right foot' }
  ];

  // SVG line connections between sensor points (for ATD body map)
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

  atdString = new FormControl(this.status); // Form control for status string input
  selectedTimeRange = '1m'; // Default selected time range
  codeForm: FormGroup<{ atdString: FormControl<string>; }>;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    // Initialize the ATD status string form
    this.codeForm = this.fb.group({
      atdString: [
        this.status,
        [Validators.required, Validators.pattern(/^[GRY]{9}$/)] // must match 9-char G/R/Y
      ]
    });

    this.setupChart();       // Init Highcharts config
    this.initSocket();       // Connect to WebSocket server
    this.listenToDataStream(); // Begin processing incoming data

    this.convertInputToUpperCase();

  }
  convertInputToUpperCase() {
    this.atdString.valueChanges.subscribe(value => {
      if (value !== value.toUpperCase()) {
        this.atdString.setValue(value.toUpperCase(), { emitEvent: false });
      }
    });
  }

  // Highcharts initial config with 3 placeholder series
  setupChart() {
    this.chartOptions = {
      chart: {
        type: 'spline',
        events: {
          load: () => {
            this.chart = Highcharts.charts[0];
          }
        }
      },
      title: { text: 'Real-time Sensor Data' },
      xAxis: { type: 'datetime' },
      series: [
        { name: 'Sensor 0', type: 'spline', data: [] },
        { name: 'Sensor 1', type: 'spline', data: [] },
        { name: 'Sensor 2', type: 'spline', data: [] },
      ],
    };
  }

  // Stream updates via RxJS and throttle redraws with auditTime
  listenToDataStream() {
    this.dataStream$
      .pipe(auditTime(250), takeUntil(this.destroy$)) // buffer and emit every 250ms
      .subscribe((batch) => {
        const now = Date.now();
        let hasChanges = false;

        // Process each timestamped sensor batch
        batch.forEach((dataPoint) => {
          const timestamp = dataPoint.timestamp;

          this.selectedSensors.forEach(sensorId => {
            const value = dataPoint.sensors[sensorId];
            if (value === undefined) return;

            // Append new sensor value
            if (!this.dataHistory[sensorId]) this.dataHistory[sensorId] = [];
            const series = this.dataHistory[sensorId];
            const lastValue = series.at(-1)?.[1];

            if (lastValue !== value) {
              series.push([timestamp, value]);
              hasChanges = true;
            }

            // Trim old data outside selected range
            const cutoff = now - this.timeRanges[this.selectedTimeRange];
            this.dataHistory[sensorId] = series.filter(d => d[0] >= cutoff);
          });
        });

        if (hasChanges) this.refreshChart();
      });
  }

  // Connect to backend WebSocket and stream data batches
  initSocket() {
    this.socket = io('http://localhost:3000');
    this.socket.on('sensor-data-batch', (batch: SensorBatch[]) => {
      this.dataStream$.next(batch); // Push batch into observable stream
    });
  }

  // Replace chart series when sensor selection changes
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

  // Efficiently redraw only modified chart series
  refreshChart() {
    if (!this.chart) return;

    this.selectedSensors.forEach((sensorId, index) => {
      const newData = this.dataHistory[sensorId] || [];

      if (this.chart.series[index]) {
        const current = this.chart.series[index].data.map(p => [p.x, p.y]);
        if (JSON.stringify(current) !== JSON.stringify(newData)) {
          this.chart.series[index].setData(newData, false);
        }
      } else {
        this.chart.addSeries({ name: sensorId, type: 'spline', data: newData }, false);
      }
    });

    // Remove extra unused series
    while (this.chart.series.length > this.selectedSensors.length) {
      this.chart.series[this.chart.series.length - 1].remove(false);
    }

    this.chart.redraw(); // Final chart update
  }

  // Called when user changes selected sensors
  onSensorSelectionChange() {
    this.updateChartSeries();
  }

  // Called when user changes time range
  onTimeRangeChange() {
    this.refreshChart();
  }

  // Updates status string value from the form input
  placeSensors() {
    this.status = this.codeForm.get('atdString')?.value;
  }

  // Map ATD sensor health status to color
  getColor(code: STATUS): string {
    switch (code) {
      case STATUS.OK: return '#4c7c34';
      case STATUS.BROKEN: return '#b41c24';
      case STATUS.UNSTABLE: return '#fcbc2b';
      default: return 'gray';
    }
  }

  // Toggle body rotation animation (used in visual representation)
  toggleRotation() {
    this.isRotating = !this.isRotating;
  }

  // Clean up observables and socket on component destroy
  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
