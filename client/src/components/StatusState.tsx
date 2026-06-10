import type { ComponentType, ReactNode } from "react";

interface StatusStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const StatusState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: StatusStateProps) => {
  return (
    <div
      className={`rounded-2xl border border-app-border bg-white px-6 py-10 text-center ${className}`}
    >
      <Icon className="mx-auto mb-4 size-12 text-app-border" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-app-green">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-app-text-light">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default StatusState;
