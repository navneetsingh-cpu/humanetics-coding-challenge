// socket-events.ts (shared between frontend/backend)
export interface SensorSubscription {
    sensorIds: string[];
    startTime: number; // Unix timestamp in milliseconds
    endTime?: number;  // Optional; if not set = live
}

export interface SensorDataPoint {
    sensorId: string;
    timestamp: number;
    value: number;
}

export interface SensorDataBatch {
    data: SensorDataPoint[];
}

// Server emits these events
export const SERVER_EMIT = {
    SENSOR_DATA: 'sensor-data',
    ERROR: 'error'
};

// Client sends these events
export const CLIENT_EMIT = {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe'
};
