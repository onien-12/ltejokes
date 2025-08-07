export default function StartMenuItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-row gap-2 text-white items-center font-code text-sm cursor-pointer">
      <div className="flex items-center">{icon}</div>
      <div>{label}</div>
    </div>
  );
}
