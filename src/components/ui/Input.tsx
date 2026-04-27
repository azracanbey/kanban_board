import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", error, id, label, ...rest },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[var(--app-text)]">
      <span>{label}</span>
      <input
        id={id}
        ref={ref}
        autoComplete="off"
        className={`app-field app-field-input ${error ? "border-red-500" : ""} ${className}`.trim()}
        {...rest}
      />
      {error ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </label>
  );
});
