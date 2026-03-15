type CardProps = React.ComponentProps<"div"> & {
  title?: string;
};

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className ?? ""}`} {...props}>
      <div className="p-4">
        {title && <h3 className="mb-2 text-lg font-semibold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
