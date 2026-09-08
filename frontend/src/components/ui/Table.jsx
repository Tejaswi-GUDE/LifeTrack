import { cn } from '../../lib/cn';

/**
 * Table — Design System §12.
 * No vertical grid lines; a single hairline rule between rows; header row one
 * shade off the body; numeric columns right-aligned with tabular figures;
 * row hover shifts background only. Status/confidence in a cell must be a
 * Badge, never plain coloured text.
 *
 * Compound API:
 *   <Table wrap>
 *     <Table.Head><Table.Row><Table.HeadCell>…</Table.HeadCell></Table.Row></Table.Head>
 *     <Table.Body>
 *       <Table.Row selected onClick={…}>
 *         <Table.Cell>…</Table.Cell>
 *         <Table.Cell numeric>12</Table.Cell>
 *       </Table.Row>
 *     </Table.Body>
 *   </Table>
 */
export default function Table({ wrap = false, className, children, ...rest }) {
  const table = (
    <table className={cn('tbl', className)} {...rest}>
      {children}
    </table>
  );
  if (!wrap) return table;
  return (
    <div className="table-wrap">
      <div className="table-scroll">{table}</div>
    </div>
  );
}

Table.Head = function Head({ children, ...rest }) {
  return <thead {...rest}>{children}</thead>;
};

Table.Body = function Body({ children, ...rest }) {
  return <tbody {...rest}>{children}</tbody>;
};

Table.Row = function Row({ selected = false, onClick, className, children, ...rest }) {
  return (
    <tr
      className={cn(selected && 'selected', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </tr>
  );
};

Table.HeadCell = function HeadCell({ numeric = false, className, children, ...rest }) {
  return (
    <th className={cn(numeric && 'num', className)} {...rest}>
      {children}
    </th>
  );
};

Table.Cell = function Cell({ numeric = false, className, children, ...rest }) {
  return (
    <td className={cn(numeric && 'num', className)} {...rest}>
      {children}
    </td>
  );
};
