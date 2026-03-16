interface ErrorAlertProps {
  message: string;
  className?: string;
}

export default function ErrorAlert({ message, className = "" }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm ${className}`}
    >
      ⚠️ {message}
    </div>
  );
}
