import { useEffect, useRef, useState } from "react";
import { Chart, CategoryScale, LinearScale, BarController, BarElement, Legend, Tooltip, ChartData, ChartOptions } from 'chart.js';
import { TrafficData } from "@/types/gtfs";

// Register required Chart.js components
Chart.register(CategoryScale, LinearScale, BarController, BarElement, Legend, Tooltip);

interface TrafficChartProps {
  stationId: string;
}

const TrafficChart = ({ stationId }: TrafficChartProps) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [dataType, setDataType] = useState<'trips' | 'passengers' | 'performance'>('trips');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  
  // Generate sample data - this would be replaced with real data in production
  const generateSampleData = (): TrafficData[] => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map(day => {
      const trips = Math.floor(Math.random() * 20) + 30;
      const onTime = Math.floor(trips * (0.75 + Math.random() * 0.2));
      
      return {
        day,
        trips,
        onTime,
        delayed: trips - onTime
      };
    });
  };
  
  const [chartData, setChartData] = useState<TrafficData[]>(generateSampleData());
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Set up chart data based on the selected data type
    let data: ChartData;
    
    if (dataType === 'trips') {
      data = {
        labels: chartData.map(d => d.day),
        datasets: [
          {
            label: 'On Time',
            data: chartData.map(d => d.onTime),
            backgroundColor: '#4CAF50',
          },
          {
            label: 'Delayed',
            data: chartData.map(d => d.delayed),
            backgroundColor: '#FF9800',
          }
        ]
      };
    } else if (dataType === 'passengers') {
      // This would show passenger volume in a real implementation
      data = {
        labels: chartData.map(d => d.day),
        datasets: [
          {
            label: 'Passengers',
            data: chartData.map(d => Math.floor(d.trips * (15 + Math.random() * 10))),
            backgroundColor: '#005FB5',
          }
        ]
      };
    } else {
      // On-time performance percentage
      data = {
        labels: chartData.map(d => d.day),
        datasets: [
          {
            label: 'On-Time %',
            data: chartData.map(d => Math.round((d.onTime / d.trips) * 100)),
            backgroundColor: '#005FB5',
          }
        ]
      };
    }
    
    // Chart options
    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      }
    };
    
    // Create the chart
    try {
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data,
        options
      });
    } catch (error) {
      console.error("Error creating chart:", error);
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartData, dataType]);
  
  // Update data when station or time range changes
  useEffect(() => {
    setChartData(generateSampleData());
  }, [stationId, timeRange]);
  
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <select 
            className="text-sm border border-neutral-300 rounded p-1"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as 'trips' | 'passengers' | 'performance')}
          >
            <option value="trips">Trips Count</option>
            <option value="passengers">Passenger Volume</option>
            <option value="performance">On-Time Performance</option>
          </select>
        </div>
        <div className="flex space-x-2 text-sm">
          <button 
            className={`px-2 py-1 rounded ${timeRange === 'week' ? 'bg-secondary text-white' : 'bg-neutral-100'}`}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button 
            className={`px-2 py-1 rounded ${timeRange === 'month' ? 'bg-secondary text-white' : 'bg-neutral-100'}`}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button 
            className={`px-2 py-1 rounded ${timeRange === 'year' ? 'bg-secondary text-white' : 'bg-neutral-100'}`}
            onClick={() => setTimeRange('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-center mt-2 text-xs">
        {chartData.map(data => (
          <div key={data.day}>{data.day}</div>
        ))}
      </div>
    </div>
  );
};

export default TrafficChart;
