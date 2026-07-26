// SitePilot AI — ScoreBadge Component
// Displays a lead score with color-coded badge

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const sizeConfig: Record<"sm" | "md" | "lg", string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

const colorConfig = (score: number): string => {
  if (score >= 81) return "bg-green-100 text-green-800 border-green-300";
  if (score >= 61) return "bg-blue-100 text-blue-800 border-blue-300";
  if (score >= 31) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-800 border-red-300";
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const sizing = sizeConfig[size];
  const color = colorConfig(score);

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizing} ${color}`}
      title={`Lead score: ${score}/100`}
    >
      {score}
    </span>
  );
}
