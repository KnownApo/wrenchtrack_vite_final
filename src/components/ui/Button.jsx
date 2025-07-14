export default function Button({ children, variant = "primary", ...props }) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors";
  const variants = {
    primary:   "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    danger:    "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}
