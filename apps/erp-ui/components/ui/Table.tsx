import "./Table.css";
import { ReactNode, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`table-wrapper ${className}`} {...props}>
      <table className="table">{children}</table>
    </div>
  );
}

export function TableHeader({ children, ...props }: { children: ReactNode } & HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="table-header" {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }: { children: ReactNode } & HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="table-body" {...props}>{children}</tbody>;
}

export function TableRow({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`table-row ${className}`} {...props}>{children}</tr>;
}

export function TableHead({ children, className = "", ...props }: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`table-head ${className}`} {...props}>{children}</th>;
}

export function TableCell({ children, className = "", ...props }: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`table-cell ${className}`} {...props}>{children}</td>;
}
