import * as React from "react";
import * as XLSX from "xlsx";
import { Button } from "./button";

interface ExportColumn {
  header: string;
  accessor: string;
}

interface ExportButtonsProps {
  data: any[];
  columns: ExportColumn[];
  filename?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ data, columns, filename = "export" }) => {
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row) => {
        const obj: Record<string, any> = {};
        columns.forEach((col) => {
          obj[col.header] = row[col.accessor];
        });
        return obj;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async function exportPDF() {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    autoTable(doc, {
      head: [columns.map((col) => col.header)],
      body: data.map((row) => columns.map((col) => row[col.accessor])),
    });
    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportExcel} disabled={!data.length}>
        Export Excel
      </Button>
      <Button variant="outline" onClick={exportPDF} disabled={!data.length}>
        Export PDF
      </Button>
    </div>
  );
}; 