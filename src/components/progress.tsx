export default function Progress({
  text,
  percentage,
}: {
  text: string;
  percentage: number;
}) {
  percentage = percentage ?? 0;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono text-gray-600 truncate max-w-[70%]">
          {text}
        </span>
        <span className="text-xs font-semibold text-gray-700">
          {percentage.toFixed(2)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
