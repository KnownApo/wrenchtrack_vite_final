export default function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-800 shadow-card p-6 ${className}`}>
      {children}
    </div>
  );
}
