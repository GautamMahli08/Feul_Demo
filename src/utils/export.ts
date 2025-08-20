import { FuelLossHistory } from '@/types/truck';

export const exportToCSV = (data: FuelLossHistory[], filename: string) => {
  const headers = ['Timestamp', 'Truck ID', 'Assigned Liters', 'Delivered Liters', 'Loss Liters', 'Loss Percent'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.timestamp.toISOString(),
      row.truckId,
      row.assignedLiters,
      row.deliveredLiters.toFixed(1),
      row.lossLiters.toFixed(1),
      row.lossPercent.toFixed(2)
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const printFuelLossReport = (data: FuelLossHistory[]) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Fuel Loss Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fuel Loss Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck ID</th>
                <th>Assigned (L)</th>
                <th>Delivered (L)</th>
                <th>Loss (L)</th>
                <th>Loss %</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.timestamp.toLocaleDateString()}</td>
                  <td>${row.truckId}</td>
                  <td>${row.assignedLiters}</td>
                  <td>${row.deliveredLiters.toFixed(1)}</td>
                  <td>${row.lossLiters.toFixed(1)}</td>
                  <td>${row.lossPercent.toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};